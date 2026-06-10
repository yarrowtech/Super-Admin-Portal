const express = require('express');
const controller = require('../controllers/superAdmin/superAdminPortal.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));

router.get('/overview', controller.getOverview);
router.get('/metrics', controller.getMetrics);

router.get('/users', controller.getUsers);
router.get('/users/:userId', controller.getUserById);
router.patch('/users/:userId', controller.updateUser);
router.post('/users/:userId/sync', controller.syncUser);

router.get('/sessions', controller.getSessions);
router.post('/sessions/revoke', controller.revokeSession);
router.post('/sessions/revoke-all', controller.revokeAllSessions);
router.get('/sessions/active-count', controller.getActiveSessionCount);
router.get('/sessions/:userId', controller.getUserSessions);

router.get('/audit', controller.getAudit);

router.get('/security/events', controller.getSecurityEvents);
router.get('/security/replay-attempts', controller.getReplayAttempts);
router.get('/security/failed-logins', controller.getFailedLogins);
router.get('/security/active-sessions', controller.getActiveSessions);

router.get('/health', controller.getHealth);
router.get('/health/database', controller.getDatabaseHealth);
router.get('/health/sso', controller.getSsoHealth);
router.get('/health/permissions', controller.getPermissionsHealth);
router.get('/health/sessions', controller.getSessionsHealth);

module.exports = router;
