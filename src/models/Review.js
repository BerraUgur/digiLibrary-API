const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  reviewText: { type: String, required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
}, { timestamps: true });

// Indexes for efficient queries
reviewSchema.index({ book: 1 });
reviewSchema.index({ user: 1 });

// Compound index: prevent duplicate reviews from same user for same book
reviewSchema.index({ user: 1, book: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);