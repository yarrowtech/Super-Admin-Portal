// backend/routes/dept/hr.routes.js
const express = require('express');
const router = express.Router();
const hrController = require('../../controllers/dept/hr.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and HR role
router.use(authenticate);
router.use(authorize(ROLES.HR));

// HR specific routes
router.get('/dashboard', hrController.getDashboard);
router.get('/employees', hrController.getEmployees);
router.get('/recruitment', hrController.getRecruitment);
router.get('/leave-management', hrController.getLeaveManagement);

module.exports = router;
