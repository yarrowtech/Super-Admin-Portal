const express = require('express');
const mongoose = require('mongoose');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const Project = require('../models/common/Project');
const Law = require('../models/department/Law');
const LawContract = require('../models/law/LawContract');
const ITAsset = require('../models/it/ITAsset');
const ITTicket = require('../models/it/ITTicket');
const Invoice = require('../models/finance/Invoice');
const Payment = require('../models/finance/Payment');
const Expense = require('../models/finance/Expense');
const Budget = require('../models/finance/Budget');
const Compliance = require('../models/finance/Compliance');
const User = require('../models/auth/User');
const Task = require('../models/common/Task');
const Attendance = require('../models/hr/Attendance');
const Leave = require('../models/hr/Leave');
const StaffWorkReport = require('../models/hr/StaffWorkReport');
const EmployeeTask = require('../models/employee/EmployeeTask');
const EmployeeProject = require('../models/employee/EmployeeProject');
const { PROJECT_REGISTRY } = require('../utils/projectAccess');

const router = express.Router();

const READ_ONLY_PROJECT_ROLES = [
  ROLES.CEO,
  ROLES.IT_MANAGER,
  ROLES.IT_ADMIN,
  ROLES.IT_EMPLOYEE,
  ROLES.IT_HR,
  ROLES.LAW_HEAD,
  ROLES.LAW_EMPLOYEE,
  ROLES.HR,
  ROLES.FINANCE_MANAGER,
  ROLES.FINANCE_EMPLOYEE,
  ROLES.MEDIA_HEAD,
  ROLES.MEDIA_SALES,
  ROLES.MEDIA_MARKETING,
];

const PORTAL_META = {
  law: {
    title: 'Law Project Overview',
    subtitle: 'Contracts, legal records, compliance, disputes, and legal workload by project.',
    icon: 'gavel',
    accent: '#991b1b',
  },
  it: {
    title: 'IT Project Overview',
    subtitle: 'Assets, tickets, infrastructure health, and technical workload by project.',
    icon: 'memory',
    accent: '#0369a1',
  },
  hr: {
    title: 'HR Project Overview',
    subtitle: 'People operations, attendance, leave, work reports, and HR workload by project.',
    icon: 'badge',
    accent: '#7c3aed',
  },
  finance: {
    title: 'Finance Project Overview',
    subtitle: 'Invoices, payments, expenses, budgets, compliance, and financial workload by project.',
    icon: 'account_balance',
    accent: '#047857',
  },
  manager: {
    title: 'Manager Project Overview',
    subtitle: 'Project progress, milestones, team workload, and operational execution by project.',
    icon: 'supervisor_account',
    accent: '#0f766e',
  },
  employee: {
    title: 'Employee Project Overview',
    subtitle: 'Assigned projects, tasks, personal work progress, and delivery context.',
    icon: 'person',
    accent: '#2563eb',
  },
  research: {
    title: 'Research Project Overview',
    subtitle: 'Research project context and operational visibility.',
    icon: 'science',
    accent: '#7c2d12',
  },
  ceo: {
    title: 'CEO Project Overview',
    subtitle: 'Company-wide progress, milestones, and delivery visibility by project.',
    icon: 'business_center',
    accent: '#ef4444',
  },
  sales: {
    title: 'Sales Project Overview',
    subtitle: 'Project progress and delivery context to support sales conversations.',
    icon: 'point_of_sale',
    accent: '#ea580c',
  },
};

const ROLE_PORTAL = {
  [ROLES.LAW_HEAD]: 'law',
  [ROLES.LAW_EMPLOYEE]: 'law',
  [ROLES.IT_MANAGER]: 'manager',
  [ROLES.IT_ADMIN]: 'it',
  [ROLES.IT_EMPLOYEE]: 'employee',
  [ROLES.IT_HR]: 'hr',
  [ROLES.HR]: 'hr',
  [ROLES.FINANCE_MANAGER]: 'finance',
  [ROLES.FINANCE_EMPLOYEE]: 'finance',
  [ROLES.MEDIA_HEAD]: 'sales',
  [ROLES.MEDIA_SALES]: 'sales',
  [ROLES.MEDIA_MARKETING]: 'sales',
  [ROLES.CEO]: 'ceo',
};

