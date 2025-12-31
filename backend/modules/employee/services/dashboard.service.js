const Task = require('../../shared/models/Task');
const Project = require('../../shared/models/Project');
const Leave = require('../../shared/models/Leave');
const Attendance = require('../../shared/models/Attendance');
const Notice = require('../../shared/models/Notice');
const WorkReport = require('../../shared/models/WorkReport');

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

module.exports = {
  getDashboard,
};
