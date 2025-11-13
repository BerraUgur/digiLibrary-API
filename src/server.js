require('dotenv').config();
const app = require("./app");
const connectDB = require("./config/dbConfig");
const { startReminderCron, startLateFeeCalculation } = require('./services/reminderService');

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    console.log("🔹 Starting server...");
    console.log("🔹 Environment check:");
    console.log("PORT:", PORT);
    console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

    await connectDB();

    startReminderCron();
    startLateFeeCalculation();
    console.log('⏰ Cron jobs initialized.');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}, shutting down...`);
      server.close(async () => {
        try {
          await require('mongoose').connection.close();
          process.exit(0);
        } catch (err) {
          console.error(err);
          process.exit(1);
        }
      });
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error("❌ Server error:", error);
    process.exit(1);
  }
};

process.on('uncaughtException', (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
  process.exit(1);
});

startServer();
