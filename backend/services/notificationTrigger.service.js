const Notification = require('../models/common/Notification');
const User = require('../models/auth/User');
const { emitToUser } = require('./socketRegistry');

// Section 15 Notification Logic — trigger-based, in-app + real-time via the already-running Socket.IO transport.
const notifyUser = async (userId, { title, message, type, metadata = {}, sourceTask } = {}) => {
  if (!userId || !title || !message) return null;

  const doc = await Notification.create({
    manager: userId,
    title,
    message,
    type,
    metadata,
    sourceTask: sourceTask || undefined,
  });

  emitToUser(userId, 'notification', {
    id: String(doc._id),
    title,
    message,
    type,
    metadata,
    createdAt: doc.createdAt,
    read: false,
  });

  return doc;
};

const notifyTaskAssigned = (task) =>
  notifyUser(task.assignedTo, {
    title: 'Task assigned',
    message: `You were assigned: ${task.title}`,
    type: 'task_assigned',
    metadata: { taskId: task._id, campaignId: task.campaignId },
    sourceTask: task._id,
  });

const notifyTaskCompleted = (task) =>
  notifyUser(task.assignedBy, {
    title: 'Task completed',
    message: `"${task.title}" was marked completed`,
    type: 'task_completed',
    metadata: { taskId: task._id, campaignId: task.campaignId },
    sourceTask: task._id,
  });

const notifyApprovalPending = async (role, { title, message, metadata = {} }) => {
  if (!role) return [];
  const users = await User.find({ role, isActive: true }).select('_id').lean();
  return Promise.all(users.map((user) => notifyUser(user._id, { title, message, type: 'approval_pending', metadata })));
};

module.exports = {
  notifyUser,
  notifyTaskAssigned,
  notifyTaskCompleted,
  notifyApprovalPending,
};
