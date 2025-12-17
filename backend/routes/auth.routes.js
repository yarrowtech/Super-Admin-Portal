// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, refreshToken } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
} = require('../middleware/validate');

// Public routes with validation
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

// Token management routes
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/verify-token', authController.verifyToken);

// Protected routes (require authentication)
router.get('/me', authenticate, refreshToken, authController.getMe);
router.put('/profile', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
