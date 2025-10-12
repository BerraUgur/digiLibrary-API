const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  banUntil: { type: Date, default: null }, // Ban expiration date for late returns
}, { timestamps: true });

// Pre-save hook: hash password before storing (security)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Instance method: verify password during login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Index for email queries (username already indexed via unique: true)
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);