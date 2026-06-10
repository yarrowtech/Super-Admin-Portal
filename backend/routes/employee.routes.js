const express = require('express');
const dashboardController = require('../controllers/employee/employeeDashboard.controller');
const projectsController = require('../controllers/employee/employeeProjects.controller');
const tasksController = require('../controllers/employee/employeeTasks.controller');
const documentsController = require('../controllers/employee/employeeDocuments.controller');
const chatController = require('../controllers/employee/employeeChat.controller');
const notificationsController = require('../controllers/employee/employeeNotification.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MANAGER, ROLES.CEO, ROLES.IT));
router.use(authorizePortalAccess('employee'));

router.get('/dashboard', dashboardController.getDashboard);
router.get('/projects', projectsController.getProjects);
router.post('/projects/tasks', projectsController.createTask);
router.delete('/projects/tasks/:taskId', projectsController.deleteTask);
router.get('/tasks', tasksController.getTasks);
router.post('/notify-manager/task-review/:taskId', notificationsController.notifyManagerTaskReview);
router.get('/documents', documentsController.getDocuments);
router.post('/documents', documentsController.uploadDocument);
router.get('/documents/:id/download', documentsController.downloadDocument);
router.get('/team', projectsController.getTeam);

router.get('/chat/threads', chatController.getThreads);
router.get('/chat/threads/:threadId/messages', chatController.getMessages);
router.post('/chat/threads/:threadId/messages', chatController.postMessage);
router.post('/chat/threads', chatController.createThread);
router.post('/chat/groups', chatController.createGroupThread);

module.exports = router;
