// backend/routes/dept/manager.routes.js
const express = require('express');
const router = express.Router();
const managerController = require('../controllers/manager/managerDashboard.controller');
const managerExportController = require('../controllers/manager/exportSystem.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and MANAGER role
router.use(authenticate);
router.use(authorize(ROLES.MANAGER, ROLES.ADMIN));
router.use(authorizePortalAccess('manager'));

// Manager specific routes
router.get('/dashboard', managerController.getDashboard);
router.get('/team', managerController.getTeam);
router.get('/project-teams', managerController.getProjectTeams);
router.post('/project-teams', managerController.createProjectTeam);
router.delete('/project-teams/:teamId/members/:memberId', managerController.removeProjectTeamMember);
router.get('/projects', managerController.getProjects);
router.post('/projects', managerController.createProject);
router.put('/projects/:id/status', managerController.updateProjectStatus);
router.get('/tasks', managerController.getTasks);
router.post('/tasks/export', managerExportController.exportTasksCsv);
router.get('/tasks/export-history', managerExportController.getTaskExportHistory);
router.post('/tasks', managerController.createTask);
router.put('/tasks/:id', managerController.updateTask);
router.put('/tasks/:id/reassign', managerController.reassignTask);
router.put('/tasks/:id/close', managerController.closeTask);

// Employee work management routes
router.get('/completed-tasks', managerController.getCompletedTasks);
router.get('/employee-work', managerController.getEmployeeWork);
router.get('/employee-work/stats', managerController.getEmployeeWorkStats);
router.put('/employee-work/:workId/approve', managerController.approveWork);
router.put('/employee-work/:workId/reject', managerController.rejectWork);

// Leave Management
router.get('/leave', managerController.getLeaveRequests);
router.put('/leave/:id/approve', managerController.approveLeave);
router.put('/leave/:id/reject', managerController.rejectLeave);

// Work Reports
router.get('/work-reports', managerController.getWorkReports);

// Notification routes
router.get('/notifications', managerController.getNotifications);
router.put('/notifications/:id/read', managerController.markNotificationRead);
router.put('/notifications/mark-all-read', managerController.markAllNotificationsRead);

module.exports = router;
