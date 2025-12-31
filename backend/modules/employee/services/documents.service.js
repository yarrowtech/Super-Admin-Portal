const WorkReport = require('../../shared/models/WorkReport');
const Leave = require('../../shared/models/Leave');
const Notice = require('../../shared/models/Notice');

const formatReport = (report) => ({
  id: report._id,
  name: report.title,
  type: report.reportType,
  status: report.status,
  updatedAt: report.reportDate,
  project: report.project?.name || null,
});

const formatLeave = (leave) => ({
  id: leave._id,
  name: `${leave.leaveType} leave`,
  type: 'leave',
  status: leave.status,
  updatedAt: leave.updatedAt || leave.createdAt,
  duration: leave.totalDays,
});

const formatNotice = (notice) => ({
  id: notice._id,
  name: notice.title,
  type: 'notice',
  status: notice.priority,
  updatedAt: notice.publishDate,
});

const getDocuments = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const [reports, leaves, notices, reportCount, pendingLeaves] = await Promise.all([
    WorkReport.find({ employee: userId })
      .sort({ reportDate: -1 })
      .limit(15)
      .populate('project', 'name'),
    Leave.find({ employee: userId })
      .sort({ updatedAt: -1 })
      .limit(10),
    Notice.find({
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'department', departments: user.department },
        { targetAudience: 'specific', specificEmployees: userId },
      ],
    })
      .sort({ publishDate: -1 })
      .limit(5),
    WorkReport.countDocuments({ employee: userId }),
    Leave.countDocuments({ employee: userId, status: 'pending' }),
  ]);

  const folders = [
    { id: 'reports', name: 'Work Reports', count: reportCount },
    { id: 'leaves', name: 'Leave Requests', count: leaves.length },
    { id: 'notices', name: 'Company Notices', count: notices.length },
  ];

  const items = [...reports.map(formatReport), ...leaves.map(formatLeave), ...notices.map(formatNotice)]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 20);

  const attachmentUsage = reports.reduce(
    (sum, report) => sum + (report.attachments?.length || 0),
    0
  );

  const storageCapacity = 100;
  const storage = {
    used: attachmentUsage,
    capacity: storageCapacity,
    usagePercent: Math.min(100, Math.round((attachmentUsage / storageCapacity) * 100)),
  };

  return {
    folders,
    items,
    storage,
    pendingApprovals: pendingLeaves,
    fetchedAt: new Date().toISOString(),
  };
};

module.exports = {
  getDocuments,
};
