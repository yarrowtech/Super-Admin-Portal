const logger = require('../../utils/logger');
const AdminWorkflow = require('../../models/admin/AdminWorkflow');
const AdminSecuritySetting = require('../../models/admin/AdminSecuritySetting');
const AdminSecurityAlert = require('../../models/admin/AdminSecurityAlert');
const AdminCustomReport = require('../../models/admin/AdminCustomReport');

const DEPARTMENTS = [
  { name: 'Law', icon: 'gavel', description: 'Manage legal documents, compliance, and corporate policies.', route: '/law/dashboard' },
  { name: 'HR', icon: 'groups', description: 'Oversee employee records, recruitment, and payroll.', route: '/hr/dashboard' },
  { name: 'IT', icon: 'computer', description: 'Handle infrastructure, tech support, and system security.', route: '/it/dashboard' },
  { name: 'A/C & Finance', icon: 'account_balance', description: 'Manage budgets, financial reporting, and accounting tasks.', route: '/finance/dashboard' },
  { name: 'System Operator', icon: 'lan', description: 'Control and maintain core operational systems and networks.' },
  { name: 'Research', icon: 'science', description: 'Drive innovation, product development, and market analysis.' },
  { name: 'A/C Sales & Growth', icon: 'trending_up', description: 'Focus on client acquisition, sales strategies, and revenue growth.', route: '/sales/dashboard' },
  { name: 'Media', icon: 'perm_media', description: 'Create and manage marketing campaigns and brand presence.', route: '/media/dashboard' },
  { name: 'Research Operator', icon: 'manage_history', description: 'Facilitate research operations and data management.', route: '/research/dashboard' },
];

const PREDEFINED_REPORTS = [
  { icon: 'monitoring', title: 'User Activity', description: 'Logins, signups, and feature usage.' },
  { icon: 'article', title: 'Content Statistics', description: 'Views, shares, and engagement rates.' },
  { icon: 'payments', title: 'Financial Summaries', description: 'Revenue, expenses, and profit margins.' },
  { icon: 'dns', title: 'System Performance', description: 'Uptime, response times, and errors.' },
];

const ensureDefaults = async () => {
  const [workflowCount, settingsCount, alertCount, reportsCount] = await Promise.all([
    AdminWorkflow.countDocuments(),
    AdminSecuritySetting.countDocuments(),
    AdminSecurityAlert.countDocuments(),
    AdminCustomReport.countDocuments(),
  ]);

  if (workflowCount === 0) {
    await AdminWorkflow.insertMany([
      { name: 'Invoice Processing', description: 'Automates invoice validation and approval.', status: 'Active', lastRun: '2024-05-20 14:30 UTC', trigger: 'On new invoice', owner: 'Admin' },
      { name: 'User Onboarding', description: 'Sends welcome emails and sets up new accounts.', status: 'Active', lastRun: '2024-05-20 11:15 UTC', trigger: 'On user signup', owner: 'Admin' },
      { name: 'Hiring Approvals', description: 'Multi-step approval for new job requisitions.', status: 'Paused', lastRun: '2024-05-18 09:00 UTC', trigger: 'Manual trigger', owner: 'Admin' },
    ]);
  }

  if (settingsCount === 0) {
    await AdminSecuritySetting.insertMany([
      { key: 'security.2fa', title: 'Two-Factor Authentication (2FA)', description: 'Require all users to enable 2FA.', type: 'switch', enabled: true },
      { key: 'security.passwordPolicy', title: 'Password Policy', description: 'Enforce strong password rules.', type: 'button', actionLabel: 'Configure' },
      { key: 'security.sessionTimeout', title: 'Session Timeout', description: 'Auto-logout after inactivity.', type: 'button', actionLabel: 'Set Duration' },
    ]);
  }

  if (alertCount === 0) {
    await AdminSecurityAlert.insertMany([
      { icon: 'warning', severity: 'high', text: "Multiple failed login attempts for 'admin'.", timeLabel: '15 minutes ago' },
      { icon: 'new_releases', severity: 'medium', text: "Unusual login location detected for 'john.doe'.", timeLabel: '2 hours ago' },
      { icon: 'verified_user', severity: 'low', text: "Administrator role granted to 'sara.c'.", timeLabel: '1 day ago' },
    ]);
  }

  if (reportsCount === 0) {
    await AdminCustomReport.insertMany([
      { name: 'Q4 Financial Summary', reportType: 'Financial Summary', department: 'Finance', status: 'Completed', generatedOn: '2024-01-15' },
      { name: 'Monthly User Signup', reportType: 'User Activity', department: 'All Departments', status: 'Completed', generatedOn: '2024-02-01' },
      { name: 'Content Performance Q1', reportType: 'Content Statistics', department: 'Media', status: 'Processing', generatedOn: '2024-03-05' },
    ]);
  }
};

