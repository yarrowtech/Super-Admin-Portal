const ChatThread = require('../../../models/ChatThread');
const ChatMessage = require('../../../models/ChatMessage');
const User = require('../../../models/User');

const threadFilter = (userId) => ({
  $or: [
    { members: { $exists: false } },
    { members: { $size: 0 } },
    { members: userId },
  ],
});

const enrichThread = (thread) => {
  const plain = thread.toObject ? thread.toObject() : thread;
  const members = plain.members || [];
  const unread =
    typeof plain.unreadCount === 'number'
      ? plain.unreadCount
      : typeof plain.unread === 'number'
        ? plain.unread
        : 0;
  return {
    ...plain,
    unread,
    members: members.map((member) => ({
      id: member._id,
      _id: member._id,
      name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
      email: member.email,
      department: member.department,
    })),
  };
};

const getThreads = async (user) => {
  const threads = await ChatThread.find(threadFilter(user._id))
    .sort({ updatedAt: -1 })
    .populate('members', 'firstName lastName email department')
    .lean();
  return threads.map(enrichThread);
};

const getThreadOrThrow = async (user, threadId) => {
  const thread = await ChatThread.findOne({
    _id: threadId,
    ...threadFilter(user._id),
  });
  if (!thread) {
    const error = new Error('Thread not found or access denied');
    error.statusCode = 404;
    throw error;
  }
  return thread;
};

const mapMessage = (userId) => (message) => ({
  id: message._id,
  from: message.senderName,
  text: message.body,
  time: message.sentAt,
  me: message.sender?.toString() === userId.toString(),
  thread: message.thread?.toString(),
  senderId: message.sender?.toString() || null,
});

const getMessages = async (user, threadId) => {
  await getThreadOrThrow(user, threadId);
  const messages = await ChatMessage.find({ thread: threadId })
    .sort({ sentAt: 1 })
    .lean();
  return messages.map(mapMessage(user._id));
};

const postMessage = async (user, threadId, text) => {
  await getThreadOrThrow(user, threadId);

  const message = await ChatMessage.create({
    thread: threadId,
    sender: user._id,
    senderName: `${user.firstName} ${user.lastName}`.trim(),
    body: text,
    sentAt: new Date(),
  });

  await ChatThread.findByIdAndUpdate(threadId, { updatedAt: new Date() });

  return mapMessage(user._id)(message);
};

const createDirectThread = async (user, targetUserId) => {
  if (!targetUserId) {
    const err = new Error('Target user is required');
    err.statusCode = 400;
    throw err;
  }
  if (user._id.toString() === targetUserId.toString()) {
    const err = new Error('Cannot start a chat with yourself');
    err.statusCode = 400;
    throw err;
  }

  const target = await User.findById(targetUserId);
  if (!target) {
    const err = new Error('Target user not found');
    err.statusCode = 404;
    throw err;
  }

  const existing = await ChatThread.findOne({
    isDirect: true,
    members: { $all: [user._id, targetUserId] },
  });

  if (existing) {
    return existing;
  }

  const thread = await ChatThread.create({
    name: `${user.firstName || 'User'} & ${target.firstName || 'User'}`,
    meta: `${target.department || ''} team`,
    members: [user._id, targetUserId],
    isDirect: true,
    createdBy: user._id,
  });

  return thread;
};

module.exports = {
  getThreads,
  getMessages,
  postMessage,
  createDirectThread,
};
