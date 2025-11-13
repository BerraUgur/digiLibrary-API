const { logger: mongoLogger } = require("../services/logService");

// Function to log events (legacy API now backed by Mongo logger)
const logEvents = async (message, contextLabel = "legacy-log") => {
  const formattedMessage = `[${contextLabel}] ${message}`;
  try {
    await mongoLogger.error(formattedMessage, {
      operation: "system",
      metadata: { contextLabel, legacy: true },
    });
  } catch (error) {
    console.error(formattedMessage);
    console.error("Failed to persist legacy log entry:", error?.message || error);
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
[USER ID] ${req?.user?.id || req?.user?._id || 'unauthenticated'}
${contextLines ? contextLines + '\n' : ''}[STACK TRACE]
${error.stack}`;

  try {
    await mongoLogger.error(`${operation}: ${error.message}`, {
      req,
      error,
      operation: operation.toLowerCase().includes('auth') ? 'auth' : 
                operation.toLowerCase().includes('book') ? 'book' :
                operation.toLowerCase().includes('loan') ? 'loan' :
                operation.toLowerCase().includes('payment') ? 'payment' : 'other',
      metadata: { ...additionalContext, legacyMessage: message },
    });
  } catch (mongoErr) {
    console.error('Failed to log error to MongoDB:', mongoErr);
    console.error(message);
  }
};

module.exports = { logEvents, logErrorDetails };