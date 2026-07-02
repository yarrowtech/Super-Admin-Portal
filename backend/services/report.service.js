const WorkReport = require('../models/hr/StaffWorkReport');
const Leave = require('../models/hr/Leave');
const Notice = require('../models/common/Notification');
const EmployeeDocument = require('../models/employee/EmployeeDocument');

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

const formatEmployeeDocument = (doc) => ({
  id: doc._id,
  name: doc.title,
  type: doc.type || 'document',
  status: 'uploaded',
  updatedAt: doc.updatedAt || doc.createdAt,
  owner: 'Me',
  source: 'employee_document',
});

const getDocuments = async (user) => {
  const userId = user?._id;
  if (!userId) {
    throw new Error('User context is required');
  }

  const [reports, leaves, notices, uploadedDocuments, reportCount, pendingLeaves] = await Promise.all([
    WorkReport.find({ employee: userId })
      .sort({ reportDate: -1 })
      .limit(15)
      .populate('project', 'name')
      .select('title reportType status reportDate project attachments')
      .lean(),
    Leave.find({ employee: userId })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('leaveType status updatedAt createdAt totalDays')
      .lean(),
    Notice.find({
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'department', departments: user.department },
        { targetAudience: 'specific', specificEmployees: userId },
      ],
    })
      .sort({ publishDate: -1 })
      .limit(5)
      .select('title priority publishDate targetAudience departments specificEmployees')
      .lean(),
    EmployeeDocument.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(20)
      .select('title type updatedAt createdAt metadata')
      .lean(),
    WorkReport.countDocuments({ employee: userId }),
    Leave.countDocuments({ employee: userId, status: 'pending' }),
  ]);

  const folders = [
    { id: 'reports', name: 'Work Reports', count: reportCount },
    { id: 'leaves', name: 'Leave Requests', count: leaves.length },
    { id: 'notices', name: 'Company Notices', count: notices.length },
    { id: 'uploads', name: 'Uploaded Documents', count: uploadedDocuments.length },
  ];

  const items = [
    ...uploadedDocuments.map(formatEmployeeDocument),
    ...reports.map(formatReport),
    ...leaves.map(formatLeave),
    ...notices.map(formatNotice),
  ]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 30);

  const attachmentUsage = reports.reduce(
    (sum, report) => sum + (report.attachments?.length || 0),
    0
  );
  const uploadedUsage = uploadedDocuments.reduce((sum, doc) => {
    const size = Number(doc?.metadata?.size || 0);
    return sum + (Number.isFinite(size) ? size : 0);
  }, 0);

  const storageCapacity = 100 * 1024 * 1024;
  const usedBytes = attachmentUsage + uploadedUsage;
  const storage = {
    used: `${Math.round(usedBytes / 1024)} KB`,
    capacity: `${Math.round(storageCapacity / (1024 * 1024))} MB`,
    usagePercent: Math.min(100, Math.round((usedBytes / storageCapacity) * 100)),
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
