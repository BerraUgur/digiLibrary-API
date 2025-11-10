const mongoose = require('mongoose');
const { logEvents, logErrorDetails } = require('../middleware/logEvents');
const Book = require("../models/Book.js");
const Loan = require('../models/Loan');
const Favorite = require('../models/Favorite');
const { GridFSBucket, ObjectId } = require('mongodb');
const {
  POPULAR_CACHE_TTL_MS,
  DEFAULT_POPULAR_LIMIT,
  MAX_POPULAR_LIMIT,
  DEFAULT_POPULAR_DAYS,
  MIN_POPULAR_DAYS,
  MAX_POPULAR_DAYS,
  MS_PER_DAY
} = require('../constants/bookConstants');

const normalizeCategory = (cat) => {
  if (!cat) return cat;
  return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
};

const sanitizeField = (value) => {
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return '';
    }
    return trimmed;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

// Upload book cover images to MongoDB GridFS for efficient storage and streaming
// GridFS is used for files larger than 16MB and provides chunked file storage
async function uploadImageBufferToGridFS(file, req) {
  if (!file || !file.buffer) throw new Error('No file buffer provided');
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected');
  }
  const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
  return new Promise((resolve, reject) => {
    try {
      const uploadStream = bucket.openUploadStream(file.originalname || 'file', {
        contentType: file.mimetype || 'application/octet-stream'
      });
      uploadStream.on('error', (err) => reject(err));
      uploadStream.on('finish', () => {
        const imageId = uploadStream.id; // id is available on the stream
        resolve({
          imageId,
          imageUrl: `${req.protocol}://${req.get('host')}/api/books/image/${imageId}`,
        });
      });
      uploadStream.end(file.buffer);
    } catch (e) {
      reject(e);
    }
  });
}

