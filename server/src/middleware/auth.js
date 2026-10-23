const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * authenticate - Verify JWT from Authorization header or httpOnly cookie.
 * Attaches req.user (without password) for downstream handlers.
 */
async function authenticate(req, res, next) {
  try {
    let token;

    // 1. Try Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Fallback: httpOnly cookie
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    const decoded = verifyToken(token);

    // Fetch fresh user from DB to check if still active
    const user = await User.findById(decoded.userId).select('-password_hash');
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not found or inactive' },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    logger.warn({ err: err.message }, 'Auth failure');
    return res.status(401).json({
      success: false,
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        message: isExpired ? 'Token has expired' : 'Invalid token',
      },
    });
  }
}

/**
 * authorize - Role-based access control middleware.
 * Must be used AFTER authenticate.
 * @param  {...string} roles - Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn({ userId: req.user.user_id, role: req.user.role, requiredRoles: roles }, 'Forbidden access attempt');
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${roles.join(' or ')}`,
        },
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