const PORTAL_ROLES = {
  law: new Set([ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.CEO]),
  it: new Set([ROLES.IT_MANAGER, ROLES.IT_ADMIN, ROLES.IT_EMPLOYEE, ROLES.IT_HR, ROLES.CEO]),
  hr: new Set([ROLES.HR, ROLES.IT_HR, ROLES.CEO]),
  manager: new Set([ROLES.IT_MANAGER, ROLES.CEO]),
  employee: new Set([ROLES.IT_EMPLOYEE, ROLES.IT_MANAGER, ROLES.CEO]),
  finance: new Set([ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE, ROLES.CEO]),
  ceo: new Set([ROLES.CEO]),
  sales: new Set([ROLES.MEDIA_HEAD, ROLES.MEDIA_SALES, ROLES.MEDIA_MARKETING, ROLES.CEO]),
};

const allowedProjectRegexes = PROJECT_REGISTRY.flatMap((project) => [
  project.code,
  project.name,
  ...(Array.isArray(project.aliases) ? project.aliases : []),
])
  .map((value) => String(value || '').trim())
  .filter(Boolean)
  .map((value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

const objectId = (value) => (mongoose.Types.ObjectId.isValid(String(value || '')) ? new mongoose.Types.ObjectId(String(value)) : null);
const toNumber = (value) => Number(value) || 0;
const sum = (rows, field) => rows.reduce((total, row) => total + toNumber(row?.[field]), 0);
const fmtMoney = (value) => `INR ${Math.round(toNumber(value)).toLocaleString('en-IN')}`;
const pct = (done, total) => (total ? Math.round((done / total) * 100) : 0);

const resolvePortal = (req) => {
  const requested = String(req.query.portal || '').toLowerCase();
  const role = String(req.user?.role || '').toLowerCase();
  const fallback = ROLE_PORTAL[role] || 'manager';
  if (!requested || !PORTAL_META[requested]) return fallback;
  if (!PORTAL_ROLES[requested]?.has(role)) return fallback;
  return requested;
};

const projectFilter = (query = {}) => {
  const filter = {
    $or: [
      { name: { $in: allowedProjectRegexes } },
      { projectCode: { $in: allowedProjectRegexes } },
    ],
  };
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$and = [{ $or: [{ name: q }, { description: q }, { projectCode: q }] }];
  }
  return filter;
};

const listProjects = async (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 200, 1), 200);
  const skip = (page - 1) * limit;
  const filter = projectFilter(query);
  const [items, total] = await Promise.all([
    Project.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name description projectCode logo status priority progress startDate endDate deadline budget projectManager teamMembers milestones technologies notes updatedAt')
      .lean(),
    Project.countDocuments(filter),
  ]);
  const dbKeys = new Set(items.flatMap((item) => [
    String(item.name || '').toLowerCase(),
    String(item.projectCode || '').toLowerCase(),
  ]).filter(Boolean));
  const registryItems = PROJECT_REGISTRY
    .filter((item) => !dbKeys.has(String(item.name || '').toLowerCase()) && !dbKeys.has(String(item.code || '').toLowerCase()))
    .map((item) => ({
      id: item.code,
      name: item.name,
      description: item.description,
      projectCode: item.code,
      status: 'in-progress',
      priority: 'medium',
      progress: 0,
      virtual: true,
    }));
  const allItems = [...items, ...registryItems];
  return {
    items: allItems.slice(skip, skip + limit),
    pagination: { page, limit, total: allItems.length, totalPages: Math.ceil(allItems.length / limit) || 1 },
  };
};

const baseProjectSummary = (project) => ({
  id: project?._id,
  name: project?.name || project?.projectCode || 'Project',
  description: project?.description || 'Project workspace.',
  code: project?.projectCode || '',
  status: project?.status || 'planning',
  priority: project?.priority || 'medium',
  progress: toNumber(project?.progress),
  logo: project?.logo || null,
  startDate: project?.startDate || null,
  endDate: project?.endDate || project?.deadline || null,
  technologies: Array.isArray(project?.technologies) ? project.technologies : [],
  notes: project?.notes || '',
  budget: project?.budget || {},
});

