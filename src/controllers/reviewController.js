const { logErrorDetails } = require('../middleware/logEvents');
const Review = require('../models/Review');

const addReview = async (req, res) => {
  try {
    const { bookId, reviewText, rating } = req.body;

    const review = new Review({
      user: req.user.id,
      book: bookId,
      reviewText,
      rating,
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    await logErrorDetails('Add Review Failed', error, req, {
      bookId: req.body?.bookId || 'N/A',
      rating: req.body?.rating || 'N/A'
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Add Review Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while adding the review.' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found.' });
    }

    if (req.user.role !== 'admin' && review.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You do not have permission to delete this review.' });
    }

    await review.deleteOne();
    res.status(200).json({ message: 'Review successfully deleted.' });
  } catch (error) {
    await logErrorDetails('Delete Review Failed', error, req, {
      reviewId: req.params?.reviewId || 'N/A'
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Delete Review Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while deleting the review.' });
  }
};

const getReviews = async (req, res) => {
  try {
    const { bookId } = req.query;

    const query = bookId ? { book: bookId } : {};
    const reviews = await Review.find(query).populate('user', 'username');

    res.status(200).json(reviews);
  } catch (error) {
    await logErrorDetails('Get Reviews Failed', error, req, {
      bookId: req.query?.bookId || 'all'
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Get Reviews Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while retrieving the reviews.' });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.id })
      .populate('book', 'title author')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    await logErrorDetails('Get User Reviews Failed', error, req, {});
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Get User Reviews Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while loading reviews.' });
  }
};

const getAllReviews = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission for this operation.' });
    }

    const reviews = await Review.find()
      .populate('user', 'username email')
      .populate('book', 'title author')
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    await logErrorDetails('Get All Reviews Failed', error, req, {});
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Get All Reviews Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while loading reviews.' });
  }
};

module.exports = {
  addReview,
  deleteReview,
  getReviews,
  getUserReviews,
  getAllReviews,
};