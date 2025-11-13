const { logger } = require('../services/logService');
const jwt = require('jsonwebtoken');
const { accessToken } = require('../config/jwtConfig');

// Request logger middleware - logs all incoming requests
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Skip logging for certain paths
  const skipPaths = [
    '/health',
    '/favicon.ico',
    '/api-docs',
    '/uploads',
    '/static',
    '/api/books/image',
    '/api/books/popular'
  ];
  
  const shouldSkip = skipPaths.some(path => req.path.startsWith(path));
  if (shouldSkip) {
    return next();
  }

  // Skip GET requests with stats query (analytics requests)
  if (req.method === 'GET' && req.query.stats) {
    return next();
  }

  // Extract user info from token before logout clears it
  let userInfo = null;
  try {
    const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, accessToken.secret);
      userInfo = {
        userId: decoded.id || decoded._id,
        email: decoded.email,
        role: decoded.role,
        isAuthenticated: true,
      };
    }
  } catch (err) {
    // Token invalid or expired, no user info
  }

  // Function to log the request (with guard to prevent double logging)
  let isLogged = false;
  const logRequest = async () => {
    if (isLogged) return; // Prevent double logging
    isLogged = true;

    const responseTime = Date.now() - startTime;

    // Skip 304 Not Modified responses
    if (res.statusCode === 304) return;

    // Determine log level based on status code
    let level = 'info';
    if (res.statusCode >= 500) level = 'error';
    else if (res.statusCode >= 400) level = 'warn';

    // Determine operation based on URL path
    let operation = 'other';
    const urlPath = req.originalUrl.toLowerCase();
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
      // Pass original req with user info added
      if (userInfo) {
        req.user = userInfo;
      }
      
      await logger[level](message, {
        req,
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
  };

  // Override res.json
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    logRequest();
    return originalJson(data);
  };

  // Override res.send
  const originalSend = res.send.bind(res);
  res.send = function(data) {
    logRequest();
    return originalSend(data);
  };

  // Override res.status for chaining
  const originalStatus = res.status.bind(res);
  res.status = function(code) {
    res.statusCode = code;
    return originalStatus(code);
  };

  // Fallback: also listen to finish event
  res.on('finish', logRequest);

  next();
};

module.exports = requestLogger;
