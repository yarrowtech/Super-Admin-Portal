// backend/routes/dept/admin.routes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { cacheGetResponses, invalidateCacheAfterMutation } = require('../middlewares/cacheInvalidation.middleware');
const { ROLES } = require('../config/roles');
const adminCoreRoutes = require('./admin/core.routes');
const adminModulesRoutes = require('./admin/modules.routes');

// All routes require authentication and ADMIN or HR role
router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.HR, ROLES.IT_MANAGER));
router.use(authorizePortalAccess('admin'));
router.use(cacheGetResponses('admin', { tags: ['users', 'departments', 'dashboard'] }));
router.use(invalidateCacheAfterMutation('users', ['admin', 'departments']));
router.use('/', adminCoreRoutes);
router.use('/modules', adminModulesRoutes);

module.exports = router;
