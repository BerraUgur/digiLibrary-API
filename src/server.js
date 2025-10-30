require('dotenv').config();
const app = require("./app");
const connectDB = require("./config/dbConfig");
const { startReminderCron, startLateFeeCalculation } = require('./services/reminderService');

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || 'development';

// Startup sequence
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();
    
    // 2. Initialize cron jobs
    startReminderCron();
    startLateFeeCalculation();
    console.log('⏰ Cron Jobs: Email reminders (09:00) | Late fees (00:01)');
    
    // 3. Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Port: ${PORT}`);
    });
    
  } catch (error) {
    process.exit(1);
  }
};

startServer();