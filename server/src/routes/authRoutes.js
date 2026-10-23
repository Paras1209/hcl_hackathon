const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../middleware/validation');

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/logout  (requires auth)
router.post('/logout', authenticate, authController.logout);

// GET /api/auth/me  (requires auth)
router.get('/me', authenticate, authController.me);

module.exports = router;
