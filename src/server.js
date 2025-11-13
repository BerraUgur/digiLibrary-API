require('dotenv').config();
const app = require("./app");
const connectDB = require("./config/dbConfig");
const { startReminderCron, startLateFeeCalculation } = require('./services/reminderService');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize and start the server
 * Handles database connection, cron jobs, and HTTP server startup
*/
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize cron jobs for automated tasks
    startReminderCron();
    startLateFeeCalculation();
    console.log('⏰ Cron jobs initialized: Email reminders (09:00) | Late fees (00:01)');

    // Start Express server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      server.close(async () => {
        try {
          await require('mongoose').connection.close();
          process.exit(0);
        } catch (err) {
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

startServer();
