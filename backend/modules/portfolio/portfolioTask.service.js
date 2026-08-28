const PortfolioTask = require('../../models/portfolio/PortfolioTask');
const { TASK_STATUSES } = require('../../models/portfolio/PortfolioTask');
const {
  ValidationError,
  NotFoundError,
  assertId,
  audit,
  resolveCategoryChain,
  resolveAssetChain,
  assertActiveUser,
  userSummary,
} = require('./portfolioShared');

const POPULATE = [
  { path: 'assigneeId', select: 'firstName lastName email role profileImage' },
  { path: 'assetId', select: 'title status' },
];

const shape = (doc) => {
  const t = doc.toObject ? doc.toObject() : doc;
  return {
    ...t,
    assignee: userSummary(t.assigneeId),
    assigneeId: t.assigneeId?._id || t.assigneeId || null,
    asset: t.assetId ? { _id: t.assetId._id || t.assetId, title: t.assetId.title, status: t.assetId.status } : null,
    assetId: t.assetId?._id || t.assetId || null,
  };
};

const listTasks = async (categoryId, { status, assignee, priority, due, view = 'list' } = {}) => {
  await resolveCategoryChain(categoryId);
  const filter = { categoryId, deletedAt: null };
  if (status) filter.status = status;
  if (assignee) filter.assigneeId = assignee;
  if (priority) filter.priority = priority;
  if (due === 'overdue') filter.dueDate = { $lt: new Date(), $ne: null };
  else if (due === '7d') filter.dueDate = { $gte: new Date(), $lte: new Date(Date.now() + 7 * 864e5) };
  else if (due === 'none') filter.dueDate = null;

  const tasks = await PortfolioTask.find(filter).sort({ status: 1, order: 1, createdAt: 1 }).populate(POPULATE).lean();
  const items = tasks.map(shape);

  if (view === 'board') {
    const columns = TASK_STATUSES.map((s) => ({ status: s, tasks: items.filter((t) => t.status === s) }));
    return { view: 'board', columns, total: items.length };
  }
  return { view: 'list', items, total: items.length };
};

const createTask = async (categoryId, body, actor) => {
  const category = await resolveCategoryChain(categoryId);
  if (!body.title || !String(body.title).trim()) throw new ValidationError('Task title is required');
  if (body.status && !TASK_STATUSES.includes(body.status)) throw new ValidationError('Invalid task status');

  const assigneeId = await assertActiveUser(body.assigneeId, 'assignee');
  let assetId = null;
  if (body.assetId) {
    const asset = await resolveAssetChain(body.assetId, { categoryId });
    assetId = asset._id;
  }

  const status = body.status || 'todo';
  const last = await PortfolioTask.findOne({ categoryId, status, deletedAt: null }).sort({ order: -1 }).select('order').lean();

  const task = await PortfolioTask.create({
    categoryId: category._id,
    groupId: category.groupId,
    portfolioId: category.portfolioId,
    assetId,
    title: body.title.trim(),
    description: body.description || '',
    assigneeId,
    status,
    priority: body.priority || 'medium',
    dueDate: body.dueDate || null,
    order: (last?.order ?? -1) + 1,
    completedAt: status === 'done' ? new Date() : null,
    createdBy: actor?.id,
    updatedBy: actor?.id,
  });
  await audit(actor, 'TASK_CREATED', 'PortfolioTask', task._id, { categoryId: String(categoryId), title: task.title });
  return shape(await task.populate(POPULATE));
};

const findTaskOrThrow = async (taskId) => {
  assertId(taskId, 'task id');
  const task = await PortfolioTask.findOne({ _id: taskId, deletedAt: null });
  if (!task) throw new NotFoundError('Task not found');
  return task;
};

const updateTask = async (taskId, body, actor) => {
  const task = await findTaskOrThrow(taskId);
  const changed = [];

  if (body.title !== undefined) { task.title = String(body.title).trim(); changed.push('title'); }
  if (body.description !== undefined) { task.description = body.description; changed.push('description'); }
  if (body.priority !== undefined) { task.priority = body.priority; changed.push('priority'); }
  if (body.dueDate !== undefined) { task.dueDate = body.dueDate || null; changed.push('dueDate'); }
  if (body.assigneeId !== undefined) {
    task.assigneeId = await assertActiveUser(body.assigneeId, 'assignee');
    changed.push('assignee');
  }
  if (body.assetId !== undefined) {
    if (body.assetId) {
      const asset = await resolveAssetChain(body.assetId, { categoryId: task.categoryId });
      task.assetId = asset._id;
    } else {
      task.assetId = null;
    }
    changed.push('asset');
  }
  if (body.status !== undefined && body.status !== task.status) {
    if (!TASK_STATUSES.includes(body.status)) throw new ValidationError('Invalid task status');
    task.status = body.status;
    task.completedAt = body.status === 'done' ? new Date() : null;
    changed.push('status');
  }

  if (!changed.length) return shape(await task.populate(POPULATE));
  task.updatedBy = actor?.id;
  await task.save();

  const completed = changed.includes('status') && task.status === 'done';
  await audit(actor, completed ? 'TASK_COMPLETED' : 'TASK_UPDATED', 'PortfolioTask', task._id, { fields: changed });
  return shape(await task.populate(POPULATE));
};

// Persist a drag-and-drop move: set status + reindex the target column so the
// new order sticks across refreshes (spec §9).
const moveTask = async (taskId, { status, order }, actor) => {
  const task = await findTaskOrThrow(taskId);
  if (status && !TASK_STATUSES.includes(status)) throw new ValidationError('Invalid task status');
  const nextStatus = status || task.status;
  const fromStatus = task.status;

  const siblings = await PortfolioTask.find({
    categoryId: task.categoryId,
    status: nextStatus,
    deletedAt: null,
    _id: { $ne: task._id },
  }).sort({ order: 1 }).select('_id');

  const insertAt = Math.max(0, Math.min(Number.isFinite(order) ? Number(order) : siblings.length, siblings.length));
  const ids = siblings.map((s) => s._id);
  ids.splice(insertAt, 0, task._id);

  await Promise.all(ids.map((id, idx) => PortfolioTask.updateOne({ _id: id }, { $set: { order: idx } })));
  task.status = nextStatus;
  task.order = insertAt;
  task.completedAt = nextStatus === 'done' ? task.completedAt || new Date() : null;
  task.updatedBy = actor?.id;
  await task.save();

  await audit(actor, nextStatus === 'done' ? 'TASK_COMPLETED' : 'TASK_UPDATED', 'PortfolioTask', task._id, {
    from: fromStatus, to: nextStatus, moved: true,
  });
  return shape(await task.populate(POPULATE));
};

const archiveTask = async (taskId, actor) => {
  const task = await findTaskOrThrow(taskId);
  task.deletedAt = new Date();
  task.deletedBy = actor?.id;
  await task.save();
  await audit(actor, 'ARCHIVED', 'PortfolioTask', task._id, {});
  return { _id: task._id, archived: true };
};

module.exports = { listTasks, createTask, updateTask, moveTask, archiveTask };
