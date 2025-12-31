// backend/routes/dept/media.routes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const { authenticate, authorize } = require('../../shared/middleware/auth');
const { ROLES } = require('../../../config/roles');

// All routes require authentication and MEDIA role
router.use(authenticate);
router.use(authorize(ROLES.MEDIA, ROLES.ADMIN));

// Media specific routes
router.get('/dashboard', mediaController.getDashboard);
router.get('/campaigns', mediaController.getCampaigns);
router.get('/content', mediaController.getContent);

module.exports = router;
