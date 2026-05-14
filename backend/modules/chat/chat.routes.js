const express = require('express');
const router = express.Router();
const chatController = require('./chat.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.get('/conversations', chatController.getConversations);
router.get('/messages/:conversationId', chatController.getMessages);
router.post('/send', chatController.send);
router.post('/read', chatController.markRead);
router.post('/announcement', chatController.sendAnnouncement);

module.exports = router;
