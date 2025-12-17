// backend/routes/dept/law.routes.js
const express = require('express');
const router = express.Router();
const lawController = require('../../controllers/dept/law.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and LAW role
router.use(authenticate);
router.use(authorize(ROLES.LAW));

// Law/Legal specific routes
router.get('/dashboard', lawController.getDashboard);
router.get('/contracts', lawController.getContracts);
router.get('/compliance', lawController.getCompliance);

module.exports = router;
