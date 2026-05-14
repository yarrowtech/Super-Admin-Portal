const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const chatController = require('../controllers/common/chat.controller');
const modularChatRoutes = require('../modules/chat/chat.routes');

router.use(authenticate);

// New production chat APIs
router.use('/', modularChatRoutes);

// Backward-compatible APIs used by existing portals
router.get('/threads', chatController.getThreads);
router.get('/threads/:threadId/messages', chatController.getMessages);
router.post('/threads/:threadId/messages', chatController.postMessage);
router.post('/threads', chatController.createThread);
router.post('/groups', chatController.createGroupThread);

module.exports = router;
