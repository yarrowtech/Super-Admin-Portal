// backend/routes/dept/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/dept/admin.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/toggle-status', adminController.toggleUserStatus);

module.exports = router;