const getLawOverview = async (projectId) => {
  const scope = { projectId };
  const [records, contracts, pendingContracts, expiringSoon, disputes, recentRecords, recentContracts] = await Promise.all([
    Law.countDocuments(scope),
    LawContract.countDocuments(scope),
    LawContract.countDocuments({ ...scope, approvalStatus: { $in: ['pending', 'draft'] } }),
    LawContract.countDocuments({ ...scope, expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) } }),
    Law.countDocuments({ ...scope, section: { $in: ['cases', 'disputes-fraud'] } }),
    Law.find(scope).sort({ updatedAt: -1 }).limit(6).select('title section status priority updatedAt').lean(),
    LawContract.find(scope).sort({ updatedAt: -1 }).limit(6).select('title contractType status approvalStatus expiryDate updatedAt').lean(),
  ]);
  return {
    metrics: [
      { label: 'Legal Records', value: records, icon: 'description' },
      { label: 'Contracts', value: contracts, icon: 'contract' },
      { label: 'Pending Approval', value: pendingContracts, icon: 'pending_actions' },
      { label: 'Expiring Soon', value: expiringSoon, icon: 'event_busy' },
      { label: 'Disputes', value: disputes, icon: 'balance' },
    ],
    sections: [
      { title: 'Recent Legal Records', type: 'records', rows: recentRecords },
      { title: 'Recent Contracts', type: 'contracts', rows: recentContracts },
    ],
  };
};

const getItOverview = async (projectId) => {
  const scope = { projectId };
  const [assets, activeAssets, openTickets, criticalTickets, recentAssets, recentTickets] = await Promise.all([
    ITAsset.countDocuments(scope),
    ITAsset.countDocuments({ ...scope, status: 'active' }),
    ITTicket.countDocuments({ ...scope, status: { $in: ['open', 'in-progress'] } }),
    ITTicket.countDocuments({ ...scope, priority: 'critical', status: { $nin: ['resolved', 'closed'] } }),
    ITAsset.find(scope).sort({ updatedAt: -1 }).limit(6).select('name assetTag type status department updatedAt').lean(),
    ITTicket.find(scope).sort({ updatedAt: -1 }).limit(6).select('title priority status category updatedAt').lean(),
  ]);
  return {
    metrics: [
      { label: 'Assets', value: assets, icon: 'devices' },
      { label: 'Active Assets', value: activeAssets, icon: 'verified' },
      { label: 'Open Tickets', value: openTickets, icon: 'confirmation_number' },
      { label: 'Critical Tickets', value: criticalTickets, icon: 'priority_high' },
      { label: 'Health Score', value: `${Math.max(40, 100 - openTickets * 4 - criticalTickets * 8)}%`, icon: 'monitor_heart' },
    ],
    sections: [
      { title: 'Recent Assets', type: 'assets', rows: recentAssets },
      { title: 'Recent Tickets', type: 'tickets', rows: recentTickets },
    ],
  };
};

const getFinanceOverview = async (projectId) => {
  const scope = { projectId };
  const [invoices, payments, expenses, budgets, compliance, recentInvoices, recentExpenses, budgetRows] = await Promise.all([
    Invoice.find(scope).select('total status createdAt').lean(),
    Payment.find(scope).select('amount status createdAt').lean(),
    Expense.find(scope).select('amount status category createdAt').lean(),
    Budget.find(scope).select('allocated spent department fiscalYear status').lean(),
    Compliance.countDocuments(scope),
    Invoice.find(scope).sort({ updatedAt: -1 }).limit(6).select('invoiceNumber clientName total status dueDate updatedAt').lean(),
    Expense.find(scope).sort({ updatedAt: -1 }).limit(6).select('title category amount status updatedAt').lean(),
    Budget.find(scope).sort({ updatedAt: -1 }).limit(6).select('department allocated spent fiscalYear status updatedAt').lean(),
  ]);
  const allocated = sum(budgets, 'allocated');
  const spent = sum(budgets, 'spent') + sum(expenses, 'amount');
  return {
    metrics: [
      { label: 'Invoices', value: invoices.length, icon: 'receipt_long' },
      { label: 'Payments', value: payments.length, icon: 'payments' },
      { label: 'Expenses', value: fmtMoney(sum(expenses, 'amount')), icon: 'request_quote' },
      { label: 'Budget Used', value: `${pct(spent, allocated)}%`, icon: 'account_balance_wallet' },
      { label: 'Compliance Items', value: compliance, icon: 'verified' },
    ],
    sections: [
      { title: 'Recent Invoices', type: 'invoices', rows: recentInvoices },
      { title: 'Recent Expenses', type: 'expenses', rows: recentExpenses },
      { title: 'Budget Lines', type: 'budgets', rows: budgetRows },
    ],
  };
};

