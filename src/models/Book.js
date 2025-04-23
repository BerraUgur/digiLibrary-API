const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  // Kitap başlığı
  title: { type: String, required: true },
  // Kitap yazarı
  author: { type: String, required: true },
  // Kitap kategorisi
  category: { type: String, required: true },
  // Kitabın mevcut olup olmadığı bilgisi
  available: { type: Boolean, default: true },
  // Kitabı ekleyen kullanıcı
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Add indexes for title and author fields
bookSchema.index({ title: 1 });
bookSchema.index({ author: 1 });

module.exports = mongoose.model('Book', bookSchema);
