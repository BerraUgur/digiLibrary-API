const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const corsOptions = require("./config/corsConfig");
const { logger } = require("./middleware/logEvents");
const errorHandler = require("./middleware/errorHandler");
const bookRoutes = require("./routes/bookRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const loanRoutes = require("./routes/loanRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./config/swaggerConfig');
const cron = require('node-cron');
const { sendLoanReminders } = require('./controllers/loanController');

const app = express();

// Swagger documentation setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Redirect root URL to Swagger documentation
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Apply security middlewares
app.use(helmet()); // Secure HTTP headers

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Sanitize user inputs
app.use(mongoSanitize());

// Middleware definitions at the application level
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(logger);

// Routes
app.use("/api/books", bookRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/reviews", reviewRoutes);
app.use('/api/payments', paymentRoutes);

// Directory setup for static files
app.use('/views', express.static(path.join(__dirname, 'views')));

// Add error handling middleware
app.use(errorHandler);

// Schedule a cron job to send loan reminders every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running daily loan reminder job...');
  await sendLoanReminders();
});

module.exports = app;