const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  loanDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  isReturned: { type: Boolean, default: false },
  // Late return penalties
  lateFee: { type: Number, default: 0 }, // Amount in TL
  daysLate: { type: Number, default: 0 },
  lateFeePaid: { type: Boolean, default: false },
  lateFeePaymentDate: { type: Date },
  // Email reminder tracking
  reminderSent: { type: Boolean, default: false },
  // Stripe payment integration
  stripePaymentId: { type: String },
}, { timestamps: true });

// Indexes for efficient queries
loanSchema.index({ user: 1, isReturned: 1 });
loanSchema.index({ book: 1 });
loanSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Loan', loanSchema);