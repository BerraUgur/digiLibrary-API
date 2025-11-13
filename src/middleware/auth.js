const jwt = require("jsonwebtoken");
const { logErrorDetails } = require('./logEvents');
const { accessToken, refreshToken } = require("../config/jwtConfig");
const RefreshToken = require("../models/RefreshToken");

// Verify JWT access token from cookies or Authorization header (optional for logout)
const verifyAccessTokenOptional = (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, accessToken.secret);
      req.user = decoded;
    } catch (error) {
      // Token invalid but allow to continue for logout
      req.user = null;
    }
  }
  next();
};

// Verify JWT access token from cookies or Authorization header
const verifyAccessToken = (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Access token is required." });
  }

  try {
    const decoded = jwt.verify(token, accessToken.secret);
    req.user = decoded;
    next();
  } catch (error) {
    logErrorDetails('Verify Access Token Failed', error, req, {
      'token provided': token ? 'Yes (hidden for security)' : 'No',
      'token source': req.cookies.accessToken ? 'Cookie' : 'Authorization Header'
    });
    return res.status(401).json({ message: "Invalid or expired access token." });
  }
};

// Verify JWT refresh token and check database validity
const verifyRefreshToken = async (req, res, next) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    return res.status(403).json({ message: "Refresh token is required." });
  }

  let storedToken;
  try {
    storedToken = await RefreshToken.findOne({ token });
    if (!storedToken) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const decoded = jwt.verify(token, refreshToken.secret);
    req.user = decoded;
    next();
  } catch (err) {
    await logErrorDetails('Verify Refresh Token Failed', err, req, {
      'token in db': storedToken ? 'Found' : 'Not Found',
      'token source': req.cookies.refreshToken ? 'Cookie' : 'Request Body'
    });
    
    if (err.name === "TokenExpiredError") {
      await RefreshToken.deleteOne({
        token: req.cookies.refreshToken || req.body.refreshToken,
      });
      return res.status(403).json({ message: "Expired refresh token." });
    }
    return res.status(403).json({ message: "Invalid refresh token." });
  }
};

// Role-based authorization middleware - restricts access by user role
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: "Access denied: Insufficient permissions." 
      });
    }
    next();
  };
};

module.exports = { verifyAccessToken, verifyAccessTokenOptional, verifyRefreshToken, authorizeRoles };