exports.getDepartmentsOverview = async (req, res) => {
  try {
    const q = (req.query.search || '').toLowerCase().trim();
    const data = q
      ? DEPARTMENTS.filter((d) => `${d.name} ${d.description}`.toLowerCase().includes(q))
      : DEPARTMENTS;
    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load departments overview');
    return res.status(500).json({ success: false, error: 'Failed to load departments overview' });
  }
};

exports.getSecurityOverview = async (req, res) => {
  try {
    await ensureDefaults();
    const [settings, alerts] = await Promise.all([
      AdminSecuritySetting.find().sort({ title: 1 }),
      AdminSecurityAlert.find().sort({ createdAt: -1 }).limit(20),
    ]);
    return res.status(200).json({
      success: true,
      data: {
        tabs: ['Role-Based Access', 'Audit Logs', 'Security Alerts', 'Incident Management', 'Integrations'],
        settings,
        alerts,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load security overview');
    return res.status(500).json({ success: false, error: 'Failed to load security overview' });
  }
};

exports.updateSecuritySetting = async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body || {};
    const updated = await AdminSecuritySetting.findByIdAndUpdate(id, { enabled: Boolean(enabled) }, { new: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Setting not found' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update security setting');
    return res.status(500).json({ success: false, error: 'Failed to update security setting' });
  }
};

exports.getReportsOverview = async (req, res) => {
  try {
    await ensureDefaults();
    const { status, reportType, department, from, to } = req.query;
    const query = {};
    if (status && status !== 'All') query.status = status;
    if (reportType && reportType !== 'All') query.reportType = reportType;
    if (department && department !== 'All Departments') query.department = department;
    if (from || to) {
      query.generatedOn = {};
      if (from) query.generatedOn.$gte = String(from);
      if (to) query.generatedOn.$lte = String(to);
    }

    const [customReports, totalCount, completedCount, processingCount] = await Promise.all([
      AdminCustomReport.find(query).sort({ createdAt: -1 }).limit(50),
      AdminCustomReport.countDocuments(query),
      AdminCustomReport.countDocuments({ ...query, status: 'Completed' }),
      AdminCustomReport.countDocuments({ ...query, status: 'Processing' }),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const generatedToday = await AdminCustomReport.countDocuments({ ...query, createdAt: { $gte: startOfToday } });

    return res.status(200).json({
      success: true,
      data: {
        predefinedReports: PREDEFINED_REPORTS,
        customReports,
        stats: { totalCount, completedCount, processingCount, generatedToday },
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to load reports overview');
    return res.status(500).json({ success: false, error: 'Failed to load reports overview' });
  }
};

exports.createCustomReport = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name) return res.status(400).json({ success: false, error: 'Report name is required' });
    const created = await AdminCustomReport.create({
      name: payload.name,
      reportType: payload.reportType || 'User Activity',
      department: payload.department || 'All Departments',
      status: payload.status || 'Processing',
      generatedOn: payload.generatedOn || new Date().toISOString().slice(0, 10),
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create custom report');
    return res.status(500).json({ success: false, error: 'Failed to create custom report' });
  }
};

exports.listWorkflows = async (req, res) => {
  try {
    await ensureDefaults();
    const q = (req.query.search || '').trim();
    const status = req.query.status;
    const query = {};
    if (q) query.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }, { owner: { $regex: q, $options: 'i' } }];
    if (status && status !== 'All') query.status = status;
    const rows = await AdminWorkflow.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list workflows');
    return res.status(500).json({ success: false, error: 'Failed to list workflows' });
  }
};

exports.createWorkflow = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.name) return res.status(400).json({ success: false, error: 'Workflow name is required' });
    const created = await AdminWorkflow.create({
      name: payload.name,
      description: payload.description || 'Custom workflow',
      status: payload.status || 'Active',
      lastRun: payload.lastRun || 'Not run',
      trigger: payload.trigger || 'Manual trigger',
      owner: payload.owner || 'Admin',
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    logger.error({ err: error }, 'Failed to create workflow');
    return res.status(500).json({ success: false, error: 'Failed to create workflow' });
  }
};

exports.updateWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const updated = await AdminWorkflow.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, error: 'Workflow not found' });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update workflow');
    return res.status(500).json({ success: false, error: 'Failed to update workflow' });
  }
};

exports.deleteWorkflow = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await AdminWorkflow.findByIdAndDelete(id);
    if (!removed) return res.status(404).json({ success: false, error: 'Workflow not found' });
    return res.status(200).json({ success: true, message: 'Workflow deleted' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete workflow');
    return res.status(500).json({ success: false, error: 'Failed to delete workflow' });
  }
};