const getHrOverview = async (projectId) => {
  const scope = { projectId };
  const [attendance, leaves, reports, tasks, recentReports, recentTasks] = await Promise.all([
    Attendance.countDocuments(scope),
    Leave.countDocuments(scope),
    StaffWorkReport.countDocuments(scope),
    Task.countDocuments({ $or: [{ project: projectId }, { projectId }] }),
    StaffWorkReport.find(scope).sort({ updatedAt: -1 }).limit(6).select('title status employee date updatedAt').lean(),
    Task.find({ $or: [{ project: projectId }, { projectId }] }).sort({ updatedAt: -1 }).limit(6).select('title status priority dueDate updatedAt').lean(),
  ]);
  return {
    metrics: [
      { label: 'Attendance Rows', value: attendance, icon: 'calendar_month' },
      { label: 'Leave Requests', value: leaves, icon: 'event_note' },
      { label: 'Work Reports', value: reports, icon: 'assignment' },
      { label: 'HR Tasks', value: tasks, icon: 'task_alt' },
    ],
    sections: [
      { title: 'Recent Work Reports', type: 'workReports', rows: recentReports },
      { title: 'Recent HR Tasks', type: 'tasks', rows: recentTasks },
    ],
  };
};

const getManagerOverview = async (project, projectId) => {
  const teamSize = Array.isArray(project.teamMembers) ? project.teamMembers.length : 0;
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  const completed = milestones.filter((item) => item.status === 'completed').length;
  const tasks = await Task.find({ $or: [{ project: projectId }, { projectId }] }).sort({ updatedAt: -1 }).limit(8).select('title status priority dueDate updatedAt').lean();
  return {
    metrics: [
      { label: 'Progress', value: `${toNumber(project.progress)}%`, icon: 'trending_up' },
      { label: 'Team Members', value: teamSize, icon: 'group' },
      { label: 'Milestones', value: milestones.length, icon: 'flag' },
      { label: 'Completed Milestones', value: completed, icon: 'task_alt' },
      { label: 'Open Tasks', value: tasks.filter((task) => !['done', 'completed', 'closed'].includes(String(task.status).toLowerCase())).length, icon: 'pending_actions' },
    ],
    sections: [
      { title: 'Milestones', type: 'milestones', rows: milestones.slice(0, 8) },
      { title: 'Recent Tasks', type: 'tasks', rows: tasks },
    ],
  };
};

const getEmployeeOverview = async (req, projectId) => {
  const userId = objectId(req.user?.id || req.user?._id);
  const [employeeProjects, employeeTasks] = await Promise.all([
    EmployeeProject.find({ $or: [{ projectId }, { project: projectId }], ...(userId ? { employee: userId } : {}) }).sort({ updatedAt: -1 }).limit(6).lean(),
    EmployeeTask.find({ $or: [{ projectId }, { project: projectId }], ...(userId ? { employee: userId } : {}) }).sort({ updatedAt: -1 }).limit(8).lean(),
  ]);
  return {
    metrics: [
      { label: 'Assigned Project Rows', value: employeeProjects.length, icon: 'folder_open' },
      { label: 'Assigned Tasks', value: employeeTasks.length, icon: 'task_alt' },
      { label: 'Completed Tasks', value: employeeTasks.filter((task) => ['done', 'completed', 'closed'].includes(String(task.status).toLowerCase())).length, icon: 'check_circle' },
      { label: 'Pending Tasks', value: employeeTasks.filter((task) => !['done', 'completed', 'closed'].includes(String(task.status).toLowerCase())).length, icon: 'pending' },
    ],
    sections: [
      { title: 'My Project Rows', type: 'employeeProjects', rows: employeeProjects },
      { title: 'My Tasks', type: 'employeeTasks', rows: employeeTasks },
    ],
  };
};

