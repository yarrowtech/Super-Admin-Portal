const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const projectsController = require('../controllers/projects.controller');
const tasksController = require('../controllers/tasks.controller');
const documentsController = require('../controllers/documents.controller');
const teamController = require('../controllers/team.controller');
const chatController = require('../controllers/chat.controller');
const { authenticate, authorize } = require('../../../middleware/auth');
const { ROLES } = require('../../../config/roles');

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.EMPLOYEE, ROLES.ADMIN, ROLES.MANAGER, ROLES.CEO));

router.get('/dashboard', dashboardController.getDashboard);
router.get('/projects', projectsController.getProjects);
router.post('/projects/tasks', projectsController.createTask);
router.delete('/projects/tasks/:taskId', projectsController.deleteTask);
router.get('/tasks', tasksController.getTasks);
router.get('/documents', documentsController.getDocuments);
router.get('/team', teamController.getTeam);

router.get('/chat/threads', chatController.getThreads);
router.get('/chat/threads/:threadId/messages', chatController.getMessages);
router.post('/chat/threads/:threadId/messages', chatController.postMessage);
router.post('/chat/threads', chatController.createThread);
router.post('/chat/groups', chatController.createGroupThread);

module.exports = router;
