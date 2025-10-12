const mongoose = require("mongoose");
const { logEvents } = require('../middleware/logEvents');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/express-mongo");
    console.log(`✅ MongoDB Connected`);
  } catch (error) {
    await logEvents(
      `[OPERATION] MongoDB Connection Failed\n[ERROR] ${error.message}\n[URI] ${process.env.MONGO_URI ? 'Custom' : 'Default'}\n[STACK]\n${error.stack}`,
      'errLog.log'
    );
    console.error('❌ MongoDB Connection Failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;