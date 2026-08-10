const User = require('../../models/auth/User');
const Attendance = require('../../models/hr/Attendance');
const Task = require('../../models/common/Task');
const ExportJob = require('../../models/export/ExportJob');
const { ROLES } = require('../../config/roles');

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const normalizeScope = ({ selectedIds, search }) => {
  if (Array.isArray(selectedIds) && selectedIds.length > 0) return 'selected';
  if (search) return 'filtered';
  return 'full';
};

const buildEmployeeQuery = ({ search, selectedIds }) => {
  const query = {
    role: { $nin: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO] },
  };

  if (Array.isArray(selectedIds) && selectedIds.length > 0) {
    query._id = { $in: selectedIds };
    return query;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
};

const buildEmployeeCsv = (employees) => {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Role',
    'Department',
    'Phone',
    'Account Status',
    'Active',
    'Created At',
    'Last Login',
  ];

  const rows = employees.map((employee) =>
    [
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.role,
      employee.department || '',
      employee.phone || '',
      employee.accountStatus || '',
      employee.isActive ? 'Yes' : 'No',
      employee.createdAt ? new Date(employee.createdAt).toISOString() : '',
      employee.lastLogin ? new Date(employee.lastLogin).toISOString() : '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

const buildFileName = () => `hr-employees-export-${new Date().toISOString().slice(0, 10)}.csv`;
const buildAttendanceFileName = () => `hr-attendance-export-${new Date().toISOString().slice(0, 10)}.csv`;
const buildManagerTaskFileName = () => `manager-team-tasks-export-${new Date().toISOString().slice(0, 10)}.csv`;

const exportEmployeesCsv = async ({ search, selectedIds, requestedBy }) => {
  const query = buildEmployeeQuery({ search, selectedIds });
  const employees = await User.find(query)
    .select('firstName lastName email role department phone accountStatus isActive createdAt lastLogin')
    .sort({ createdAt: -1 })
    .lean();

  const fileName = buildFileName();
  const csv = buildEmployeeCsv(employees);

  await ExportJob.create({
    portal: 'hr',
    module: 'employees',
    format: 'csv',
    scope: normalizeScope({ selectedIds, search }),
    status: 'completed',
    requestedBy,
    filters: { search: search || '' },
    selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
    rowCount: employees.length,
    fileName,
    downloadedAt: new Date(),
  });

  return {
    fileName,
    csv,
    rowCount: employees.length,
  };
};

const logFailedExport = async ({ portal = 'hr', module = 'employees', filters = {}, scope = 'filtered', selectedIds, requestedBy, errorMessage, fileName = '' }) => {
  await ExportJob.create({
    portal,
    module,
    format: 'csv',
    scope,
    status: 'failed',
    requestedBy,
    filters,
    selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
    rowCount: 0,
    fileName: fileName || `${portal}-${module}-export-${new Date().toISOString().slice(0, 10)}.csv`,
    errorMessage: errorMessage || 'Export failed',
    downloadedAt: new Date(),
  });
};

const getExportHistory = async ({ requestedBy, portal = 'hr', module = 'employees', page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;
  const query = {
    requestedBy,
    portal,
    module,
  };

  const [items, total] = await Promise.all([
    ExportJob.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ExportJob.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const buildAttendanceQuery = ({ status, startDate, endDate, selectedIds }) => {
  const query = {};

  if (Array.isArray(selectedIds) && selectedIds.length > 0) {
    query._id = { $in: selectedIds };
    return query;
  }

  if (status) query.status = status;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  return query;
};

const buildAttendanceCsv = (records) => {
  const headers = [
    'Employee Name',
    'Email',
    'Department',
    'Date',
    'Check In',
    'Check Out',
    'Status',
    'Work Hours',
    'Location',
    'Notes',
  ];

  const rows = records.map((record) =>
    [
      `${record.employee?.firstName || ''} ${record.employee?.lastName || ''}`.trim() || record.employee?.email || '',
      record.employee?.email || '',
      record.employee?.department || '',
      record.date ? new Date(record.date).toISOString() : '',
      record.checkIn ? new Date(record.checkIn).toISOString() : '',
      record.checkOut ? new Date(record.checkOut).toISOString() : '',
      record.status || '',
      record.workHours ?? '',
      record.location || '',
      record.notes || '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

const exportAttendanceCsv = async ({ status, startDate, endDate, selectedIds, requestedBy }) => {
  const query = buildAttendanceQuery({ status, startDate, endDate, selectedIds });
  const records = await Attendance.find(query)
    .populate('employee', 'firstName lastName email department')
    .sort({ date: -1 })
    .lean();

  const fileName = buildAttendanceFileName();
  const csv = buildAttendanceCsv(records);

  await ExportJob.create({
    portal: 'hr',
    module: 'attendance',
    format: 'csv',
    scope: Array.isArray(selectedIds) && selectedIds.length > 0 ? 'selected' : (status || startDate || endDate ? 'filtered' : 'full'),
    status: 'completed',
    requestedBy,
    filters: { status: status || '', startDate: startDate || '', endDate: endDate || '' },
    selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
    rowCount: records.length,
    fileName,
    downloadedAt: new Date(),
  });

  return { fileName, csv, rowCount: records.length };
};

const buildManagerTaskQuery = ({ managerId, status, priority, assignee, search, selectedIds }) => {
  const query = {
    assignedBy: managerId,
  };

  if (Array.isArray(selectedIds) && selectedIds.length > 0) {
    query._id = { $in: selectedIds };
    return query;
  }

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignee) query.assignedTo = assignee;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
};

const buildManagerTaskCsv = (tasks) => {
  const headers = [
    'Title',
    'Description',
    'Assignee',
    'Assignee Email',
    'Priority',
    'Status',
    'Progress',
    'Due Date',
    'Estimated Hours',
    'Actual Hours',
    'Created At',
  ];

  const rows = tasks.map((task) =>
    [
      task.title || '',
      task.description || '',
      `${task.assignedTo?.firstName || ''} ${task.assignedTo?.lastName || ''}`.trim(),
      task.assignedTo?.email || '',
      task.priority || '',
      task.status || '',
      task.progress ?? '',
      task.dueDate ? new Date(task.dueDate).toISOString() : '',
      task.estimatedHours ?? '',
      task.actualHours ?? '',
      task.createdAt ? new Date(task.createdAt).toISOString() : '',
    ]
      .map(escapeCsv)
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

const exportManagerTasksCsv = async ({ managerId, status, priority, assignee, search, selectedIds, requestedBy }) => {
  const query = buildManagerTaskQuery({ managerId, status, priority, assignee, search, selectedIds });
  const tasks = await Task.find(query)
    .populate('assignedTo', 'firstName lastName email department')
    .sort({ createdAt: -1 })
    .lean();

  const fileName = buildManagerTaskFileName();
  const csv = buildManagerTaskCsv(tasks);

  await ExportJob.create({
    portal: 'manager',
    module: 'tasks',
    format: 'csv',
    scope:
      Array.isArray(selectedIds) && selectedIds.length > 0
        ? 'selected'
        : (status || priority || assignee || search ? 'filtered' : 'full'),
    status: 'completed',
    requestedBy,
    filters: {
      status: status || '',
      priority: priority || '',
      assignee: assignee || '',
      search: search || '',
    },
    selectedIds: Array.isArray(selectedIds) ? selectedIds : [],
    rowCount: tasks.length,
    fileName,
    downloadedAt: new Date(),
  });

  return { fileName, csv, rowCount: tasks.length };
};

module.exports = {
  exportEmployeesCsv,
  exportAttendanceCsv,
  exportManagerTasksCsv,
  logFailedExport,
  getExportHistory,
};
