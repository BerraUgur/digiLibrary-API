const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  // Ödünç alan kullanıcı
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Ödünç alınan kitap
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  // Ödünç alma tarihi
  loanDate: { type: Date, default: Date.now },
  // İade tarihi
  returnDate: { type: Date },
  // İade durumu
  isReturned: { type: Boolean, default: false },
  // The date by which the book must be returned
  dueDate: { type: Date, required: true },
}, { timestamps: true });

// Add an index for user and book fields
loanSchema.index({ user: 1 });
loanSchema.index({ book: 1 });

module.exports = mongoose.model('Loan', loanSchema);