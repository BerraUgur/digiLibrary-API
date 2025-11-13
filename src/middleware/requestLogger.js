const { logger } = require('../services/logService');
const jwt = require('jsonwebtoken');
const { accessToken } = require('../config/jwtConfig');

// Request logger middleware - logs all incoming requests
const requestLogger = async (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for certain paths
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/api-docs',
    '/uploads',
    '/static'
  ];
  
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  if (shouldSkip) {
    return next();
  }

  // Extract user info from token before logout clears it
  let userInfo = null;
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, accessToken.secret);
      userInfo = {
        userId: decoded._id || decoded.id,
        email: decoded.email,
        role: decoded.role,
        isAuthenticated: true,
      };
    }
  } catch (err) {
    // Token invalid or expired, no user info
  }

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
    const responseTime = Date.now() - startTime;
    res.responseTime = responseTime;

    // Determine log level based on status code
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';
    else if (res.statusCode === 304) return; // Skip not modified responses

    // Determine operation based on URL path
    let operation = 'other';
    const urlPath = req.path.toLowerCase();
    if (urlPath.includes('/auth')) operation = 'auth';
    else if (urlPath.includes('/book')) operation = 'book';
    else if (urlPath.includes('/loan')) operation = 'loan';
    else if (urlPath.includes('/user')) operation = 'user';
    else if (urlPath.includes('/review')) operation = 'review';
    else if (urlPath.includes('/favorite')) operation = 'favorite';
    else if (urlPath.includes('/payment')) operation = 'payment';
    else if (urlPath.includes('/contact')) operation = 'contact';

    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;

    try {
      // Create a modified req object with user info
      const logReq = { ...req, user: userInfo || req.user };
      
      await logger[level](message, {
        req: logReq,
        res,
        operation,
        user: userInfo,
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
