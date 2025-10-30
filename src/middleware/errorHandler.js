const { logErrorDetails } = require("./logEvents");

const errorHandler = (err, req, res, _next) => {
  // Log error details using helper function
  logErrorDetails('Global Error Handler', err, req, {
    method: req.method,
    url: req.url,
    origin: req.headers.origin || 'unknown',
    requestBody: JSON.stringify(req.body || {})
  });

  // Determine appropriate status code
  const status = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(status);

  // Build error response
  const errorResponse = {
    success: false,
    message: err.message || 'Internal server error',
    type: err.name,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV !== "production") {
    errorResponse.stack = err.stack;
  }

  res.json(errorResponse);
};

module.exports = errorHandler;
