const bcrypt = require('bcrypt');
const User = require('../models/User');
const { signToken } = require('../utils/jwt');
const { generateToken } = require('../utils/hash');
const { logAuthEvent } = require('../services/auditService');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { JWT_EXPIRES_IN, NODE_ENV } = require('../config/env');

const BCRYPT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * POST /api/auth/register
 * Register a new user. Role is selected by the user (for hackathon).
 */
async function register(req, res, next) {
  const { email, password, full_name, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw createError('Email already registered', 409, 'EMAIL_TAKEN');
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user_id = `USR${Date.now()}${generateToken(4)}`;

  const user = await User.create({
    user_id,
    email,
    password_hash,
    full_name,
    role,
  });

  await logAuthEvent({ user_id: user._id, role: user.role, event_type: 'REGISTER' });

  const token = signToken({ userId: user._id, role: user.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info({ user_id: user.user_id, role: user.role }, 'User registered');

  return res.status(201).json({
    success: true,
    data: {
      user: user.toSafeObject(),
      token, // also return in body for Postman/API clients
    },
  });
}

/**
 * POST /api/auth/login
 * Login with email + password, returns JWT in cookie and body.
 */
async function login(req, res, next) {
  const { email, password } = req.body;

  // password_hash excluded by default - explicitly select it here
  const user = await User.findOne({ email }).select('+password_hash');
  if (!user || !user.is_active) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  await logAuthEvent({ user_id: user._id, role: user.role, event_type: 'LOGIN' });

  const token = signToken({ userId: user._id, role: user.role });
  res.cookie('token', token, COOKIE_OPTIONS);

  logger.info({ user_id: user.user_id, role: user.role }, 'User logged in');

  return res.status(200).json({
    success: true,
    data: {
      user: user.toSafeObject(),
      token,
    },
  });
}

/**
 * POST /api/auth/logout
 * Clear the auth cookie.
 */
async function logout(req, res, next) {
  await logAuthEvent({ user_id: req.user._id, role: req.user.role, event_type: 'LOGOUT' });

  res.clearCookie('token', COOKIE_OPTIONS);
  return res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}

/**
 * GET /api/auth/me
 * Return current authenticated user info.
 */
async function me(req, res, next) {
  return res.status(200).json({
    success: true,
    data: { user: req.user.toSafeObject() },
  });
}

module.exports = { register, login, logout, me };
