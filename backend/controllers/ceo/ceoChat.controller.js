const logger = require('../../utils/logger');
const chatService = require('../../services/chat.service');
const User = require('../../models/auth/User');
const ChatThread = require('../../models/common/Chat');
const { ROLES } = require('../../config/roles');

const CEO_ALLOWED_CHAT_ROLES = new Set([
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.MANAGER,
  ROLES.LAW,
  ROLES.FINANCE,
  ROLES.IT,
  ROLES.MEDIA,
  ROLES.SALES,
  ROLES.RESEARCH_OPERATOR,
]);

const isAllowedRole = (role) => CEO_ALLOWED_CHAT_ROLES.has(String(role || '').toLowerCase());

const ensureCeoThreadAllowed = async (reqUser, threadId) => {
  const thread = await ChatThread.findById(threadId).populate('members', 'role');
  if (!thread) {
    const err = new Error('Thread not found');
    err.statusCode = 404;
    throw err;
  }

  const selfId = reqUser?._id?.toString?.() || reqUser?.id?.toString?.();
  const disallowedMember = (thread.members || []).find((member) => {
    const memberId = member?._id?.toString?.() || member?.id?.toString?.();
    if (selfId && memberId === selfId) return false;
    return !isAllowedRole(member?.role);
  });

  if (disallowedMember) {
    const err = new Error('CEO chat is allowed only with head-level roles');
    err.statusCode = 403;
    throw err;
  }
};

exports.getThreads = async (req, res) => {
  try {
    const threads = await chatService.getThreads(req.user);
    const selfId = req.user?._id?.toString?.() || req.user?.id?.toString?.();
    const filtered = (threads || []).filter((thread) => {
      const members = Array.isArray(thread?.members) ? thread.members : [];
      const others = members.filter((m) => {
        const id = m?.id?.toString?.() || m?._id?.toString?.();
        return !selfId || id !== selfId;
      });
      if (others.length === 0) return false;
      return others.every((m) => isAllowedRole(m?.role));
    });
    return res.status(200).json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch CEO chat threads');
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to fetch threads',
      details: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    await ensureCeoThreadAllowed(req.user, threadId);
    const messages = await chatService.getMessages(req.user, threadId);
    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch CEO chat messages');
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to fetch messages',
      details: error.message,
    });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const text = req.body?.text;
    await ensureCeoThreadAllowed(req.user, threadId);

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message text is required',
      });
    }

    const message = await chatService.postMessage(req.user, threadId, text.trim());
    const io = req.app.get('io');
    if (io) {
      io.to(threadId).emit('chat:message', message);
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to post CEO chat message');
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to send message',
      details: error.message,
    });
  }
};

exports.createThread = async (req, res) => {
  try {
    const { targetUserId } = req.body || {};
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
    if (!isAllowedRole(target.role)) {
      return res.status(403).json({
        success: false,
        error: 'CEO can chat only with head-level roles',
      });
    }

    const thread = await chatService.createDirectThread(req.user, targetUserId);
    return res.status(201).json({
      success: true,
      data: thread,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create CEO direct thread');
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to create direct thread',
      details: error.message,
    });
  }
};

exports.createGroupThread = async (req, res) => {
  try {
    const { name, memberIds, meta } = req.body || {};
    const ids = Array.isArray(memberIds) ? memberIds : [];
    const members = await User.find({ _id: { $in: ids } }).select('role');
    const hasDisallowed = members.some((member) => !isAllowedRole(member.role));
    if (hasDisallowed) {
      return res.status(403).json({
        success: false,
        error: 'CEO can add only head-level roles in group chat',
      });
    }

    const thread = await chatService.createGroupThread(req.user, {
      name,
      memberIds,
      meta,
    });
    return res.status(201).json({
      success: true,
      data: thread,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create CEO group thread');
    return res.status(error.statusCode || 500).json({
      success: false,
      error: 'Failed to create group thread',
      details: error.message,
    });
  }
};
