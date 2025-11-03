const { logErrorDetails } = require('../middleware/logEvents');
const Favorite = require('../models/Favorite');

const addFavorite = async (req, res) => {
  try {
    const { bookId } = req.body;
    const userId = req.user.id;

    const Book = require('../models/Book');
    const book = await Book.findById(bookId);
    
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const existingFavorite = await Favorite.findOne({ userId, bookId });
    if (existingFavorite) {
      return res.status(400).json({ message: 'Book already in favorites' });
    }

    const favorite = new Favorite({ userId, bookId });
    await favorite.save();

    res.status(201).json({ message: 'Book added to favorites', favorite });
  } catch (error) {
    await logErrorDetails('Add Favorite Failed', error, req, {
      bookId: req.body?.bookId || 'N/A'
    });
    res.status(500).json({ message: 'Failed to add favorite', error: error.message });
  }
};

const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const favorites = await Favorite.find({ userId }).populate('bookId');
    res.status(200).json({ favorites });
  } catch (error) {
    await logErrorDetails('Get Favorites Failed', error, req, {});
    res.status(500).json({ message: 'Failed to fetch favorites', error: error.message });
  }
};

const removeFavorite = async (req, res) => {
  try {
    const { favoriteId } = req.params;

    await Favorite.findByIdAndDelete(favoriteId);
    res.status(200).json({ message: 'Favorite removed successfully' });
  } catch (error) {
    await logErrorDetails('Remove Favorite Failed', error, req, {
      favoriteId: req.params?.favoriteId || 'N/A'
    });
    res.status(500).json({ message: 'Failed to remove favorite', error: error.message });
  }
};

module.exports = { addFavorite, getFavorites, removeFavorite };