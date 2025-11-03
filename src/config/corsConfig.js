const { logEvents } = require('../middleware/logEvents');

const corsOptions = {
  origin: (origin, callback) => {
    const whiteList = [
      "http://localhost",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000",
    ];

    const isWhitelisted = !origin || whiteList.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (isWhitelisted) {
      callback(null, true);
    } else {
      logEvents(
        `CORS Policy Violation\tBlocked Origin: ${origin || 'undefined'}\tAllowed Origins: ${whiteList.join(', ')}`,
        'errLog.log'
      );
      callback(new Error("Blocked by CORS policy."));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization", "Content-Length", "X-Request-Id"],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
};

module.exports = corsOptions;