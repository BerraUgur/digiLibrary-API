const Log = require('../models/Log');

// Parse User Agent to extract browser, OS, device info
const parseUserAgent = (userAgent) => {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';

  // Browser detection
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('Opera')) browser = 'Opera';

  // OS detection
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  // Device detection
  if (userAgent.includes('Mobile')) device = 'Mobile';
  else if (userAgent.includes('Tablet')) device = 'Tablet';

  return { browser, os, device };
};

// Get client IP address
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'Unknown'
  );
};

// Sanitize request body (remove sensitive data)
const sanitizeBody = (body) => {
  if (!body) return null;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'confirmPassword', 'token', 'refreshToken'];
  
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
};

// Create a log entry
const createLog = async ({
  level = 'info',
  message,
  req = null,
  res = null,
  user = null,
  error = null,
  operation = 'other',
  metadata = {},
}) => {
  try {
    const logData = {
      level,
      message,
      operation,
      metadata,
      environment: process.env.NODE_ENV || 'development',
    };

    // Add request details if available
    if (req) {
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';
      const { browser, os, device } = parseUserAgent(userAgent);

      logData.request = {
        method: req.method,
        url: req.originalUrl || req.url,
        path: req.route?.path || req.path,
        params: req.params,
        query: req.query,
        body: sanitizeBody(req.body),
        headers: {
          userAgent: userAgent,
          origin: req.headers.origin,
          referer: req.headers.referer,
          contentType: req.headers['content-type'],
        },
      };

      logData.network = {
        ip,
        ipVersion: ip.includes(':') ? 'IPv6' : 'IPv4',
        userAgent,
        browser,
        os,
        device,
      };

      // Add user info if authenticated
      if (req.user) {
        logData.user = {
          userId: req.user._id || req.user.id,
          email: req.user.email,
          role: req.user.role,
          isAuthenticated: true,
        };
      } else if (user) {
        logData.user = {
          userId: user._id || user.id,
          email: user.email,
          role: user.role,
          isAuthenticated: true,
        };
      } else {
        logData.user = {
          isAuthenticated: false,
        };
      }
    }

    // Add response details if available
    if (res) {
      logData.response = {
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        contentLength: res.get('content-length'),
        responseTime: res.responseTime, // Will be set by middleware
      };
    }

    // Add error details if available
    if (error) {
      logData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      };
      logData.level = 'error';
    }

    // Create log in database
    const log = await Log.create(logData);
    return log;
  } catch (err) {
    // Fallback to console if database logging fails
    console.error('Failed to create log:', err);
    console.log('Original log data:', { level, message, operation });
  }
};

// Log levels
const logger = {
  info: (message, options = {}) => createLog({ level: 'info', message, ...options }),
  warn: (message, options = {}) => createLog({ level: 'warn', message, ...options }),
  error: (message, options = {}) => createLog({ level: 'error', message, ...options }),
  debug: (message, options = {}) => createLog({ level: 'debug', message, ...options }),
};

// Get logs with filters
const getLogs = async (filters = {}, options = {}) => {
  const {
    level,
    operation,
    userId,
    startDate,
    endDate,
    ip,
    search,
    page = 1,
    limit = 50,
  } = filters;

  const query = {};

  if (level) query.level = level;
  if (operation) query.operation = operation;
  if (userId) query['user.userId'] = userId;
  if (ip) query['network.ip'] = ip;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { message: { $regex: search, $options: 'i' } },
      { 'request.url': { $regex: search, $options: 'i' } },
      { 'user.email': { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    Log.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user.userId', 'username email role')
      .lean(),
    Log.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
};

// Delete old logs
const deleteOldLogs = async (days = 90) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await Log.deleteMany({
    createdAt: { $lt: cutoffDate },
  });

  return result;
};

// Get log statistics
const getLogStats = async () => {
  const stats = await Log.aggregate([
    {
      $facet: {
        byLevel: [
          { $group: { _id: '$level', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byOperation: [
          { $group: { _id: '$operation', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        totalLogs: [{ $count: 'total' }],
        last24Hours: [
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          },
          { $count: 'total' },
        ],
      },
    },
  ]);

  return stats[0];
};

module.exports = {
  createLog,
  logger,
  getLogs,
  deleteOldLogs,
  getLogStats,
  parseUserAgent,
  getClientIp,
  sanitizeBody,
};
