const { logger } = require('../services/logService');

// Request logger middleware - logs all incoming requests
const requestLogger = async (req, res, next) => {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    res.responseTime = Date.now() - startTime;
    originalSend.call(this, data);
  };

  res.json = function (data) {
    res.responseTime = Date.now() - startTime;
    originalJson.call(this, data);
  };

  // Log after response is sent
  res.on('finish', async () => {
    // Don't log if it's a health check or static file
    if (
      req.path === '/health' ||
      req.path === '/favicon.ico' ||
      req.path.startsWith('/static')
    ) {
      return;
    }

    const responseTime = Date.now() - startTime;
    res.responseTime = responseTime;

    // Determine log level based on status code
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';

    // Determine operation based on URL
    let operation = 'other';
    if (req.path.includes('/auth')) operation = 'auth';
    else if (req.path.includes('/book')) operation = 'book';
    else if (req.path.includes('/loan')) operation = 'loan';
    else if (req.path.includes('/user')) operation = 'user';
    else if (req.path.includes('/review')) operation = 'review';
    else if (req.path.includes('/favorite')) operation = 'favorite';
    else if (req.path.includes('/payment')) operation = 'payment';
    else if (req.path.includes('/contact')) operation = 'contact';

    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;

    try {
      await logger[level](message, {
        req,
        res,
        operation,
        metadata: {
          responseTime,
        },
      });
    } catch (error) {
      console.error('Failed to log request:', error);
    }
  });

  next();
};

module.exports = requestLogger;
