const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 7 * 24 * 60 * 60, // TTL: 7 days (in seconds)
  },
});

// Index for userId queries (token already indexed via unique: true)
refreshTokenSchema.index({ token: 1 });

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);