const express = require('express');
const controller = require('../controllers/superAdmin/superAdminDashboard.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN));
router.use(authorizePortalAccess('super-admin'));

router.get('/dashboard', controller.getDashboard);
router.get('/project-allocations', controller.getProjectAllocations);
router.put('/project-allocations/:userId', controller.updateProjectAllocations);
router.get('/feature-flags', controller.getFeatureFlags);
router.put('/feature-flags/:id', controller.updateFeatureFlag);
router.get('/portal-access', controller.getPortalAccess);
router.put('/portal-access/:id', controller.updatePortalAccess);
router.get('/system-health', controller.getSystemHealth);
router.get('/company-controls', controller.getCompanyControls);
router.put('/company-controls/:id', controller.updateCompanyControl);

module.exports = router;
