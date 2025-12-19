// backend/routes/dept/ceo.routes.js
const express = require('express');
const router = express.Router();
const ceoController = require('../../controllers/dept/ceo.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and CEO role
router.use(authenticate);
router.use(authorize(ROLES.CEO, ROLES.ADMIN));

// CEO specific routes
router.get('/dashboard', ceoController.getDashboard);
router.get('/reports', ceoController.getReports);

module.exports = router;
