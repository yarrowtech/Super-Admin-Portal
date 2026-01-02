const mongoose = require('mongoose');
const ManagerNotification = require('../models/ManagerNotification');
const Task = require('../../shared/models/Task');
const User = require('../../shared/models/User');
const { ROLES } = require('../../../config/roles');

const normalize = (value) => (value ? value.toString().trim().toLowerCase() : '');
const escapeRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDepartmentTarget = (department) => {
  const normalized = normalize(department) || 'general';
  const compact = normalized.replace(/\s+/g, '');
  const base = ['general', 'all', normalized];
  if (compact && compact !== normalized) {
    base.push(compact);
  }
  return {
    departments: Array.from(new Set(base.filter(Boolean))),
    managerNames: [],
    managerEmails: [],
    managerIds: [],
  };
};

const formatNotification = (notificationDoc) => {
  if (!notificationDoc) return null;
  const obj =
    typeof notificationDoc.toObject === 'function' ? notificationDoc.toObject() : notificationDoc;
  return {
    id: obj._id?.toString() || obj.id,
    manager: obj.manager?.toString?.() || obj.manager || null,
    managerDepartment: obj.managerDepartment || null,
    department: obj.department || null,
    title: obj.title,
    message: obj.message,
    type: obj.type || 'task_completed',
    metadata: obj.metadata || {},
    target: obj.target || {
      departments: [],
      managerNames: [],
      managerEmails: [],
      managerIds: [],
    },
    read: Boolean(obj.read),
    readAt: obj.readAt || null,
    createdAt: obj.createdAt || new Date().toISOString(),
    updatedAt: obj.updatedAt || obj.createdAt || new Date().toISOString(),
  };
};

const getManagerId = (managerUser) => managerUser?._id || managerUser?.id || managerUser;

const getNotificationsForManager = async (managerUser, options = {}) => {
  const managerId = getManagerId(managerUser);
  if (!managerId) {
    const err = new Error('Manager context is required');
    err.statusCode = 401;
    throw err;
  }

  const rawLimit = parseInt(options.limit, 10);
  const rawPage = parseInt(options.page, 10);
  const limit = Number.isNaN(rawLimit) ? 25 : Math.min(Math.max(rawLimit, 1), 100);
  const page = Number.isNaN(rawPage) ? 1 : Math.max(rawPage, 1);
  const skip = (page - 1) * limit;

  const filter = { manager: managerId };

  const [items, total, unread] = await Promise.all([
    ManagerNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ManagerNotification.countDocuments(filter),
    ManagerNotification.countDocuments({ ...filter, read: false }),
  ]);

  return {
    notifications: items.map(formatNotification),
    total,
    unread,
    page,
    limit,
  };
};

const markNotificationRead = async (managerUser, notificationId) => {
  const managerId = getManagerId(managerUser);
  if (!managerId) {
    const err = new Error('Manager context is required');
    err.statusCode = 401;
    throw err;
  }
  if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
    const err = new Error('Valid notification id is required');
    err.statusCode = 400;
    throw err;
  }

  const notification = await ManagerNotification.findOneAndUpdate(
    { _id: notificationId, manager: managerId },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    const err = new Error('Notification not found');
    err.statusCode = 404;
    throw err;
  }

  return formatNotification(notification);
};

const markAllNotificationsRead = async (managerUser) => {
  const managerId = getManagerId(managerUser);
  if (!managerId) {
    const err = new Error('Manager context is required');
    err.statusCode = 401;
    throw err;
  }
  await ManagerNotification.updateMany(
    { manager: managerId, read: false },
    { read: true, readAt: new Date() }
  );
  const unread = await ManagerNotification.countDocuments({ manager: managerId, read: false });
  return { unread };
};

const findTargetManagers = async (department) => {
  const query = {
    role: ROLES.MANAGER,
    isActive: true,
  };
  if (department) {
    query.department = new RegExp(`^${escapeRegex(department)}$`, 'i');
  }
  let managers = await User.find(query).select('firstName lastName email department');
  if (!managers.length) {
    managers = await User.find({ role: ROLES.MANAGER, isActive: true }).select(
      'firstName lastName email department'
    );
  }
  return managers;
};

const emitSocketNotification = (io, managerId, payload) => {
  if (!io || !managerId) return;
  io.to(`manager:${managerId.toString()}`).emit('manager:notification', payload);
};

const createTaskCompletionNotifications = async ({
  taskId,
  employee,
  payload = {},
  io,
} = {}) => {
  if (!taskId) {
    const err = new Error('Task ID is required');
    err.statusCode = 400;
    throw err;
  }

  const employeeId = employee?._id || employee?.id;
  if (!employeeId) {
    const err = new Error('Employee context is required');
    err.statusCode = 401;
    throw err;
  }

  let task = null;
  if (mongoose.Types.ObjectId.isValid(taskId)) {
    task = await Task.findById(taskId).populate('project', 'name').populate('assignedTo', 'department');
  }

  if (task && task.assignedTo && task.assignedTo._id) {
    const assignedToId = task.assignedTo._id.toString();
    if (assignedToId !== employeeId.toString()) {
      const err = new Error('You are not authorized to update this task');
      err.statusCode = 403;
      throw err;
    }
  }

  const employeeName =
    `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
    employee?.email ||
    'Employee';
  const rawDepartment =
    payload.department || employee?.department || task?.assignedTo?.department || 'General';
  const department =
    typeof rawDepartment === 'string' && rawDepartment.trim()
      ? rawDepartment.trim()
      : 'General';
  const target = buildDepartmentTarget(department);
  const taskTitle = payload.title || task?.title || `Task ${taskId}`;
  const status = payload.status || task?.status || 'completed';
  const projectName = payload.project || task?.project?.name || 'Current Project';

  const metadata = {
    taskId,
    taskTitle,
    taskStatus: status,
    employeeName,
    employeeDepartment: department,
    projectName,
    priority: payload.priority || task?.priority || 'medium',
    dueDate: payload.dueDate || task?.dueDate || null,
  };

  const title = payload.notificationTitle || payload.title || 'Task completed';
  const message =
    payload.message ||
    `${employeeName} completed "${taskTitle}"${projectName ? ` in ${projectName}` : ''}`;

  const managers = await findTargetManagers(department);
  if (!managers.length) {
    return {
      notifications: [],
      meta: {
        recipients: [],
        department,
        target,
        totalCreated: 0,
        note: 'No active managers found to notify',
      },
    };
  }

  const docs = managers.map((manager) => ({
    manager: manager._id,
    managerDepartment: manager.department,
    department,
    title,
    message,
    type: payload.type || 'task_completed',
    metadata,
    target,
    sourceTask: task?._id || null,
    sourceEmployee: employeeId,
  }));

  const savedNotifications = await ManagerNotification.insertMany(docs);
  const formatted = savedNotifications.map(formatNotification);

  formatted.forEach((notification) => {
    emitSocketNotification(io, notification.manager, notification);
  });

  return {
    notifications: formatted,
    meta: {
      recipients: managers.map((manager) => ({
        id: manager._id.toString(),
        name: `${manager.firstName || ''} ${manager.lastName || ''}`.trim() || manager.email,
        email: manager.email,
        department: manager.department,
      })),
      department,
      target,
      totalCreated: formatted.length,
    },
  };
};

module.exports = {
  getNotificationsForManager,
  markNotificationRead,
  markAllNotificationsRead,
  createTaskCompletionNotifications,
  formatNotification,
};
