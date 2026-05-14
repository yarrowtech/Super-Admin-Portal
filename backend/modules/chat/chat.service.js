const Chat = require('../../models/common/Chat');
const Message = require('../../models/common/Message');
const User = require('../../models/auth/User');
const { ROLES } = require('../../config/roles');

const CEO_ALLOWED_TARGETS = new Set([ROLES.ADMIN, ROLES.MANAGER, ROLES.HR, ROLES.FINANCE]);

const toId = (v) => v?.toString?.() || String(v || '');

const ensureMember = async (conversationId, userId) => {
  const row = await Chat.findOne({ _id: conversationId, members: userId });
  if (!row) {
    const err = new Error('Conversation not found or access denied');
    err.statusCode = 404;
    throw err;
  }
  return row;
};

const getConversations = async (user, query = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const q = String(query.q || '').trim();
  const baseFilter = { members: user._id };
  if (q) {
    baseFilter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { lastMessage: { $regex: q, $options: 'i' } },
    ];
  }

  const rows = await Chat.find(baseFilter)
    .populate('members', 'firstName lastName email role department')
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const threadIds = rows.map((r) => r._id);
  const unreadAgg = await Message.aggregate([
    { $match: { thread: { $in: threadIds } } },
    { $match: { 'readBy.user': { $ne: user._id }, sender: { $ne: user._id } } },
    { $group: { _id: '$thread', unread: { $sum: 1 } } },
  ]);
  const unreadMap = unreadAgg.reduce((acc, r) => {
    acc[toId(r._id)] = r.unread;
    return acc;
  }, {});

  const mapped = rows.map((r) => ({
    ...r,
    conversationId: r._id,
    unreadCount: unreadMap[toId(r._id)] || 0,
  }));
  const total = await Chat.countDocuments(baseFilter);
  return { conversations: mapped, page, limit, total, totalPages: Math.ceil(total / limit) };
};

const getMessages = async (user, conversationId, query = {}) => {
  await ensureMember(conversationId, user._id);
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 40)));
  const search = String(query.search || '').trim();
  const filter = { thread: conversationId };
  if (search) {
    filter.body = { $regex: search, $options: 'i' };
  }
  const rows = await Message.find(filter)
    .sort({ sentAt: -1, _id: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  return rows.reverse();
};

const createOrFindDirect = async (userA, userB) => {
  let thread = await Chat.findOne({
    isDirect: true,
    members: { $all: [userA, userB] },
  });
  if (!thread) {
    thread = await Chat.create({
      name: 'Direct Chat',
      isDirect: true,
      type: 'direct',
      members: [userA, userB],
      createdBy: userA,
    });
  }
  return thread;
};

const sendMessage = async (sender, payload = {}) => {
  const { conversationId, targetUserId, content, type = 'text', fileUrl = '' } = payload;
  const body = String(content || '').trim();
  if (!body && !fileUrl) {
    const err = new Error('Message content is required');
    err.statusCode = 400;
    throw err;
  }

  let thread = null;
  if (conversationId) {
    thread = await ensureMember(conversationId, sender._id);
  } else if (targetUserId) {
    const recipient = await User.findById(targetUserId).select('_id role isActive');
    if (!recipient || !recipient.isActive) {
      const err = new Error('Recipient not available');
      err.statusCode = 404;
      throw err;
    }
    if (String(sender.role || '').toLowerCase() === ROLES.CEO) {
      const targetRole = String(recipient.role || '').toLowerCase();
      if (!CEO_ALLOWED_TARGETS.has(targetRole)) {
        const err = new Error('CEO can only start direct chat with Admin, Manager, HR, or Finance');
        err.statusCode = 403;
        throw err;
      }
    }
    thread = await createOrFindDirect(sender._id, targetUserId);
  } else {
    const err = new Error('conversationId or targetUserId is required');
    err.statusCode = 400;
    throw err;
  }

  const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email || 'User';
  const message = await Message.create({
    thread: thread._id,
    sender: sender._id,
    senderName,
    body: body || '[File]',
    type,
    fileUrl,
    readBy: [{ user: sender._id, readAt: new Date() }],
    sentAt: new Date(),
  });

  await Chat.findByIdAndUpdate(thread._id, {
    lastMessage: message.body,
    lastMessageAt: message.sentAt,
    lastMessageBy: sender._id,
    updatedAt: new Date(),
  });

  return message.toObject();
};

const markRead = async (user, conversationId, messageIds = []) => {
  await ensureMember(conversationId, user._id);
  if (!Array.isArray(messageIds) || messageIds.length === 0) return { updated: 0 };
  const result = await Message.updateMany(
    {
      _id: { $in: messageIds },
      thread: conversationId,
      sender: { $ne: user._id },
      'readBy.user': { $ne: user._id },
    },
    {
      $push: { readBy: { user: user._id, readAt: new Date() } },
      $set: { isRead: true },
    }
  );
  return { updated: result.modifiedCount || 0 };
};

const sendAnnouncement = async (sender, payload = {}) => {
  if (String(sender.role || '').toLowerCase() !== ROLES.CEO) {
    const err = new Error('Only CEO can send announcements');
    err.statusCode = 403;
    throw err;
  }
  const { content, targetRole, targetDepartment } = payload;
  const body = String(content || '').trim();
  if (!body) {
    const err = new Error('Announcement content is required');
    err.statusCode = 400;
    throw err;
  }
  const userFilter = {};
  if (targetRole && targetRole !== 'all') userFilter.role = targetRole;
  if (targetDepartment && targetDepartment !== 'all') userFilter.department = targetDepartment;

  const recipients = await User.find(userFilter).select('_id role');
  const allowedRecipients = recipients.filter((u) => {
    const role = String(u.role || '').toLowerCase();
    return CEO_ALLOWED_TARGETS.has(role) || role === ROLES.CEO;
  });
  const memberIds = Array.from(new Set([sender._id.toString(), ...allowedRecipients.map((u) => u._id.toString())]));
  if (memberIds.length < 2) {
    const err = new Error('No recipients available for announcement');
    err.statusCode = 400;
    throw err;
  }

  const thread = await Chat.create({
    name: `CEO Announcement ${new Date().toISOString().slice(0, 10)}`,
    type: 'broadcast',
    isDirect: false,
    members: memberIds,
    createdBy: sender._id,
    meta: targetRole || targetDepartment ? `${targetRole || ''} ${targetDepartment || ''}`.trim() : 'All',
  });

  const message = await sendMessage(sender, {
    conversationId: thread._id,
    content: body,
    type: 'announcement',
  });
  return { thread: thread.toObject(), message };
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage,
  markRead,
  sendAnnouncement,
};
