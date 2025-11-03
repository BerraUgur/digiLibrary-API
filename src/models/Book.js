const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String },
  imageId: { type: String }, // GridFS file ID for book cover image
  available: { type: Boolean, default: true },
}, { timestamps: true });

// Indexes for efficient search and filtering
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ category: 1 });

module.exports = mongoose.model('Book', bookSchema);