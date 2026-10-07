// backend/routes/dept/ceo.routes.js
const express = require('express');
const router = express.Router();
const ceoController = require('../controllers/ceo/ceoDashboard.controller');
const departmentStatsController = require('../controllers/ceo/departmentStats.controller');
const ceoChatController = require('../controllers/ceo/ceoChat.controller');
const ceoSalesAnalyticsController = require('../controllers/ceo/ceoSalesAnalytics.controller');
const marketingAnalyticsController = require('../controllers/ceo/marketingAnalytics.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { cacheGetResponses, invalidateCacheAfterMutation } = require('../middlewares/cacheInvalidation.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and CEO role
router.use(authenticate);
router.use(authorize(ROLES.CEO, ROLES.ADMIN));
router.use(authorizePortalAccess('ceo'));
router.use(cacheGetResponses('ceo', { tags: ['dashboard', 'analytics'] }));
router.use(invalidateCacheAfterMutation('ceo'));

// CEO specific routes
router.get('/dashboard', ceoController.getDashboard);
router.get('/overview', ceoController.getOverviewAnalytics);
router.get('/revenue', ceoController.getRevenueAnalytics);
router.get('/products', ceoController.getProductAnalytics);
router.get('/employees-analytics', ceoController.getEmployeeAnalytics);
router.get('/departments-analytics', ceoController.getDepartmentAnalytics);
router.get('/projects-analytics', ceoController.getProjectAnalytics);
router.get('/notifications-analytics', ceoController.getNotificationAnalytics);
router.get('/sales-query-analytics', ceoSalesAnalyticsController.getSalesQueryAnalytics);

// ── Marketing Analytics ─────────────────────────────────────────────────────
// Reads from the external marketing platform through our own integration layer, so the
// platform's credentials stay server-side and the browser only ever sees aggregates.
// `status` is listed before the parameterised contact route so it is not swallowed by it.
router.get('/marketing-analytics', marketingAnalyticsController.getMarketingAnalytics);
router.get('/marketing-analytics/status', marketingAnalyticsController.getMarketingStatus);
router.get('/marketing-analytics/projects', marketingAnalyticsController.getMarketingProjects);
router.get('/marketing-analytics/contacts', marketingAnalyticsController.getMarketingContacts);
router.get('/marketing-analytics/contacts/:contactId', marketingAnalyticsController.getMarketingContact);
// Alias analytics endpoints for standardized API contract
router.get('/employees', ceoController.getEmployeeAnalytics);
router.get('/departments', ceoController.getDepartmentAnalytics);
router.get('/projects', ceoController.getProjectAnalytics);
router.get('/notifications-graph', ceoController.getNotificationAnalytics);
router.get('/reports', ceoController.getReports);
router.get('/employees/list', ceoController.getAllEmployees);
router.get('/departments/list', departmentStatsController.getDepartmentStats);
router.post('/alert', ceoController.createAlert);
router.get('/notifications', ceoController.getNotifications);
router.put('/notifications/:id/read', ceoController.markNotificationRead);
router.put('/notifications/mark-all-read', ceoController.markAllNotificationsRead);

// CEO Chat routes
router.get('/chat/threads', ceoChatController.getThreads);
router.get('/chat/threads/:threadId/messages', ceoChatController.getMessages);
router.post('/chat/threads/:threadId/messages', ceoChatController.postMessage);
router.post('/chat/threads', ceoChatController.createThread);
router.post('/chat/groups', ceoChatController.createGroupThread);

module.exports = router;
