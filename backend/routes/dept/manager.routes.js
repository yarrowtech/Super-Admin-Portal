// backend/routes/dept/manager.routes.js
const express = require('express');
const router = express.Router();
const managerController = require('../../controllers/dept/manager.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and MANAGER role
router.use(authenticate);
router.use(authorize(ROLES.MANAGER));

// Manager specific routes
router.get('/dashboard', managerController.getDashboard);
router.get('/team', managerController.getTeam);
router.get('/projects', managerController.getProjects);

module.exports = router;
