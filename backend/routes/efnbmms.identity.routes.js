const express = require('express');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { authenticateIntegrationClient } = require('../middlewares/integrationAuth.middleware');
const { ROLES } = require('../config/roles');
const controller = require('../controllers/efnbmmsIdentity.controller');

const router = express.Router();

router.post('/launch', authenticate, authorize(ROLES.ADMIN, ROLES.FREELANCER, ROLES.SUPER_ADMIN), controller.launch);
router.post('/exchange', authenticateIntegrationClient, controller.exchange);
router.get('/users', authenticateIntegrationClient, controller.listUsers);
router.get('/users/:userId', authenticateIntegrationClient, controller.getUserById);
router.get('/users/:userId/permissions', authenticateIntegrationClient, controller.getUserPermissions);
router.post('/users/:userId/sync', authenticateIntegrationClient, controller.syncUser);
router.get('/health', authenticateIntegrationClient, controller.health);

module.exports = router;
