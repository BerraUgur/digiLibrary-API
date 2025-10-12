module.exports = {
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || "default-access-secret-change-this-in-production",
    expiresIn: "2h", // Short expiration for security
    cookieMaxAge: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  },
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || "default-refresh-secret-change-this-in-production",
    expiresIn: "7d", // Longer expiration for user convenience
    cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  },
  passwordReset: {
    expiresInMs: 60 * 60 * 1000, // Password reset tokens expire after 1 hour
  },
};