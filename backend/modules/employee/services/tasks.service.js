const Task = require('../../shared/models/Task');

const buildTaskPayload = (task) => ({
  id: task._id,
  title: task.title,
  description: task.description,
  dueDate: task.dueDate,
  startDate: task.startDate,
  completedDate: task.completedDate,
  status: task.status,
  priority: task.priority,
  project: task.project ? { id: task.project._id, name: task.project.name } : null,
  assignedBy: task.assignedBy
    ? {
        id: task.assignedBy._id,
        name: `${task.assignedBy.firstName || ''} ${task.assignedBy.lastName || ''}`.trim() || task.assignedBy.email,
        email: task.assignedBy.email,
      }
    : null,
  progress: task.progress,
  isOverdue: task.isOverdue,
  tags: task.tags || [],
  estimatedHours: task.estimatedHours ?? null,
  actualHours: task.actualHours ?? null,
});

const normalizeQuery = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
};

const getTaskSummary = async (userId) => {
  const now = new Date();
  const baseQuery = { assignedTo: userId };

  const [total, pending, inProgress, review, completed, overdue] = await Promise.all([
    Task.countDocuments(baseQuery),
    Task.countDocuments({ ...baseQuery, status: 'pending' }),
    Task.countDocuments({ ...baseQuery, status: 'in-progress' }),
    Task.countDocuments({ ...baseQuery, status: 'review' }),
    Task.countDocuments({ ...baseQuery, status: 'completed' }),
    Task.countDocuments({
      ...baseQuery,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: now },
    }),
  ]);

  return {
    total,
    pending,
    inProgress,
    review,
    completed,
    overdue,
  };
};

const getTaskOverview = async (user, options = {}) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const limit = Number(options.limit) || 6;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const tasks = await Task.find({ assignedTo: userId })
    .sort({ dueDate: 1, createdAt: -1 })
    .populate('project', 'name')
    .populate('assignedBy', 'firstName lastName email');

  const buckets = {
    today: [],
    upcoming: [],
    overdue: [],
    completed: [],
  };

  tasks.forEach((task) => {
    const payload = buildTaskPayload(task);
    if (task.status === 'completed') {
      if (buckets.completed.length < limit) buckets.completed.push(payload);
      return;
    }
    if (task.dueDate && task.dueDate < startOfDay) {
      if (buckets.overdue.length < limit) buckets.overdue.push(payload);
      return;
    }
    if (task.dueDate && task.dueDate >= startOfDay && task.dueDate <= endOfDay) {
      if (buckets.today.length < limit) buckets.today.push(payload);
      return;
    }
    if (buckets.upcoming.length < limit) buckets.upcoming.push(payload);
  });

  const summary = await getTaskSummary(userId);

  return {
    buckets,
    summary,
    updatedAt: new Date().toISOString(),
  };
};

const getTaskList = async (user, filters = {}) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 10, 1), 50);
  const status = normalizeQuery(filters.status);
  const priority = normalizeQuery(filters.priority);
  const search = normalizeQuery(filters.search);
  const overdue = normalizeQuery(filters.overdue);
  const dueFrom = normalizeQuery(filters.dueFrom);
  const dueTo = normalizeQuery(filters.dueTo);
  const sortBy = normalizeQuery(filters.sortBy) || 'dueDate';
  const sortDir = normalizeQuery(filters.sortDir) === 'desc' ? -1 : 1;

  const query = { assignedTo: userId };

  if (status) query.status = Array.isArray(status) ? { $in: status } : status;
  if (priority) query.priority = Array.isArray(priority) ? { $in: priority } : priority;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } },
    ];
  }
  if (overdue === 'true') {
    query.status = { $nin: ['completed', 'cancelled'] };
    query.dueDate = { ...(query.dueDate || {}), $lt: new Date() };
  }
  if (dueFrom || dueTo) {
    query.dueDate = { ...(query.dueDate || {}) };
    if (dueFrom) query.dueDate.$gte = new Date(dueFrom);
    if (dueTo) query.dueDate.$lte = new Date(dueTo);
  }

  const tasks = await Task.find(query)
    .populate('project', 'name')
    .populate('assignedBy', 'firstName lastName email')
    .sort({ [sortBy]: sortDir, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit)
    .exec();

  const [total, summary] = await Promise.all([
    Task.countDocuments(query),
    getTaskSummary(userId),
  ]);

  return {
    tasks: tasks.map(buildTaskPayload),
    summary,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  getTaskOverview,
  getTaskList,
};
