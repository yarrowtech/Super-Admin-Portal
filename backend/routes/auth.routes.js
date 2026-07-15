// backend/routes/auth.routes.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const passwordController = require('../controllers/auth/password.controller');
const { authenticate, refreshToken } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const env = require('../config/env');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
} = require('../middlewares/validate.middleware');

// Dedicated, tighter brute-force guard for credential-checking endpoints —
// the global apiLimiter (app.js) is generic API throughput protection and
// only runs in production; this one specifically slows down password-guessing
// against a known account regardless of environment being spoofed downstream.
const authBruteForceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.IS_PRODUCTION,
  message: { success: false, error: 'Too many attempts. Please try again in a few minutes.', code: 'TOO_MANY_ATTEMPTS' },
});

// Public routes with validation
router.post('/register', authBruteForceLimiter, registerValidation, validate, authController.register);
router.post('/login', authBruteForceLimiter, loginValidation, validate, authController.login);
router.post('/outsourcing/login', authBruteForceLimiter, loginValidation, validate, authController.outsourcingLogin);

// Token management routes
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/verify-token', authController.verifyToken);

// Protected routes (require authentication)
router.get('/me', authenticate, refreshToken, authController.getMe);
router.get('/profile/me', authenticate, refreshToken, authController.getMe);
router.put('/profile', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.patch('/profile', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.patch('/profile/update', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.post('/profile/upload-resume', authenticate, uploadSingle('resume'), authController.uploadResume);
router.put('/change-password', authenticate, changePasswordValidation, validate, passwordController.changePassword);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAllOtherSessions);

module.exports = router;
