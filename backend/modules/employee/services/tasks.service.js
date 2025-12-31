const Task = require('../../shared/models/Task');

const buildTaskPayload = (task) => ({
  id: task._id,
  title: task.title,
  dueDate: task.dueDate,
  status: task.status,
  priority: task.priority,
  project: task.project?.name || null,
  progress: task.progress,
  isOverdue: task.isOverdue,
});

const getTaskBuckets = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const tasks = await Task.find({ assignedTo: userId })
    .sort({ dueDate: 1 })
    .populate('project', 'name');

  const today = [];
  const upcoming = [];
  const blocked = [];

  tasks.forEach((task) => {
    const payload = buildTaskPayload(task);
    if (task.isOverdue && task.status !== 'completed') {
      blocked.push(payload);
    } else if (task.dueDate >= startOfDay && task.dueDate <= endOfDay && task.status !== 'completed') {
      today.push(payload);
    } else if (task.dueDate > endOfDay && task.status !== 'completed') {
      upcoming.push(payload);
    }
  });

  return {
    today,
    upcoming,
    blocked,
    updatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getTaskBuckets,
};
