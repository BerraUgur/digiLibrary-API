const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swaggerConfig');

const corsOptions = require("./config/corsConfig");
const { logger } = require("./middleware/logEvents");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const bookRoutes = require("./routes/bookRoutes");
const contactRoutes = require("./routes/contactRoutes");
const loanRoutes = require("./routes/loanRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const userRoutes = require("./routes/userRoutes");
const logRoutes = require("./routes/logRoutes");

const app = express();

// ============ DOCUMENTATION ============
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Redirect root URL to Swagger API documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// ============ STANDARD MIDDLEWARE (Must be before CORS) ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============ SECURITY MIDDLEWARE ============
// Conditional CORS - skip for Iyzico callbacks
app.use((req, res, next) => {
  // Skip CORS for Iyzico callback endpoints
  if (req.path === '/api/payments/iyzico-callback' || req.path === '/api/payments/iyzico-book-callback') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    return next();
  }
  // Apply normal CORS for other routes
  cors(corsOptions)(req, res, next);
});

app.options('*', (req, res, next) => {
  // Skip CORS for Iyzico callback endpoints
  if (req.path === '/api/payments/iyzico-callback' || req.path === '/api/payments/iyzico-book-callback') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(200);
  }
  cors(corsOptions)(req, res, next);
});

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable for Iyzico iframe
  frameguard: false // Allow iframe embedding for Iyzico
}));

// Rate limiting: 300 requests per 10 minutes per IP
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 300, // Max 300 requests per window
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  message: { error: 'Too many requests, please try again later' },
  // Skip rate limiting for authenticated users with valid tokens
  skip: (req) => {
    // Skip rate limiting if user is authenticated
    return req.user && req.user.id;
  }
});
app.use('/api/', limiter);

// Prevent NoSQL injection attacks
app.use(mongoSanitize());

// Old file-based logger (kept for backwards compatibility)
app.use(logger);

// New MongoDB-based request logger
app.use(requestLogger);

// ============ STATIC FILES ============
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// ============ API ROUTES ============
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/users", userRoutes);
app.use("/api/logs", logRoutes);

// ============ ERROR HANDLING ============
app.use(errorHandler); // Global error handler

module.exports = app;