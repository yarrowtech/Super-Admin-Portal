// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth/auth.controller');
const passwordController = require('../controllers/auth/password.controller');
const { authenticate, refreshToken } = require('../middlewares/auth.middleware');
const { uploadSingle } = require('../middlewares/upload.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
} = require('../middlewares/validate.middleware');

// Public routes with validation
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/outsourcing/login', loginValidation, validate, authController.outsourcingLogin);

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

module.exports = router;