const getAllBooks = async (req, res) => {
  try {
    const { category, sortBy, order, stats } = req.query;

    const baseMatch = {};
    if (category) {
      // Case-insensitive category matching for better filter compatibility
      baseMatch.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    const sortDirection = order === 'desc' ? -1 : 1;

    if (!stats) {
      let query = Book.find(baseMatch);
      
      if (sortBy) {
        query = query.sort({ [sortBy]: sortDirection }).collation({ locale: 'en', strength: 2 });
      }
      
      const plain = await query;
      return res.status(200).json(plain);
    }
    // MongoDB aggregation pipeline to enrich books with review statistics
    const pipeline = [
      { $match: baseMatch }, // Filter by category if provided
      { $lookup: { from: 'reviews', localField: '_id', foreignField: 'book', as: 'reviews' } }, // Join reviews
      { $addFields: {
          reviewCount: { $size: '$reviews' }, // Count total reviews
          avgRating: {
            $cond: [
              { $gt: [ { $size: '$reviews' }, 0 ] },
              { $round: [ { $avg: '$reviews.rating' }, 2 ] }, // Calculate average rating
              null
            ]
          }
        } },
      { $project: { reviews: 0 } }, // Remove reviews array to reduce payload size
    ];
    
    if (sortBy) {
      pipeline.push({ $sort: { [sortBy]: sortDirection } });
    }
    
    const aggregated = await Book.aggregate(pipeline).collation({ locale: 'en', strength: 2 });

    // Mark user's favorite books using Map for O(1) lookup performance
    let favMap = new Map();
    if (req.user && req.user.id) {
      const favs = await Favorite.find({ userId: req.user.id }).select('_id bookId').lean();
      favs.forEach(f => favMap.set(String(f.bookId), f._id));
    }

    const withFavs = aggregated.map(b => ({
      ...b,
      isFavorite: favMap.has(String(b._id)),
      favoriteId: favMap.get(String(b._id)) || null,
    }));

    return res.status(200).json(withFavs);
  } catch (error) {
    await logEvents(
      `Get All Books Failed\tError: ${error.message}\tCategory: ${req.query?.category || 'All'}\tSortBy: ${req.query?.sortBy || 'None'}\tStats: ${req.query?.stats || 'false'}\tUser: ${req.user?.id || 'Guest'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Get All Books Failed', error, req, {
      category: req.query?.category,
      sortBy: req.query?.sortBy,
      stats: req.query?.stats,
      userId: req.user?.id,
    });
    return res.status(500).json({ message: 'An error occurred while retrieving books.' });
  }
};

const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    res.status(200).json(book);
  } catch (error) {
    await logEvents(
      `Get Book By ID Failed\tError: ${error.message}\tBookID: ${req.params?.id || 'N/A'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Get Book By ID Failed', error, req, {
      bookId: req.params?.id,
    });
    res.status(500).json({ message: 'An error occurred while retrieving the book.' });
  }
};

const createBook = async (req, res) => {
  try {
    const title_tr = sanitizeField(req.body?.title_tr);
    const title_en = sanitizeField(req.body?.title_en);
    const description_tr = sanitizeField(req.body?.description_tr);
    const description_en = sanitizeField(req.body?.description_en);
    
    // Handle multiple authors
    let authors = req.body?.author;
    if (Array.isArray(authors)) {
      authors = authors.map(a => sanitizeField(a)).filter(a => a);
    } else {
      const singleAuthor = sanitizeField(authors);
      authors = singleAuthor ? [singleAuthor] : [];
    }
    
    // Handle multiple categories
    let categories = req.body?.category;
    if (Array.isArray(categories)) {
      categories = categories.map(c => sanitizeField(c)).filter(c => c).map(c => normalizeCategory(c));
    } else {
      const singleCategory = sanitizeField(categories);
      categories = singleCategory ? [normalizeCategory(singleCategory)] : [];
    }
    
    const providedImageUrl = sanitizeField(req.body?.imageUrl);
    
    if (!title_tr || !title_en || !description_tr || !description_en || authors.length === 0 || categories.length === 0) {
      return res.status(400).json({ message: 'Please fill in all required fields: title_tr, title_en, description_tr, description_en, author, category.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can add books.' });
    }

    let imageUrl;
    let imageId;
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadImageBufferToGridFS(req.file, req);
        imageId = uploaded.imageId;
        imageUrl = uploaded.imageUrl;
      } catch (uplErr) {
        return res.status(500).json({ message: 'Image upload failed.', error: uplErr.message });
      }
    } else if (providedImageUrl) {
      imageUrl = providedImageUrl;
    } else {
      return res.status(400).json({ message: 'Book image is required. Please upload an image or provide an image URL.' });
    }

    const newBook = new Book({
      title_tr,
      title_en,
      description_tr,
      description_en,
      author: authors,
      category: categories,
      imageUrl,
      imageId: imageId || undefined
    });

    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    await logEvents(
      `Create Book Failed\tError: ${error.message}\tTitle: ${req.body?.title_tr || 'N/A'}\tAuthor: ${req.body?.author || 'N/A'}\tUser: ${req.user?.id || 'N/A'}\tHasImage: ${req.file ? 'Yes' : 'No'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Create Book Failed', error, req, {
      title_tr: req.body?.title_tr,
      author: req.body?.author,
      userId: req.user?.id,
      hasImage: req.file ? 'Yes' : 'No',
    });
    res.status(400).json({ message: 'An error occurred while adding the book.' });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    const updates = { ...req.body };
    
    // Handle multiple authors
    if (Object.prototype.hasOwnProperty.call(updates, 'author')) {
      if (Array.isArray(updates.author)) {
        updates.author = updates.author.map(a => sanitizeField(a)).filter(a => a);
      } else {
        const singleAuthor = sanitizeField(updates.author);
        updates.author = singleAuthor ? [singleAuthor] : [];
      }
    }
    
    // Handle multiple categories
    if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      if (Array.isArray(updates.category)) {
        updates.category = updates.category.map(c => sanitizeField(c)).filter(c => c).map(c => normalizeCategory(c));
      } else {
        const singleCategory = sanitizeField(updates.category);
        updates.category = singleCategory ? [normalizeCategory(singleCategory)] : [];
      }
    }
    
    // Sanitize other fields
    const fieldsToSanitize = ['title_tr', 'title_en', 'description_tr', 'description_en', 'imageUrl'];
    fieldsToSanitize.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(updates, f)) {
        updates[f] = sanitizeField(updates[f]);
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, 'available')) {
      const availableString = String(updates.available).trim().toLowerCase();
      updates.available = ['true', '1', 'yes', 'on'].includes(availableString);
    }

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update books.' });
    }

    if (req.file && req.file.buffer) {
      try {
        if (book.imageId) {
          const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
          await bucket.delete(new ObjectId(book.imageId)).catch(() => {});
        }
        const uploaded = await uploadImageBufferToGridFS(req.file, req);
        book.imageId = uploaded.imageId;
        book.imageUrl = uploaded.imageUrl;
      } catch (imgErr) {
        return res.status(500).json({ message: 'Image upload failed.', error: imgErr?.message });
      }
    } else if (Object.prototype.hasOwnProperty.call(updates, 'imageUrl')) {
      book.imageUrl = updates.imageUrl || '';
    }

    if (updates.title_tr) book.title_tr = updates.title_tr;
    if (updates.title_en) book.title_en = updates.title_en;
    if (updates.description_tr) book.description_tr = updates.description_tr;
    if (updates.description_en) book.description_en = updates.description_en;
    if (updates.author && updates.author.length > 0) book.author = updates.author;
    if (updates.category && updates.category.length > 0) book.category = updates.category;
    if (typeof updates.available !== 'undefined') book.available = updates.available;

    await book.save();
    res.status(200).json(book);
  } catch (error) {
    await logEvents(
      `Update Book Failed\tError: ${error.message}\tBookID: ${req.params?.id || 'N/A'}\tUser: ${req.user?.id || 'N/A'}\tHasNewImage: ${req.file ? 'Yes' : 'No'}\tErrorType: ${error.name}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Update Book Failed', error, req, {
      bookId: req.params?.id,
      userId: req.user?.id,
      hasNewImage: req.file ? 'Yes' : 'No',
      errorType: error.name,
    });
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid book id.' });
    }
    res.status(500).json({ message: 'An error occurred while updating the book.' });
  }
};

const streamImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: 'Image id is required' });
    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const _id = new ObjectId(id);
    const files = await mongoose.connection.db.collection('uploads.files').findOne({ _id });
    if (!files) return res.status(404).json({ message: 'Image not found' });
    res.set('Content-Type', files.contentType || 'application/octet-stream');
    const downloadStream = bucket.openDownloadStream(_id);
    downloadStream.pipe(res);
    downloadStream.on('error', () => {
      res.status(500).end();
    });
  } catch (error) {
    await logEvents(
      `Stream Image Failed\tError: ${error.message}\tImageID: ${req.params?.id || 'N/A'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Stream Image Failed', error, req, {
      imageId: req.params?.id,
    });
    res.status(500).json({ message: 'Error streaming image' });
  }
};

const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete books.' });
    }
    await book.deleteOne();
    res.status(200).json({ message: 'Book successfully deleted.' });
  } catch (error) {
    await logEvents(
      `Delete Book Failed\tError: ${error.message}\tBookID: ${req.params?.id || 'N/A'}\tUser: ${req.user?.id || 'N/A'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Delete Book Failed', error, req, {
      bookId: req.params?.id,
      userId: req.user?.id,
    });
    res.status(400).json({ message: 'An error occurred while deleting the book.' });
  }
};

const getLibraryStats = async (req, res) => {
  try {
    const User = require('../models/User');
    const Loan = require('../models/Loan');

    const [totalBooks, totalUsers, totalLoans] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Loan.countDocuments()
    ]);

    res.status(200).json({
      totalBooks,
      totalUsers,
      totalLoans
    });
  } catch (error) {
    await logEvents(
      `Get Library Stats Failed\tError: ${error.message}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Get Library Stats Failed', error, req);
    res.status(500).json({ message: 'An error occurred while retrieving statistics.' });
  }
};

// In-memory cache for popular books to reduce database load
const popularCache = new Map();

const getPopularBooks = async (req, res) => {
  try {
    // Validate and sanitize query parameters with safe boundaries
    const rawLimit = parseInt(req.query.limit, 10);
    const rawDays = parseInt(req.query.days, 10);
    const limit = Math.min(isNaN(rawLimit) ? DEFAULT_POPULAR_LIMIT : rawLimit, MAX_POPULAR_LIMIT);
    const days = Math.min(Math.max(isNaN(rawDays) ? DEFAULT_POPULAR_DAYS : rawDays, MIN_POPULAR_DAYS), MAX_POPULAR_DAYS);

    // Check cache first to avoid expensive aggregation queries
    const cacheKey = `${days}|${limit}`;
    const cached = popularCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(200).json(cached.data);
    }

    const now = new Date();
    const since = new Date(now.getTime() - days * MS_PER_DAY);

    // Complex aggregation to find most borrowed books in specified time range
    const pipeline = [
      { $match: { loanDate: { $gte: since } } }, // Filter loans within date range
      { $group: { _id: '$book', borrowCount: { $sum: 1 } } }, // Count borrows per book
      { $sort: { borrowCount: -1 } }, // Sort by popularity
      { $limit: limit * 2 }, // Get extra results for filtering
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } }, // Join book details
      { $unwind: '$book' }, // Flatten book array
      { $project: {
          _id: '$book._id',
          title_tr: '$book.title_tr',
          title_en: '$book.title_en',
          description_tr: '$book.description_tr',
          description_en: '$book.description_en',
          author: '$book.author',
          category: '$book.category',
          imageUrl: '$book.imageUrl',
          available: '$book.available',
          borrowCount: 1,
        } },
      { $limit: limit },
    ];
    const core = await Loan.aggregate(pipeline);

    // Enrich popular books with review statistics for better ranking
    const bookIds = core.map(b => b._id);
    let reviewStats = [];
    if (bookIds.length) {
      reviewStats = await mongoose.connection.db.collection('reviews').aggregate([
        { $match: { book: { $in: bookIds } } },
        { $group: { _id: '$book', reviewCount: { $sum: 1 }, avgRating: { $avg: '$rating' } } }
      ]).toArray();
    }
    const reviewMap = new Map(reviewStats.map(r => [String(r._id), r]));

    const enriched = core.map(b => {
      const rs = reviewMap.get(String(b._id));
      return {
        ...b,
        reviewCount: rs ? rs.reviewCount : 0,
        avgRating: rs && rs.avgRating ? Number(rs.avgRating.toFixed(2)) : null,
      };
    });

    // Multi-criteria sorting: borrow count (primary), review count (secondary), rating (tertiary)
    enriched.sort((a,b)=>{
      if (b.borrowCount !== a.borrowCount) return b.borrowCount - a.borrowCount;
      if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
      return (b.avgRating || 0) - (a.avgRating || 0);
    });

    popularCache.set(cacheKey, { data: enriched, expiresAt: Date.now() + POPULAR_CACHE_TTL_MS });
    res.status(200).json(enriched);
  } catch (error) {
    await logEvents(
      `Get Popular Books Failed\tError: ${error.message}\tLimit: ${req.query?.limit || '6'}\tDays: ${req.query?.days || '30'}\tStack: ${error.stack}`,
      'errLog.log'
    );
    logErrorDetails('Get Popular Books Failed', error, req, {
      limit: req.query?.limit,
      days: req.query?.days,
    });
    res.status(500).json({ message: 'Failed to load popular books.' });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  streamImage,
  deleteBook,
  getPopularBooks,
  getLibraryStats,
};
