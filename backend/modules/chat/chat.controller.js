const logger = require('../../utils/logger');
const chatService = require('./chat.service');

exports.getConversations = async (req, res) => {
  try {
    const data = await chatService.getConversations(req.user, req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Chat getConversations error');
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to fetch conversations' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const data = await chatService.getMessages(req.user, req.params.conversationId, req.query || {});
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Chat getMessages error');
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to fetch messages' });
  }
};

exports.send = async (req, res) => {
  try {
    const data = await chatService.sendMessage(req.user, req.body || {});
    const io = req.app.get('io');
    if (io) {
      const roomId = data.thread?.toString?.() || data.thread;
      io.to(roomId).emit('receive_message', data);
      io.to(roomId).emit('chat:message', data);
    }
    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Chat send error');
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to send message' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body || {};
    const data = await chatService.markRead(req.user, conversationId, messageIds || []);
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('message_read', {
        conversationId,
        messageIds: messageIds || [],
        readerId: req.user?._id || req.user?.id,
      });
    }
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Chat markRead error');
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to mark messages read' });
  }
};

exports.sendAnnouncement = async (req, res) => {
  try {
    const data = await chatService.sendAnnouncement(req.user, req.body || {});
    const io = req.app.get('io');
    if (io) {
      const roomId = data.thread?._id?.toString?.() || data.thread?._id;
      io.to(roomId).emit('receive_message', data.message);
      io.to(roomId).emit('chat:message', data.message);
    }
    return res.status(201).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Chat sendAnnouncement error');
    return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Failed to send announcement' });
  }
};
