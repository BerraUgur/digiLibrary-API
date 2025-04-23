// Book listing process

const Book = require("../models/Book.js");

// Book listing process
const getAllBooks = async (req, res) => {
  try {
    const { category, sortBy, order } = req.query;

    let query = {};
    if (category) {
      query.category = category;
    }

    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = order === 'desc' ? -1 : 1;
    }

    const books = await Book.find(query).sort(sortOptions);
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while retrieving books.' });
  }
};

// Adding a new book (only by user, not admin)
const createBook = async (req, res) => {
  try {
    const { title, author, category } = req.body;
    if (!title || !author || !category) {
      return res.status(400).json({ message: 'Please fill in all fields: title, author, category.' });
    }
    // Sadece kullanıcılar kitap ekleyebilir, admin ekleyemez
    if (req.user.role !== 'user') {
      return res.status(403).json({ message: 'Only users can add books.' });
    }
    // Kitabı ekleyen kullanıcıyı kaydet
    const newBook = new Book({ ...req.body, owner: req.user.id });
    await newBook.save();
    res.status(201).json(newBook);
  } catch (error) {
    res.status(400).json({ message: 'An error occurred while adding the book.' });
  }
};

// Updating book details (only by owner)
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    // Sadece kitabı ekleyen kullanıcı güncelleyebilir
    if (book.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own books.' });
    }
    Object.assign(book, updates);
    await book.save();
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json({ message: 'An error occurred while updating the book.' });
  }
};

// Deleting a book (admin can delete any book, user only own book)
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    // Admin her kitabı silebilir, kullanıcı sadece kendi kitabını silebilir
    if (req.user.role !== 'admin' && book.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own books.' });
    }
    await book.deleteOne();
    res.status(200).json({ message: 'Book successfully deleted.' });
  } catch (error) {
    res.status(400).json({ message: 'An error occurred while deleting the book.' });
  }
};

module.exports = {
  getAllBooks,
  createBook,
  updateBook,
  deleteBook,
};
