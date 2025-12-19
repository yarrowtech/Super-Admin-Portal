const Task = require('../../../models/Task');
const Project = require('../../../models/Project');

const COLUMN_CONFIG = [
  { id: 'backlog', title: 'Backlog', statuses: ['pending', 'cancelled'] },
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
      columnByStatus.get(task.status) || columns.find((col) => col.id === 'backlog');
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

module.exports = {
  getProjectBoard,
};
