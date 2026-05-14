// backend/routes/dept/it.routes.js
const express = require('express');
const router = express.Router();
const itController = require('../controllers/department/it.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and IT role
router.use(authenticate);
router.use(authorize(ROLES.IT, ROLES.ADMIN));
router.use(authorizePortalAccess('it'));

// Dashboard
router.get('/dashboard', itController.getDashboard);
router.get('/system-overview', itController.getSystemOverview);
router.get('/user-access', itController.getUserAccessSummary);
router.get('/roles-permissions', itController.getRolePermissionSummary);
router.get('/infrastructure', itController.getInfrastructureSummary);
router.get('/api-integrations', itController.getApiIntegrationSummary);
router.get('/security-compliance', itController.getSecurityComplianceSummary);
router.get('/system-logs', itController.getSystemLogsSummary);
router.get('/access-requests', itController.getAccessRequestWorkflow);
router.get('/deployments', itController.getDeploymentOpsSummary);
router.get('/events', itController.getEventIntegrations);

// Projects Management
router.get('/projects', itController.getProjects);
router.post('/projects', itController.createProject);
router.get('/projects/:id', itController.getProjectById);
router.put('/projects/:id', itController.updateProject);
router.delete('/projects/:id', itController.deleteProject);
router.put('/projects/:id/add-member', itController.addProjectMember);
router.put('/projects/:id/update-progress', itController.updateProjectProgress);

// Support Tickets Management
router.get('/support-tickets', itController.getSupportTickets);
router.post('/support-tickets', itController.createSupportTicket);
router.get('/support-tickets/my-tickets', itController.getMyTickets);
router.get('/support-tickets/:id', itController.getSupportTicketById);
router.put('/support-tickets/:id', itController.updateSupportTicket);
router.put('/support-tickets/:id/assign', itController.assignSupportTicket);
router.put('/support-tickets/:id/resolve', itController.resolveSupportTicket);
router.put('/support-tickets/:id/close', itController.closeSupportTicket);
router.post('/support-tickets/:id/comment', itController.addTicketComment);

module.exports = router;
