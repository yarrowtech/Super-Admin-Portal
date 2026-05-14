const mongoose = require('mongoose');
const Task = require('../models/common/Task');
const Project = require('../models/common/Project');
const Leave = require('../models/hr/Leave');
const Attendance = require('../models/hr/Attendance');
const Notice = require('../models/common/Notification');
const WorkReport = require('../models/hr/StaffWorkReport');
const User = require('../models/auth/User');

const buildNoticeFilter = (user) => {
  const base = { isActive: true };
  if (!user) {
    return base;
  }

  return {
    ...base,
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'department', departments: user.department },
      { targetAudience: 'specific', specificEmployees: user._id },
    ],
  };
};

const formatSchedule = (tasks) =>
  tasks.map((task) => ({
    id: task._id,
    title: task.title,
    dueDate: task.dueDate,
    project: task.project?.name || null,
    status: task.status,
    priority: task.priority,
  }));

const getDashboard = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required to load the dashboard');
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const upcomingLimit = new Date(now);
  upcomingLimit.setDate(upcomingLimit.getDate() + 7);

  const openTasksQuery = { assignedTo: userId, status: { $nin: ['completed', 'cancelled'] } };

  const [
    activeProjects,
    openTasksCount,
    completedTasksCount,
    overdueTasksCount,
    pendingLeavesCount,
    todayAttendance,
    upcomingTasks,
    latestNotices,
    recentReports,
  ] = await Promise.all([
    Project.countDocuments({ 'teamMembers.employee': userId, status: { $nin: ['completed', 'cancelled'] } }),
    Task.countDocuments(openTasksQuery),
    Task.countDocuments({ assignedTo: userId, status: 'completed' }),
    Task.countDocuments({ assignedTo: userId, isOverdue: true, status: { $ne: 'completed' } }),
    Leave.countDocuments({ employee: userId, status: 'pending' }),
    Attendance.findOne({
      employee: userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    }),
    Task.find({
      ...openTasksQuery,
      dueDate: { $gte: now, $lte: upcomingLimit },
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('project', 'name'),
    Notice.find(buildNoticeFilter(user))
      .sort({ publishDate: -1 })
      .limit(5)
      .select('title type priority publishDate'),
    WorkReport.find({ employee: userId })
      .sort({ reportDate: -1 })
      .limit(3)
      .select('title reportType status reportDate project')
      .populate('project', 'name'),
  ]);

  const totalTasksForProgress = openTasksCount + completedTasksCount || 1;
  const sprintProgress = Math.min(
    100,
    Math.round((completedTasksCount / totalTasksForProgress) * 100)
  );

  return {
    employee: {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department || null,
    },
    greeting: user.firstName || 'there',
    stats: [
      {
        label: 'Active Projects',
        value: activeProjects,
        meta: `${completedTasksCount} tasks completed`,
        delta: `${overdueTasksCount} overdue`,
      },
      {
        label: 'My Tasks',
        value: openTasksCount,
        meta: 'Assigned to you',
        delta: `${pendingLeavesCount} leave pending`,
      },
      {
        label: 'Completed Tasks',
        value: completedTasksCount,
        meta: 'All-time completed',
        delta: sprintProgress >= 100 ? 'Sprint done' : `${sprintProgress}% sprint`,
      },
      {
        label: 'Pending Leaves',
        value: pendingLeavesCount,
        meta: 'Awaiting approval',
        delta: 'HR queue',
      },
    ],
    sprint: {
      name: 'Sprint 42',
      progress: sprintProgress,
    },
    schedule: formatSchedule(upcomingTasks),
    attendance: {
      checkedIn: Boolean(todayAttendance),
      checkIn: todayAttendance?.checkIn || null,
      checkOut: todayAttendance?.checkOut || null,
      status: todayAttendance?.status || null,
    },
    workbench: {
      attendanceManagement: {
        mode: 'manual_no_gps',
        checkedIn: Boolean(todayAttendance),
        status: todayAttendance?.status || (todayAttendance ? 'present' : 'pending'),
      },
      taskAndWorkUpdate: {
        openTasks: openTasksCount,
        completedTasks: completedTasksCount,
        overdueTasks: overdueTasksCount,
      },
      performanceSnapshot: {
        sprintProgress,
        completedTasks: completedTasksCount,
        activeProjects,
      },
      leaveManagement: {
        pendingLeaves: pendingLeavesCount,
      },
    },
    notices: latestNotices,
    recentReports: recentReports.map((report) => ({
      id: report._id,
      title: report.title,
      reportType: report.reportType,
      status: report.status,
      reportDate: report.reportDate,
      project: report.project?.name || null,
    })),
    fetchedAt: new Date().toISOString(),
  };
};

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
  if (managerId) filters.push({ assignedBy: managerId });
  if (Array.isArray(projectIds) && projectIds.length > 0) {
    filters.push({ project: { $in: projectIds } });
  }
  if (filters.length === 0) return {};
  if (filters.length === 1) return filters[0];
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
      if (typeof map[key] !== 'number') map[key] = 0;
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
    Project.aggregate([{ $match: projectFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Project.find(projectFilter).sort({ updatedAt: -1 }).limit(5).select('name status progress updatedAt deadline').lean(),
    Project.countDocuments({
      ...projectFilter,
      deadline: { $lt: now },
      status: { $in: ['planning', 'in-progress', 'on-hold'] },
    }),
    Task.aggregate([{ $match: taskFilter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
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
    User.find(department ? { role: 'employee', department } : { role: 'employee' })
      .sort({ firstName: 1 })
      .limit(12)
      .select('firstName lastName email department lastLogin isActive role')
      .lean(),
  ]);

  const projectBreakdown = toBreakdownMap(projectStatusRows, ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled']);
  const taskBreakdown = toBreakdownMap(taskStatusRows, ['pending', 'in-progress', 'review', 'completed', 'cancelled']);
  const totalTasks = taskStatusRows.reduce((sum, row) => sum + (row?.count || 0), 0);
  const activeTeamMembers = teamMembers.filter((member) => member.isActive).length;
  const teamMemberIds = teamMembers.map((member) => member._id).filter(Boolean);

  const [pendingLeaveApprovals, pendingWorkApprovals] = await Promise.all([
    teamMemberIds.length
      ? Leave.countDocuments({
          employee: { $in: teamMemberIds },
          status: 'pending',
          managerApprovalStatus: { $ne: 'approved' },
        })
      : 0,
    teamMemberIds.length
      ? WorkReport.countDocuments({
          employee: { $in: teamMemberIds },
          status: 'submitted',
        })
      : 0,
  ]);

  return {
    timestamp: new Date().toISOString(),
    projectSummary: {
      total: projectIds.length,
      active: (projectBreakdown.planning || 0) + (projectBreakdown['in-progress'] || 0),
      completed: projectBreakdown.completed || 0,
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
      totalMembers: teamMembers.length,
      activeMembers: activeTeamMembers,
      members: mapTeamMembers(teamMembers),
    },
    alerts: {
      overdueProjects: overdueProjectsCount,
      overdueTasks: overdueTasksCount,
    },
    pendingApprovals: {
      leaves: pendingLeaveApprovals,
      workReports: pendingWorkApprovals,
      total: pendingLeaveApprovals + pendingWorkApprovals,
    },
  };
};

module.exports = {
  getDashboard,
  buildManagerSnapshot,
};
