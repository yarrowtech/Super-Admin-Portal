const mongoose = require('mongoose');
const Project = require('../../shared/models/Project');
const Task = require('../../shared/models/Task');
const User = require('../../shared/models/User');

const toObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (err) {
    return null;
  }
};

const buildTaskFilter = (managerId, projectIds = []) => {
  const filters = [];
  if (managerId) {
    filters.push({ assignedBy: managerId });
  }
  if (Array.isArray(projectIds) && projectIds.length > 0) {
    filters.push({ project: { $in: projectIds } });
  }
  if (filters.length === 0) {
    return {};
  }
  if (filters.length === 1) {
    return filters[0];
  }
  return { $or: filters };
};

const toBreakdownMap = (rows = [], keys = []) => {
  const map = rows.reduce((acc, row) => {
    const key = row?._id || 'unknown';
    acc[key] = row?.count || 0;
    return acc;
  }, {});
  if (Array.isArray(keys) && keys.length > 0) {
    keys.forEach((key) => {
      if (typeof map[key] !== 'number') {
        map[key] = 0;
      }
    });
  }
  return map;
};

const mapProjects = (projects = []) =>
  projects.map((project) => ({
    id: project._id?.toString?.() || project.id || null,
    name: project.name,
    status: project.status,
    progress: project.progress ?? 0,
    updatedAt: project.updatedAt,
    deadline: project.deadline,
  }));

const mapTasks = (tasks = []) =>
  tasks.map((task) => ({
    id: task._id?.toString?.() || task.id || null,
    title: task.title,
    status: task.status,
    dueDate: task.dueDate,
    progress: task.progress ?? 0,
    priority: task.priority,
    project: task.project
      ? {
          id: task.project._id?.toString?.() || task.project,
          name: task.project.name || null,
        }
      : null,
  }));

const mapTeamMembers = (members = []) =>
  members.map((member) => ({
    id: member._id?.toString?.() || member.id || null,
    name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email,
    email: member.email,
    department: member.department || null,
    role: member.role,
    lastLogin: member.lastLogin,
    isActive: member.isActive,
  }));

const buildManagerSnapshot = async (manager = {}) => {
  const managerId =
    toObjectId(manager._id) || toObjectId(manager.id) || toObjectId(manager?.userId);
  const department = manager.department || manager.metadata?.department || null;
  const projectFilter = managerId ? { projectManager: managerId } : {};
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 7);

  const projectIds = await Project.find(projectFilter).distinct('_id');
  const taskFilter = buildTaskFilter(managerId, projectIds);

  const [
    projectStatusRows,
    recentProjects,
    overdueProjectsCount,
    taskStatusRows,
    overdueTasksCount,
    upcomingTasks,
    teamMembers,
  ] = await Promise.all([
    Project.aggregate([
      { $match: projectFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Project.find(projectFilter)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name status progress updatedAt deadline')
      .lean(),
    Project.countDocuments({
      ...projectFilter,
      deadline: { $lt: now },
      status: { $in: ['planning', 'in-progress', 'on-hold'] },
    }),
    Task.aggregate([
      { $match: taskFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      ...taskFilter,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $lt: now },
    }),
    Task.find({
      ...taskFilter,
      status: { $nin: ['completed', 'cancelled'] },
      dueDate: { $gte: now, $lte: soon },
    })
      .sort({ dueDate: 1 })
      .limit(6)
      .select('title status dueDate progress priority project')
      .populate('project', 'name')
      .lean(),
    User.find(
      department
        ? { role: 'employee', department }
        : { role: 'employee' }
    )
      .sort({ firstName: 1 })
      .limit(12)
      .select('firstName lastName email department lastLogin isActive role')
      .lean(),
  ]);

  const projectBreakdown = toBreakdownMap(projectStatusRows, [
    'planning',
    'in-progress',
    'on-hold',
    'completed',
    'cancelled',
  ]);
  const taskBreakdown = toBreakdownMap(taskStatusRows, [
    'pending',
    'in-progress',
    'review',
    'completed',
    'cancelled',
  ]);

  const totalProjects = projectIds.length;
  const totalTasks = taskStatusRows.reduce((sum, row) => sum + (row?.count || 0), 0);
  const totalTeamMembers = teamMembers.length;
  const activeTeamMembers = teamMembers.filter((member) => member.isActive).length;

  return {
    timestamp: new Date().toISOString(),
    projectSummary: {
      total: totalProjects,
      active: (projectBreakdown['planning'] || 0) + (projectBreakdown['in-progress'] || 0),
      completed: projectBreakdown['completed'] || 0,
      atRisk: projectBreakdown['on-hold'] || 0,
      breakdown: projectBreakdown,
      recent: mapProjects(recentProjects),
    },
    taskSummary: {
      total: totalTasks,
      breakdown: taskBreakdown,
      upcoming: mapTasks(upcomingTasks),
      overdue: overdueTasksCount,
    },
    teamSummary: {
      department,
      totalMembers: totalTeamMembers,
      activeMembers: activeTeamMembers,
      members: mapTeamMembers(teamMembers),
    },
    alerts: {
      overdueProjects: overdueProjectsCount,
      overdueTasks: overdueTasksCount,
    },
  };
};

module.exports = {
  buildManagerSnapshot,
};
