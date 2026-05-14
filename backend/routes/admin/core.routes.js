const express = require('express');
const controllers = require('../../controllers/admin');
const { requirePermission } = require('../../middlewares/permission.middleware');

const router = express.Router();

// Dashboard
router.get('/dashboard', controllers.dashboard.getDashboard);

// User management
router.get('/users', requirePermission('users:read'), controllers.users.getAllUsers);
router.get('/users/export', requirePermission('users:export'), controllers.users.exportUsers);
router.get('/users/:id', requirePermission('users:read'), controllers.users.getUserById);
router.post('/users', requirePermission('users:create'), controllers.users.createUser);
router.put('/users/:id', requirePermission('users:update'), controllers.users.updateUser);
router.patch('/users/:id/status', requirePermission('users:update'), controllers.users.setUserStatus);
router.delete('/users/:id', requirePermission('users:delete'), controllers.users.deleteUser);
router.post('/users/:id/toggle-status', requirePermission('users:update'), controllers.users.toggleUserStatus);

// Role management
router.get('/roles', controllers.roles.getRoles);
router.post('/roles', controllers.roles.createRole);
router.put('/roles/permissions', controllers.roles.updateRolePermissions);

// Audit logs
router.get('/audit-logs', controllers.auditLogs.getAuditLogs);

// Settings
router.get('/settings', controllers.settings.getSettings);
router.put('/settings', controllers.settings.updateSettings);

module.exports = router;

