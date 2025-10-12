const { format } = require("date-fns");
const { v4: uuid } = require("uuid");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");

// Function to log events with detailed, structured format
const logEvents = async (message, logFileName) => {
  const dateTime = format(new Date(), "yyyy-MM-dd HH:mm:ss");
  const logId = uuid();
  
  // Create detailed, multi-line log entry
  const logItem = `
${'='.repeat(80)}
[LOG ID] ${logId}
[TIMESTAMP] ${dateTime}
${message}
${'='.repeat(80)}\n`;

  try {
    // Ensure the logs directory exists
    if (!fs.existsSync(path.join(__dirname, "..", "logs"))) {
      await fsPromises.mkdir(path.join(__dirname, "..", "logs"));
    }

    // Append the log item to the specified log file
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
};

// Middleware to log HTTP requests
const logger = (req, res, next) => {
  const message = `[HTTP REQUEST]
[METHOD] ${req.method}
[URL] ${req.url}
[ORIGIN] ${req.headers.origin || "unknown"}
[IP ADDRESS] ${req.ip || req.connection?.remoteAddress || "unknown"}`;
  logEvents(message, "reqLog.log");
  next();
};

module.exports = { logEvents, logErrorDetails, logger };