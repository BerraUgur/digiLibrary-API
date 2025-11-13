const { format } = require("date-fns");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

// Function to log events to file (legacy system for error logs)
const logEvents = async (message, logFileName) => {
  const dateTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const logId = uuid();

  // Create detailed, multi-line log entry for file
  const logItem = `
${'='.repeat(80)}
[LOG ID] ${logId}
[TIMESTAMP] ${dateTime}
${message}
${'='.repeat(80)}\n`;

  try {
    // File-based logging for errors
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fsPromises.mkdir(path.join(__dirname, "..", "logs"));
    }

    await fsPromises.appendFile(
      path.join(__dirname, "..", "logs", logFileName),
      logItem
    );
  } catch (error) {
    console.error("Error occurred while logging:", error);
  }
};

// Helper function to log error details with consistent format
const logErrorDetails = async (operation, error, req, additionalContext = {}) => {
  const contextLines = Object.entries(additionalContext)
    .map(([key, value]) => `[${key.toUpperCase()}] ${value}`)
    .join('\n');

  const message = `[OPERATION] ${operation}
[ERROR TYPE] ${error.name}
[ERROR MESSAGE] ${error.message}
[IP ADDRESS] ${req?.ip || req?.connection?.remoteAddress || 'unknown'}
[USER AGENT] ${req?.headers?.['user-agent'] || 'unknown'}
[USER ID] ${req?.user?.id || 'unauthenticated'}
${contextLines ? contextLines + '\n' : ''}[STACK TRACE]
${error.stack}`;

  await logEvents(message, 'errLog.log');

  // Also log errors to MongoDB with structured data
  const { logger: mongoLogger } = require("../services/logService");
  try {
    await mongoLogger.error(`${operation}: ${error.message}`, {
      req,
      error,
      operation: operation.toLowerCase().includes('auth') ? 'auth' : 
                operation.toLowerCase().includes('book') ? 'book' :
                operation.toLowerCase().includes('loan') ? 'loan' :
                operation.toLowerCase().includes('payment') ? 'payment' : 'other',
      metadata: additionalContext,
    });
  } catch (mongoErr) {
    console.error('Failed to log error to MongoDB:', mongoErr);
  }
};

module.exports = { logEvents, logErrorDetails };