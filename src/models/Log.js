const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    // Log Level: info, warn, error, debug
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      required: true,
      index: true,
    },
    // Log message
    message: {
      type: String,
      required: true,
    },
    // Request details
    request: {
      method: String, // GET, POST, PUT, DELETE
      url: String, // /api/books
      path: String, // /api/books/:id
      params: mongoose.Schema.Types.Mixed, // URL parameters
      query: mongoose.Schema.Types.Mixed, // Query strings
      body: mongoose.Schema.Types.Mixed, // Request body (sanitized)
      headers: {
        userAgent: String,
        origin: String,
        referer: String,
        contentType: String,
      },
    },
    // Response details
    response: {
      statusCode: Number,
      statusMessage: String,
      contentLength: Number,
      responseTime: Number, // in milliseconds
    },
    // User information
    user: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
      email: String,
      role: String,
      isAuthenticated: {
        type: Boolean,
        default: false,
      },
    },
    // Network information
    network: {
      ip: String, // IP address
      ipVersion: String, // IPv4 or IPv6
      userAgent: String, // Full user agent
      browser: String, // Chrome, Firefox, etc.
      os: String, // Windows, Mac, Linux, etc.
      device: String, // Desktop, Mobile, Tablet
    },
    // Location (optional - can be added later with IP geolocation)
    location: {
      country: String,
      city: String,
      region: String,
    },
    // Error details (if log level is error)
    error: {
      name: String,
      message: String,
      stack: String,
      code: String,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Operation/Action type
    operation: {
      type: String,
      enum: [
        'auth',
        'book',
        'loan',
        'user',
        'review',
        'favorite',
        'payment',
        'contact',
        'system',
        'other',
      ],
      default: 'other',
    },
    // Environment
    environment: {
      type: String,
      enum: ['development', 'production', 'test'],
      default: process.env.NODE_ENV || 'development',
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Indexes for better query performance
logSchema.index({ level: 1, createdAt: -1 });
logSchema.index({ 'user.userId': 1, createdAt: -1 });
logSchema.index({ 'network.ip': 1 });
logSchema.index({ operation: 1, createdAt: -1 });
logSchema.index({ createdAt: -1 });

// TTL Index - Auto delete logs older than 90 days (optional)
logSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('Log', logSchema);