const getEmptyPortalOverview = (portal, project = {}) => {
  const progress = toNumber(project.progress);
  const metricMap = {
    law: [
      { label: 'Legal Records', value: 0, icon: 'description' },
      { label: 'Contracts', value: 0, icon: 'contract' },
      { label: 'Pending Approval', value: 0, icon: 'pending_actions' },
      { label: 'Expiring Soon', value: 0, icon: 'event_busy' },
      { label: 'Disputes', value: 0, icon: 'balance' },
    ],
    it: [
      { label: 'Assets', value: 0, icon: 'devices' },
      { label: 'Active Assets', value: 0, icon: 'verified' },
      { label: 'Open Tickets', value: 0, icon: 'confirmation_number' },
      { label: 'Critical Tickets', value: 0, icon: 'priority_high' },
      { label: 'Health Score', value: '100%', icon: 'monitor_heart' },
    ],
    finance: [
      { label: 'Invoices', value: 0, icon: 'receipt_long' },
      { label: 'Payments', value: 0, icon: 'payments' },
      { label: 'Expenses', value: fmtMoney(0), icon: 'request_quote' },
      { label: 'Budget Used', value: '0%', icon: 'account_balance_wallet' },
      { label: 'Compliance Items', value: 0, icon: 'verified' },
    ],
    hr: [
      { label: 'Attendance Rows', value: 0, icon: 'calendar_month' },
      { label: 'Leave Requests', value: 0, icon: 'event_note' },
      { label: 'Work Reports', value: 0, icon: 'assignment' },
      { label: 'HR Tasks', value: 0, icon: 'task_alt' },
    ],
    employee: [
      { label: 'Assigned Project Rows', value: 0, icon: 'folder_open' },
      { label: 'Assigned Tasks', value: 0, icon: 'task_alt' },
      { label: 'Completed Tasks', value: 0, icon: 'check_circle' },
      { label: 'Pending Tasks', value: 0, icon: 'pending' },
    ],
    manager: [
      { label: 'Progress', value: `${progress}%`, icon: 'trending_up' },
      { label: 'Team Members', value: 0, icon: 'group' },
      { label: 'Milestones', value: 0, icon: 'flag' },
      { label: 'Completed Milestones', value: 0, icon: 'task_alt' },
      { label: 'Open Tasks', value: 0, icon: 'pending_actions' },
    ],
    sales: [
      { label: 'Progress', value: `${progress}%`, icon: 'trending_up' },
      { label: 'Milestones', value: 0, icon: 'flag' },
      { label: 'Open Tasks', value: 0, icon: 'pending_actions' },
    ],
  };
  return {
    metrics: metricMap[portal] || metricMap.manager,
    sections: [
      { title: 'Recent Work', type: 'recentWork', rows: [] },
      { title: 'Pending Items', type: 'pendingItems', rows: [] },
    ],
  };
};

const getPortalOverview = async (portal, project, req) => {
  const projectId = project._id;
  if (portal === 'law') return getLawOverview(projectId);
  if (portal === 'it') return getItOverview(projectId);
  if (portal === 'finance') return getFinanceOverview(projectId);
  if (portal === 'hr') return getHrOverview(projectId);
  if (portal === 'employee') return getEmployeeOverview(req, projectId);
  return getManagerOverview(project, projectId);
};

router.use(authenticate);
router.use(authorize(...READ_ONLY_PROJECT_ROLES));

router.get('/projects', async (req, res) => {
  try {
    const portal = resolvePortal(req);
    const data = await listProjects(req.query || {});
    res.json({ success: true, data: { ...data, portal, meta: PORTAL_META[portal] } });
  } catch (err) {
    req.log?.error?.({ err }, 'Project overview list error');
    res.status(500).json({ success: false, error: 'Failed to fetch project overview list' });
  }
});

router.get('/projects/:projectId/overview', async (req, res) => {
  try {
    const portal = resolvePortal(req);
    const rawId = String(req.params.projectId || '').trim();
    const id = objectId(rawId);
    const q = new RegExp(`^${rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const project = id
      ? await Project.findById(id).lean()
      : await Project.findOne({ $or: [{ projectCode: q }, { name: q }] }).lean();
    const registryProject = PROJECT_REGISTRY.find((item) => (
      String(item.code || '').toLowerCase() === rawId.toLowerCase() ||
      String(item.name || '').toLowerCase() === rawId.toLowerCase() ||
      (Array.isArray(item.aliases) && item.aliases.some((alias) => String(alias).toLowerCase() === rawId.toLowerCase()))
    ));
    const resolvedProject = project || (registryProject ? {
      _id: rawId,
      name: registryProject.name,
      description: registryProject.description,
      projectCode: registryProject.code,
      status: 'in-progress',
      priority: 'medium',
      progress: 0,
      virtual: true,
    } : null);
    if (!resolvedProject) return res.status(404).json({ success: false, error: 'Project not found' });
    const overview = project ? await getPortalOverview(portal, project, req) : getEmptyPortalOverview(portal, resolvedProject);
    res.json({
      success: true,
      data: {
        portal,
        meta: PORTAL_META[portal],
        project: baseProjectSummary(resolvedProject),
        ...overview,
      },
    });
  } catch (err) {
    req.log?.error?.({ err, projectId: req.params.projectId }, 'Project overview detail error');
    res.status(500).json({ success: false, error: 'Failed to fetch project overview detail' });
  }
});

module.exports = router;
