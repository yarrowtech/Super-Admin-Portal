const Task = require('../../../models/Task');
const Project = require('../../../models/Project');

const COLUMN_CONFIG = [
  { id: 'todo', title: 'To Do', statuses: ['pending', 'cancelled'] },
  { id: 'inProgress', title: 'In Progress', statuses: ['in-progress'] },
  { id: 'review', title: 'Review', statuses: ['review'] },
  { id: 'completed', title: 'Completed', statuses: ['completed'] },
];

const buildColumns = () =>
  COLUMN_CONFIG.map((config) => ({
    ...config,
    cards: [],
  }));

const getProjectBoard = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const [tasks, projects] = await Promise.all([
    Task.find({ assignedTo: userId })
      .sort({ dueDate: 1 })
      .populate('project', 'name status deadline progress'),
    Project.find({ 'teamMembers.employee': userId })
      .select('name status progress deadline projectCode')
      .sort({ updatedAt: -1 }),
  ]);

  const columns = buildColumns();
  const columnByStatus = new Map();
  columns.forEach((column) => {
    column.statuses.forEach((status) => columnByStatus.set(status, column));
  });

  tasks.forEach((task) => {
    const column =
      columnByStatus.get(task.status) || columns.find((col) => col.id === 'todo');
    column.cards.push({
      id: task._id,
      title: task.title,
      project: task.project?.name || 'General',
      dueDate: task.dueDate,
      priority: task.priority,
      progress: task.progress,
      status: task.status,
      attachments: task.attachments?.length || 0,
      comments: task.comments?.length || 0,
      isOverdue: task.isOverdue,
    });
  });

  return {
    columns,
    summary: {
      totalTasks: tasks.length,
      overdue: tasks.filter((task) => task.isOverdue).length,
      activeProjects: projects.length,
    },
    projects,
    updatedAt: new Date().toISOString(),
  };
};

const createPersonalTask = async (user, payload = {}) => {
  if (!user?._id) {
    const err = new Error('User context is required');
    err.statusCode = 401;
    throw err;
  }
  const title = payload.title?.trim();
  if (!title) {
    const err = new Error('Title is required');
    err.statusCode = 400;
    throw err;
  }
  const description = payload.description?.trim() || 'Personal to-do';
  const dueDate = payload.dueDate ? new Date(payload.dueDate) : new Date();

  const task = await Task.create({
    title,
    description,
    assignedTo: user._id,
    assignedBy: user._id,
    project: payload.projectId || null,
    priority: payload.priority || 'medium',
    status: 'pending',
    dueDate,
  });

  return {
    id: task._id,
    title: task.title,
    project: payload.projectName || 'Personal',
    dueDate: task.dueDate,
    priority: task.priority,
    progress: task.progress,
    status: task.status,
    attachments: 0,
    comments: 0,
    isOverdue: task.isOverdue,
  };
};

module.exports = {
  getProjectBoard,
  createPersonalTask,
};
