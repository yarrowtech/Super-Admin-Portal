const express = require('express');
const mediaModuleRoutes = require('../modules/media/media.routes');
const hrController = require('../controllers/hr/hrDashboard.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { departmentScope, mountDepartmentModules } = require('../middlewares/departmentScope.middleware');
const mountDepartmentCollab = require('../utils/mountDepartmentCollab');
const { ROLES } = require('../config/roles');

const router = express.Router();

// Tasks / Attendance / Jobs for the whole Media department (Head, Marketing, Sales).
// Mounted under /modules, ahead of the media module router, because that router's
// role gate does not admit media_sales. Head/Admin see the department; Sales and
// Marketing only see and act on their own tasks/attendance. Jobs and attendance
// writes are Head/Admin only.
const mediaStaffRoles = [ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING];
const scope = departmentScope({
  roles: [ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING],
  label: 'Media',
  selfOnlyRoles: mediaStaffRoles,
  headRoles: [ROLES.MEDIA_HEAD],
  portalKey: 'media',
});
const modules = express.Router();
modules.use(authenticate);
modules.use(authorize(ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING, ROLES.ADMIN, ROLES.SUPER_ADMIN));
modules.use(authorizePortalAccess('media'));
const canManageMedia = authorize(ROLES.MEDIA_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN);
mountDepartmentModules(modules, scope, hrController, {
  manage: canManageMedia,
  // Only the head/admin allocate tasks; Sales/Marketing update status/progress on their own tasks.
  taskManage: canManageMedia,
  taskManageRoles: [ROLES.MEDIA_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN],
});
// Media-only Team directory + Messages (chat services also enforce this by role).
mountDepartmentCollab(modules, 'media', authorize(ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING));

router.use('/modules', modules);
router.use(mediaModuleRoutes);

module.exports = router;
