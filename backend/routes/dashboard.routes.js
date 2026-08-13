const express = require('express');
const router = express.Router();
const controller = require('../controllers/common/dashboardWorkflow.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { cacheGetResponses, invalidateCacheAfterMutation } = require('../middlewares/cacheInvalidation.middleware');
const { ROLES } = require('../config/roles');

router.use(authenticate);
router.use(cacheGetResponses('dashboard', { tags: ['dashboard', 'reference'] }));
router.use(invalidateCacheAfterMutation('dashboard'));

router.get('/workflow/me', controller.getMyDashboardWorkflow);
router.get('/workflow/all', authorize(ROLES.ADMIN), controller.getAllDashboardWorkflows);

module.exports = router;

