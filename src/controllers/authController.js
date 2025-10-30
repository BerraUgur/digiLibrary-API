const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const sanitize = require('mongo-sanitize');
const { logErrorDetails } = require('../middleware/logEvents');
const { accessToken, refreshToken, passwordReset } = require("../config/jwtConfig");
const RefreshToken = require("../models/RefreshToken");
const User = require("../models/User");
const PasswordReset = require("../models/PasswordReset");
const ROLES = require('../constants/rolesConstants');
const { sendPasswordResetEmail } = require('../services/mailService');

// Generate JWT access and refresh tokens for user authentication
// Access token contains user details, refresh token only contains user ID for security
const generateTokens = (user) => {
  const accessTokenPayload = { id: user._id, email: user.email, role: user.role };
  const refreshTokenPayload = { id: user._id }; // Minimal data in refresh token

  return {
    accessToken: jwt.sign(accessTokenPayload, accessToken.secret, { expiresIn: accessToken.expiresIn }),
    refreshToken: jwt.sign(refreshTokenPayload, refreshToken.secret, { expiresIn: refreshToken.expiresIn }),
  };
};

const registerUser = async (req, res) => {
  try {
    const sanitizedBody = sanitize(req.body);
    const { username, email, password, role = ROLES.USER } = sanitizedBody;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields must be filled." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "This email address is already registered." });
    }

    const user = new User({ username, email, password, role });
    await user.save();

    const { password: _, ...userResponse } = user.toObject();
    res.status(201).json(userResponse);
  } catch (error) {
    await logErrorDetails('User Registration Failed', error, req, {
      email: sanitizedBody?.email || 'N/A',
      username: sanitizedBody?.username || 'N/A',
      role: sanitizedBody?.role || ROLES.USER
    });
    res.status(500).json({ message: "An error occurred while saving the user." });
  }
};

const loginUser = async (req, res) => {
  try {
    const sanitizedBody = sanitize(req.body);
    const { email, password } = sanitizedBody;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Delete old refresh tokens to prevent token accumulation and force re-login on other devices
    await RefreshToken.deleteMany({ userId: user._id });
    const tokens = generateTokens(user);

    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken });

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessToken.cookieMaxAge,
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh-token",
      maxAge: refreshToken.cookieMaxAge,
    });

    const { password: _, ...userResponse } = user.toObject();
    res.status(200).json({ message: "Login successful!", user: userResponse });
  } catch (error) {
    await logErrorDetails('User Login Failed', error, req, {
      email: sanitizedBody?.email || 'N/A'
    });
    res.status(500).json({ message: "An error occurred during user login." });
  }
};

const refreshTokens = async (req, res) => {
  try {
    const { refreshToken: oldRefreshToken } = req.body;

    if (!oldRefreshToken) {
      return res.status(400).json({ message: "Refresh token is required." });
    }

    const storedToken = await RefreshToken.findOne({ token: oldRefreshToken });
    if (!storedToken) {
      return res.status(403).json({ message: "Invalid refresh token." });
    }

    const decoded = jwt.verify(oldRefreshToken, refreshToken.secret);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await RefreshToken.deleteOne({ token: oldRefreshToken });
    const tokens = generateTokens(user);

    await RefreshToken.create({ userId: user._id, token: tokens.refreshToken });

    res.cookie("accessToken", tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: accessToken.cookieMaxAge,
    });

    res.cookie("refreshToken", tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh-token",
      maxAge: refreshToken.cookieMaxAge,
    });

    res.status(200).json({ message: "Tokens successfully refreshed." });
  } catch (error) {
    await logErrorDetails('Token Refresh Failed', error, req, {
      'old token': oldRefreshToken ? 'Provided' : 'Missing'
    });
    res.status(500).json({ message: "An error occurred during token refresh." });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh-token" });

    res.status(200).json({ message: "Successfully logged out." });
  } catch (error) {
    await logErrorDetails('User Logout Failed', error, req, {
      'cookies present': !!req.cookies.refreshToken
    });
    res.status(500).json({ message: "An error occurred during logout." });
  }
};

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email address is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If this email is registered, a password reset link has been sent.' });
    }

    await PasswordReset.updateMany(
      { user: user._id, used: false },
      { used: true }
    );

    // Generate cryptographically secure random token for password reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + passwordReset.expiresInMs);

    await PasswordReset.create({
      user: user._id,
      token: resetToken,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({ message: 'If this email is registered, a password reset link has been sent.' });
  } catch (error) {
    await logErrorDetails('Password Reset Request Failed', error, req, {
      email: email
    });
    res.status(500).json({ message: "An error occurred while processing password reset request." });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const resetRecord = await PasswordReset.findOne({ token, used: false });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or already used token.' });
    }

    if (resetRecord.isExpired()) {
      return res.status(400).json({ message: 'Token has expired. Please request a new password reset.' });
    }

    const user = await User.findById(resetRecord.user);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    res.status(200).json({ message: 'Password successfully updated. You can now login.' });
  } catch (error) {
    await logErrorDetails('Password Reset Failed', error, req, {
      'token valid': !!resetRecord,
      'user email': resetRecord?.email || 'N/A'
    });
    res.status(500).json({ message: "An error occurred while resetting password." });
  }
};

module.exports = { registerUser, loginUser, refreshTokens, logout, requestPasswordReset, resetPassword };