// backend/routes/dept/it.routes.js
const express = require('express');
const router = express.Router();
const itController = require('../../controllers/dept/it.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and IT role
router.use(authenticate);
router.use(authorize(ROLES.IT));

// IT specific routes
router.get('/dashboard', itController.getDashboard);
router.get('/systems', itController.getSystems);
router.get('/support-tickets', itController.getSupportTickets);

module.exports = router;
