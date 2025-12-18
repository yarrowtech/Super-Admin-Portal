// backend/routes/dept/it.routes.js
const express = require('express');
const router = express.Router();
const itController = require('../../controllers/dept/it.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and IT role
router.use(authenticate);
router.use(authorize(ROLES.IT));

// Dashboard
router.get('/dashboard', itController.getDashboard);

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
