const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title_tr: { type: String, required: true }, // Turkish title (required)
  title_en: { type: String, required: true }, // English title (required)
  description_tr: { type: String, required: true }, // Turkish description (required)
  description_en: { type: String, required: true }, // English description (required)
  author: { type: [String], required: true }, // Array of authors
  category: { type: [String], required: true }, // Array of categories
  imageUrl: { type: String },
  imageId: { type: String }, // GridFS file ID for book cover image
  available: { type: Boolean, default: true },
}, { timestamps: true });

// Indexes for efficient search and filtering
bookSchema.index({ title_tr: 1 });
bookSchema.index({ title_en: 1 });
bookSchema.index({ author: 1 });
bookSchema.index({ category: 1 });

module.exports = mongoose.model('Book', bookSchema);