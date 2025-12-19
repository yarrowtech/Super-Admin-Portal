const asyncHandler = require('../../../utils/asyncHandler');
const chatService = require('../services/chat.service');
const User = require('../../../models/User');

exports.getThreads = asyncHandler(async (req, res) => {
  const data = await chatService.getThreads(req.user);
  res.json({
    success: true,
    data,
  });
});

exports.getMessages = asyncHandler(async (req, res) => {
  const threadId = req.params.threadId;
  const data = await chatService.getMessages(req.user, threadId);
  res.json({
    success: true,
    data,
  });
});

exports.postMessage = asyncHandler(async (req, res) => {
  const threadId = req.params.threadId;
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Message text is required',
    });
  }

  const message = await chatService.postMessage(req.user, threadId, text);
  const io = req.app.get('io');
  if (io) {
    io.to(threadId).emit('chat:message', message);
  }
  res.status(201).json({
    success: true,
    data: message,
  });
});

exports.createThread = asyncHandler(async (req, res) => {
  const { targetUserId } = req.body;
  if (!targetUserId) {
    return res.status(400).json({
      success: false,
      error: 'targetUserId is required',
    });
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    return res.status(404).json({
      success: false,
      error: 'Target user not found',
    });
  }

  const thread = await chatService.createDirectThread(req.user, targetUserId);
  res.status(201).json({
    success: true,
    data: thread,
  });
});
