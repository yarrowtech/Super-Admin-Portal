const mongoose = require('mongoose');
const Invoice = require('../../models/finance/Invoice');
const InvoiceNote = require('../../models/finance/InvoiceNote');
const Payment = require('../../models/finance/Payment');
const Expense = require('../../models/finance/Expense');
const Budget = require('../../models/finance/Budget');
const CostCenter = require('../../models/finance/CostCenter');
const Payroll = require('../../models/finance/Payroll');
const FinancialReport = require('../../models/finance/FinancialReport');
const FinancialPeriod = require('../../models/finance/FinancialPeriod');
const ComplianceRecord = require('../../models/finance/Compliance');
const Vendor = require('../../models/finance/Vendor');
const Client = require('../../models/finance/Client');
const Account = require('../../models/finance/Account');
const JournalEntry = require('../../models/finance/JournalEntry');
const AuditLog = require('../../models/finance/AuditLog');
const ApprovalWorkflow = require('../../models/finance/ApprovalWorkflow');
const Department = require('../../models/department/Department');
const { getFinanceStatusThresholds } = require('../../config/financeThresholds');

const FINANCE_HEAD_ROLES = new Set(['finance_manager', 'admin', 'super_admin']);
const FINANCE_EMPLOYEE_ROLES = new Set(['finance_employee']);
const FINANCE_OPERATOR_ROLES = new Set(['finance_employee', 'finance_manager', 'admin', 'super_admin']);
const FINANCE_REQUEST_ACTIONS = {
  review: { from: ['submitted', 'pending'], to: 'under_review', roles: FINANCE_OPERATOR_ROLES },
  request_information: { from: ['submitted', 'pending', 'under_review', 'verified', 'pending_approval'], to: 'needs_information', roles: FINANCE_OPERATOR_ROLES },
  verify: { from: ['submitted', 'pending', 'under_review', 'needs_information'], to: 'verified', roles: FINANCE_OPERATOR_ROLES },
  send_for_approval: { from: ['verified'], to: 'pending_approval', roles: FINANCE_OPERATOR_ROLES },
  approve: { from: ['verified', 'pending_approval'], to: 'approved', roles: FINANCE_HEAD_ROLES },
  reject: { from: ['submitted', 'under_review', 'needs_information', 'verified', 'pending_approval'], to: 'rejected', roles: FINANCE_HEAD_ROLES },
  process: { from: ['approved'], to: 'processing', roles: FINANCE_OPERATOR_ROLES },
  complete: { from: ['processing'], to: 'completed', roles: FINANCE_OPERATOR_ROLES },
  cancel: { from: ['draft', 'submitted', 'under_review', 'needs_information'], to: 'cancelled', roles: FINANCE_HEAD_ROLES },
};

const buildInvoiceNumber = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${stamp}-${rand}`;
};

const buildEntryNumber = () => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `JE-${stamp}-${rand}`;
};

const normalizeInvoiceItems = (items = []) => {
  const sanitized = Array.isArray(items) ? items : [];
  return sanitized.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const amount = Number(item.amount) || quantity * rate;
    const taxRate = Number(item.taxRate) || 0;
    const taxAmount = Number(item.taxAmount) || (amount * taxRate) / 100;
    return {
      description: item.description,
      quantity,
      rate,
      amount,
      taxRate,
      taxAmount
    };
  });
};

const calculateInvoiceTotals = (items, discount = 0, gstRate = 0, tdsRate = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const taxTotal = items.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
  const safeDiscount = Number(discount) || 0;
  const safeGstRate = Number(gstRate) || 0;
  const safeTdsRate = Number(tdsRate) || 0;
  const gstAmount = safeGstRate ? (subtotal * safeGstRate) / 100 : taxTotal;
  const tdsAmount = safeTdsRate ? (subtotal * safeTdsRate) / 100 : 0;
  const total = subtotal + gstAmount - tdsAmount - safeDiscount;
  return { subtotal, taxTotal, gstAmount, tdsAmount, discount: safeDiscount, total };
};

const deriveBudgetStatus = (allocated, spent) => {
  const safeAllocated = Number(allocated) || 0;
  const safeSpent = Number(spent) || 0;
  if (!safeAllocated) return { utilization: 0, status: 'on-track' };
  const utilization = (safeSpent / safeAllocated) * 100;
  if (utilization > 100) return { utilization, status: 'over' };
  if (utilization >= 85) return { utilization, status: 'at-risk' };
  return { utilization, status: 'on-track' };
};

// Resolves a request's department reference (by `departmentId` or a legacy free-text
// `department`/`costCenter`/`name` string) against the canonical Department collection, and
// returns both the real ref and the display name so callers can dual-write the deprecated
// string field alongside it during the migration window.
const resolveDepartmentFields = async (payload = {}) => {
  const rawId = payload.departmentId;
  if (rawId && mongoose.Types.ObjectId.isValid(rawId)) {
    const dept = await Department.findById(rawId).select('name').lean();
    if (dept) return { departmentId: dept._id, department: dept.name };
  }
  const rawName = String(payload.department || payload.costCenter || payload.name || '').trim();
  if (rawName) {
    const dept = await Department.findOne({
      $or: [
        { name: new RegExp(`^${rawName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        { code: rawName.toUpperCase() },
      ],
    }).select('name').lean();
    if (dept) return { departmentId: dept._id, department: dept.name };
  }
  return { departmentId: null, department: rawName || 'General' };
};

const normalizeExpensePayload = async (payload = {}) => {
  const { departmentId, department } = await resolveDepartmentFields(payload);
  return {
    title: payload.title || payload.description || payload.name || 'Expense Entry',
    category: payload.category || 'general',
    amount: Number(payload.amount) || 0,
    department,
    departmentId,
    incurredDate: payload.incurredDate || payload.date || new Date(),
    notes: payload.notes || ''
  };
};

const normalizeBudgetPayload = async (payload = {}) => {
  const { departmentId, department } = await resolveDepartmentFields(payload);
  return {
    department,
    departmentId,
    fiscalYear: payload.fiscalYear || payload.year || String(new Date().getFullYear()),
    allocated: Number(payload.allocated ?? payload.allocatedAmount) || 0,
    spent: Number(payload.spent ?? payload.spentAmount) || 0,
    notes: payload.notes || ''
  };
};

const normalizePayrollPayload = (payload = {}) => {
  const year = Number(payload.year) || new Date().getFullYear();
  const monthName = String(payload.month || '').trim();
  const monthIndex = monthName
    ? Math.max(
        ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].findIndex((m) =>
          monthName.toLowerCase().startsWith(m)
        ),
        0
      )
    : new Date().getMonth();
  const periodStart = payload.periodStart || new Date(year, monthIndex, 1);
  const periodEnd = payload.periodEnd || new Date(year, monthIndex + 1, 0);
  const grossPay = Number(payload.grossPay ?? payload.baseSalary) || 0;
  const deductions = Number(payload.deductions) || 0;
  const allowances = Number(payload.allowances) || 0;
  const computedGross = grossPay + allowances;
  const netPay =
    payload.netPay !== undefined ? Number(payload.netPay) : Math.max(computedGross - deductions, 0);

  return {
    employee: payload.employee,
    employeeName: payload.employeeName || payload.name || 'Employee',
    periodStart,
    periodEnd,
    grossPay: computedGross,
    deductions,
    netPay,
    status: payload.status || 'draft',
    notes: payload.notes || ''
  };
};

const sendError = (res, err, fallback) => {
  res.status(500).json({
    success: false,
    error: fallback,
    details: err.message
  });
};

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const logAudit = async ({ req, action, resourceType, resourceId, meta = {}, riskFlag = 'none' }) => {
  try {
    await AuditLog.create({
      actor: req.user?.id,
      actorRole: req.user?.role || '',
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : '',
      meta,
      riskFlag,
    });
  } catch {
    // non-blocking
  }
};

const normalizeJournalLines = (lines = []) => {
  const sanitized = Array.isArray(lines) ? lines : [];
  return sanitized.map((line) => ({
    account: line.account,
    description: line.description,
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0
  }));
};

const calculateJournalTotals = (lines = []) => {
  return lines.reduce(
    (acc, line) => {
      acc.totalDebit += Number(line.debit) || 0;
      acc.totalCredit += Number(line.credit) || 0;
      return acc;
    },
    { totalDebit: 0, totalCredit: 0 }
  );
};

const assertBalancedJournal = (lines = []) => {
  const totals = calculateJournalTotals(lines);
  if (!lines.length) {
    const err = new Error('Journal entry requires at least one line');
    err.statusCode = 400;
    throw err;
  }
  if (Math.abs(totals.totalDebit - totals.totalCredit) > 0.005) {
    const err = new Error('Journal entry is unbalanced: total debit must equal total credit');
    err.statusCode = 422;
    throw err;
  }
  return totals;
};

const buildDepartmentQuery = async (department) => {
  const raw = String(department || '').trim();
  if (!raw) return {};
  if (mongoose.Types.ObjectId.isValid(raw)) return { departmentId: raw };
  const resolved = await Department.findOne({
    $or: [
      { name: new RegExp(`^${raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { code: raw.toUpperCase() },
    ],
  }).select('_id name').lean();
  if (!resolved) return { department: raw };
  return { $or: [{ departmentId: resolved._id }, { department: resolved.name }] };
};

const assertPositiveMoney = (value, label = 'amount') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const err = new Error(`${label} must be greater than zero`);
    err.statusCode = 422;
    throw err;
  }
  return numeric;
};

const assertOpenFinancialPeriod = async (financialPeriodId) => {
  if (!financialPeriodId) return null;
  if (!mongoose.Types.ObjectId.isValid(financialPeriodId)) {
    const err = new Error('Invalid financial period');
    err.statusCode = 400;
    throw err;
  }
  const period = await FinancialPeriod.findById(financialPeriodId).lean();
  if (!period) {
    const err = new Error('Financial period not found');
    err.statusCode = 404;
    throw err;
  }
  if (period.isClosed) {
    const err = new Error('Financial period is closed');
    err.statusCode = 409;
    throw err;
  }
  return period;
};

const findActiveBudget = async ({ departmentId, fiscalYear }) => {
  if (!departmentId) return null;
  const query = { departmentId };
  if (fiscalYear) query.fiscalYear = fiscalYear;
  return Budget.findOne(query).sort({ createdAt: -1 });
};

const getBudgetSnapshot = async ({ departmentId, fiscalYear, excludeExpenseId } = {}) => {
  const budget = await findActiveBudget({ departmentId, fiscalYear });
  if (!budget) return null;
  const expenseQuery = {
    departmentId: budget.departmentId,
    ...(excludeExpenseId ? { _id: { $ne: excludeExpenseId } } : {}),
  };
  const expenses = await Expense.find(expenseQuery).select('amount status budgetId').lean();
  const spentStatuses = new Set(['completed', 'paid']);
  const reservedStatuses = new Set(['submitted', 'pending', 'under_review', 'needs_information', 'verified', 'pending_approval', 'approved', 'processing']);
  const actualSpent = expenses
    .filter((expense) => spentStatuses.has(String(expense.status || '').toLowerCase()))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const reserved = expenses
    .filter((expense) => reservedStatuses.has(String(expense.status || '').toLowerCase()))
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const allocated = Number(budget.allocated || 0);
  const spent = Math.max(Number(budget.spent || 0), actualSpent);
  const available = allocated - spent - reserved;
  return { budget, allocated, spent, reserved, available };
};

const assertBudgetAvailable = async ({ departmentId, amount, fiscalYear, excludeExpenseId }) => {
  if (!departmentId) return null;
  const snapshot = await getBudgetSnapshot({ departmentId, fiscalYear, excludeExpenseId });
  if (!snapshot) {
    const err = new Error('No department budget is available for this financial transaction');
    err.statusCode = 409;
    throw err;
  }
  if (Number(amount || 0) > snapshot.available) {
    const err = new Error('Insufficient available budget');
    err.statusCode = 409;
    err.details = {
      allocated: snapshot.allocated,
      spent: snapshot.spent,
      reserved: snapshot.reserved,
      available: snapshot.available,
      requested: Number(amount || 0),
    };
    throw err;
  }
  return snapshot;
};

const getAmountFromInvoice = (invoice) => Number(invoice.total ?? invoice.amount ?? invoice.totalAmount ?? 0) || 0;
const getBalanceFromInvoice = (invoice) => {
  const explicit = Number(invoice.balanceDue);
  if (!Number.isNaN(explicit) && explicit >= 0) return explicit;
  return Math.max(getAmountFromInvoice(invoice) - (Number(invoice.amountPaid) || 0), 0);
};

const percentChange = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (!before && !now) return 0;
  if (!before) return null;
  return ((now - before) / Math.abs(before)) * 100;
};

const buildKpi = (label, value, previousValue, drillDown) => {
  const change = percentChange(value, previousValue);
  return {
    label,
    value,
    previousValue,
    changePercent: change === null ? null : Number(change.toFixed(1)),
    comparisonAvailable: change !== null,
    trend: value >= previousValue ? 'up' : 'down',
    drillDown,
  };
};

const getCurrentAndPreviousRanges = () => {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  return { currentStart, previousStart, previousEnd };
};

const deriveDepartmentStatus = (utilization, remaining) => {
  if (remaining < 0) return 'over-budget';
  const t = getFinanceStatusThresholds();
  if (utilization >= t.CRITICAL) return 'critical';
  if (utilization >= t.WARNING) return 'warning';
  if (utilization >= t.WATCH) return 'watch';
  return 'healthy';
};

const aggregateById = (rows = []) => new Map(rows.map((row) => [String(row._id), row]));

// Real Mongo aggregation grouped by `departmentId`, replacing the old pattern of pulling
// full Invoice/Expense/Payment/Budget collections into Node and filtering them per entry of
// a hardcoded department array. Every ACTIVE department gets a row (including zero-activity
// ones), so a brand-new department shows up automatically with no code change.
const computeDepartmentFinancials = async () => {
  const [budgetAgg, expenseAgg, invoiceAgg, paymentAgg, approvalAgg, departments] = await Promise.all([
    Budget.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: { _id: '$departmentId', allocated: { $sum: '$allocated' }, budgetSpent: { $sum: '$spent' } } },
    ]),
    Expense.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: {
          _id: '$departmentId',
          spent: { $sum: '$amount' },
          reserved: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'verified']] }, '$amount', 0] } },
          pendingRequests: { $sum: { $cond: [{ $in: ['$status', ['submitted', 'pending']] }, 1, 0] } },
          expenseCount: { $sum: 1 },
      } },
    ]),
    Invoice.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: {
          _id: '$departmentId',
          outstandingInvoices: { $sum: { $cond: [{ $in: ['$status', ['draft', 'sent', 'overdue']] }, 1, 0] } },
          invoiceCount: { $sum: 1 },
      } },
    ]),
    Payment.aggregate([
      { $match: { departmentId: { $ne: null } } },
      { $group: {
          _id: '$departmentId',
          pendingPayments: { $sum: { $cond: [{ $ne: ['$status', 'reconciled'] }, 1, 0] } },
          paymentCount: { $sum: 1 },
      } },
    ]),
    ApprovalWorkflow.aggregate([
      { $match: { module: 'finance', entityType: 'expense', status: 'pending', entityId: { $regex: /^[0-9a-fA-F]{24}$/ } } },
      { $addFields: { entityObjectId: { $toObjectId: '$entityId' } } },
      { $lookup: { from: 'financeexpenses', localField: 'entityObjectId', foreignField: '_id', as: 'expense' } },
      { $unwind: '$expense' },
      { $match: { 'expense.departmentId': { $ne: null } } },
      { $group: { _id: '$expense.departmentId', pendingApprovals: { $sum: 1 } } },
    ]),
    Department.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
  ]);

  const budgetMap = aggregateById(budgetAgg);
  const expenseMap = aggregateById(expenseAgg);
  const invoiceMap = aggregateById(invoiceAgg);
  const paymentMap = aggregateById(paymentAgg);
  const approvalMap = aggregateById(approvalAgg);

  return departments.map((dept) => {
    const id = String(dept._id);
    const b = budgetMap.get(id) || {};
    const e = expenseMap.get(id) || {};
    const inv = invoiceMap.get(id) || {};
    const pay = paymentMap.get(id) || {};
    const appr = approvalMap.get(id) || {};

    const allocated = b.allocated || 0;
    const used = Math.max(e.spent || 0, b.budgetSpent || 0);
    const reserved = e.reserved || 0;
    const remaining = allocated - used - reserved;
    const utilization = allocated > 0 ? Number(((used / allocated) * 100).toFixed(1)) : 0;

    return {
      departmentId: id,
      code: dept.code,
      department: dept.name,
      budget: allocated,
      spent: used,
      reserved,
      remaining,
      utilization,
      pendingRequests: e.pendingRequests || 0,
      pendingApprovals: appr.pendingApprovals || 0,
      pendingInvoices: inv.outstandingInvoices || 0,
      pendingPayments: pay.pendingPayments || 0,
      expenseCount: e.expenseCount || 0,
      invoiceCount: inv.invoiceCount || 0,
      paymentCount: pay.paymentCount || 0,
      status: deriveDepartmentStatus(utilization, remaining),
    };
  });
};

const buildFinanceRequests = ({ expenses = [], approvals = [] }) => {
  const approvalByEntity = new Map(
    approvals.map((approval) => [`${approval.entityType}:${approval.entityId}`, approval])
  );
  return expenses.map((item) => {
    const amount = Number(item.amount) || 0;
    const approval = approvalByEntity.get(`expense:${String(item._id)}`);
    const status = approval?.status === 'pending' && item.status === 'verified' ? 'pending_approval' : item.status;
    return {
      id: String(item._id),
      requestId: `REQ-${String(item._id).slice(-6).toUpperCase()}`,
      source: 'department',
      department: item.department || 'Unassigned',
      departmentId: item.departmentId ? String(item.departmentId) : null,
      requester: item.submittedBy || 'Department user',
      employeeId: '',
      type: item.category === 'reimbursement' ? 'Reimbursement' : 'Expense',
      amount,
      tax: 0,
      total: amount,
      category: item.category || 'Operations',
      priority: amount >= 500000 ? 'Critical' : amount >= 50000 ? 'High' : 'Normal',
      submittedDate: item.createdAt,
      dueDate: item.incurredDate,
      status,
      assignedEmployee: item.verifiedBy ? 'Finance Operations' : 'Unassigned',
      approvalRequired: amount >= 10000,
      approvalId: approval?._id ? String(approval._id) : '',
      documents: item.documents || [],
      budgetCategory: item.category || 'Operations',
      availableBudget: 0,
      reservedAmount: ['submitted', 'verified'].includes(String(item.status || '').toLowerCase()) ? amount : 0,
    };
  });
};

const ensureFinanceRequestActionAllowed = ({ action, status, role }) => {
  const rule = FINANCE_REQUEST_ACTIONS[action];
  if (!rule) {
    const err = new Error('Invalid finance request action');
    err.statusCode = 400;
    throw err;
  }
  const normalizedRole = String(role || '').toLowerCase();
  if (!rule.roles.has(normalizedRole)) {
    const err = new Error('Role cannot perform this finance request action');
    err.statusCode = 403;
    throw err;
  }
  if (!rule.from.includes(String(status || '').toLowerCase())) {
    const err = new Error(`Invalid transition from ${status} using ${action}`);
    err.statusCode = 409;
    throw err;
  }
  return rule;
};

const findOrCreateFinanceApproval = async ({ expense, requestedBy }) => {
  const existing = await ApprovalWorkflow.findOne({
    module: 'finance',
    entityType: 'expense',
    entityId: String(expense._id),
    status: 'pending',
  });
  if (existing) return existing;
  return ApprovalWorkflow.create({
    module: 'finance',
    entityType: 'expense',
    entityId: String(expense._id),
    requestedBy,
    status: 'pending',
    steps: [{ level: 1, role: 'finance_manager', status: 'pending', optional: false }],
  });
};

const transitionFinanceRequest = async ({ req, requestId, action, comment = '' }) => {
  const expense = await Expense.findById(requestId);
  if (!expense) {
    const err = new Error('Finance request not found');
    err.statusCode = 404;
    throw err;
  }

  const previousStatus = String(expense.status || 'submitted').toLowerCase();
  const role = String(req.user?.role || '').toLowerCase();
  const rule = ensureFinanceRequestActionAllowed({ action, status: previousStatus, role });

  if (action === 'send_for_approval' && Number(expense.amount || 0) < 10000) {
    const err = new Error('Approval is not required below the configured threshold');
    err.statusCode = 409;
    throw err;
  }

  if (action === 'approve') {
    const workflow = await ApprovalWorkflow.findOne({
      module: 'finance',
      entityType: 'expense',
      entityId: String(expense._id),
      status: 'pending',
    });
    if (workflow) {
      if (String(workflow.requestedBy || '') === String(req.user?.id || '')) {
        const err = new Error('Users cannot approve their own finance requests');
        err.statusCode = 403;
        throw err;
      }
      const pendingStep = workflow.steps.find((step) => step.status === 'pending' && ['finance_manager', 'admin', 'super_admin'].includes(String(step.role || '').toLowerCase()));
      if (pendingStep) {
        pendingStep.status = 'approved';
        pendingStep.decidedBy = req.user?.id;
        pendingStep.decidedAt = new Date();
        pendingStep.remarks = comment;
      }
      workflow.status = workflow.steps.some((step) => step.status === 'pending' && !step.optional) ? 'pending' : 'approved';
      await workflow.save();
    }
  }

  if (action === 'reject') {
    await ApprovalWorkflow.updateMany(
      { module: 'finance', entityType: 'expense', entityId: String(expense._id), status: 'pending' },
      { $set: { status: 'rejected' } }
    );
  }

  expense.status = rule.to;
  if (action === 'review') expense.reviewedBy = req.user?.id;
  if (action === 'verify') expense.verifiedBy = req.user?.id;
  if (action === 'approve') expense.approvedBy = req.user?.id;
  if (action === 'process' || action === 'complete') expense.processedBy = req.user?.id;
  if (action === 'request_information') expense.requestedInfo = comment;
  if (['reject', 'cancel'].includes(action)) {
    expense.budgetReleasedAt = new Date();
  }
  if (action === 'complete' && !expense.budgetConsumedAt) {
    expense.budgetConsumedAt = new Date();
    if (expense.budgetId) {
      await Budget.findByIdAndUpdate(expense.budgetId, { $inc: { spent: Number(expense.amount || 0) } });
    }
  }
  expense.statusHistory.push({
    from: previousStatus,
    to: rule.to,
    action,
    comment,
    actor: req.user?.id,
    actorRole: req.user?.role || '',
    at: new Date(),
  });

  let workflow = null;
  if (action === 'send_for_approval') {
    workflow = await findOrCreateFinanceApproval({ expense, requestedBy: req.user?.id });
  }

  await expense.save();
  await logAudit({
    req,
    action: `finance_request_${action}`,
    resourceType: 'finance_request',
    resourceId: expense._id,
    meta: {
      from: previousStatus,
      to: rule.to,
      department: expense.department,
      departmentId: expense.departmentId ? String(expense.departmentId) : null,
      budgetId: expense.budgetId ? String(expense.budgetId) : null,
      amount: expense.amount,
      comment,
      workflowId: workflow?._id,
      budgetReleasedAt: expense.budgetReleasedAt,
      budgetConsumedAt: expense.budgetConsumedAt,
    },
    riskFlag: ['approve', 'reject', 'cancel'].includes(action) ? 'medium' : 'none',
  });

  return { request: expense, workflow };
};

const fetchPostedLines = async () => {
  const entries = await JournalEntry.find({ status: 'posted' }).populate(
    'lines.account',
    'code name type normalBalance'
  );
  const lines = [];
  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      if (line.account) {
        lines.push({ ...line.toObject(), account: line.account.toObject() });
      }
    });
  });
  return lines;
};

/**
 * Dashboard
 */
exports.getDashboard = async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isFinanceHead = FINANCE_HEAD_ROLES.has(role);
    const isFinanceEmployee = FINANCE_EMPLOYEE_ROLES.has(role);
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousRanges();

    const [
      invoices,
      expenses,
      payments,
      budgets,
      payrollCount,
      accountCount,
      journalCount,
      pendingApprovals,
      auditLogs
    ] = await Promise.all([
      Invoice.find().sort({ createdAt: -1 }).lean(),
      Expense.find().sort({ createdAt: -1 }).lean(),
      Payment.find().sort({ paymentDate: -1 }).lean(),
      Budget.find().sort({ createdAt: -1 }).lean(),
      Payroll.countDocuments(),
      Account.countDocuments(),
      JournalEntry.countDocuments(),
      ApprovalWorkflow.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(10).lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const currentInvoices = invoices.filter((item) => new Date(item.createdAt || item.issueDate || 0) >= currentStart);
    const previousInvoices = invoices.filter((item) => {
      const createdAt = new Date(item.createdAt || item.issueDate || 0);
      return createdAt >= previousStart && createdAt < previousEnd;
    });
    const currentExpenses = expenses.filter((item) => new Date(item.createdAt || item.incurredDate || 0) >= currentStart);
    const previousExpenses = expenses.filter((item) => {
      const createdAt = new Date(item.createdAt || item.incurredDate || 0);
      return createdAt >= previousStart && createdAt < previousEnd;
    });

    const totalReceivables = invoices.reduce((sum, item) => sum + getBalanceFromInvoice(item), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalBudget = budgets.reduce((sum, item) => sum + (Number(item.allocated) || 0), 0);
    const usedBudget = budgets.reduce((sum, item) => sum + (Number(item.spent) || 0), 0);
    const pendingExpenseAmount = expenses
      .filter((item) => ['submitted', 'pending', 'under_review'].includes(String(item.status || '').toLowerCase()))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const pendingPaymentAmount = payments
      .filter((item) => ['recorded', 'pending', 'verification', 'scheduled', 'processing'].includes(String(item.status || '').toLowerCase()))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const currentRevenue = currentInvoices.reduce((sum, item) => sum + getAmountFromInvoice(item), 0);
    const previousRevenue = previousInvoices.reduce((sum, item) => sum + getAmountFromInvoice(item), 0);
    const currentSpend = currentExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const previousSpend = previousExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    const departmentFinancials = await computeDepartmentFinancials();

    const financeRequests = buildFinanceRequests({ expenses, approvals: pendingApprovals });
    const pendingRequests = financeRequests
      .filter((item) => ['submitted', 'pending', 'verified', 'pending_approval'].includes(String(item.status || '').toLowerCase()))
      .slice(0, 8)
      .map((item) => ({ ...item, assignedTo: isFinanceEmployee ? 'My queue' : 'Finance Operations' }));

    const approvalQueue = pendingApprovals.map((item) => ({
      id: String(item._id),
      requestId: `${String(item.entityType || 'REQ').toUpperCase()}-${String(item.entityId || item._id).slice(-6).toUpperCase()}`,
      department: item.department || 'Finance',
      amount: Number(item.amount || item.meta?.amount || 0),
      type: item.entityType,
      risk: Number(item.amount || item.meta?.amount || 0) >= 500000 ? 'High' : 'Medium',
      budgetImpact: item.meta?.budgetImpact || 'Reservation required',
      submittedAt: item.createdAt,
      waitingSince: item.updatedAt || item.createdAt,
      canApprove: isFinanceHead,
    }));

    const paymentQueue = payments
      .filter((item) => item.status !== 'reconciled')
      .slice(0, 8)
      .map((item) => ({
        id: String(item._id),
        paymentId: `PAY-${String(item._id).slice(-6).toUpperCase()}`,
        payee: item.customerName || 'Counterparty',
        amount: Number(item.amount) || 0,
        method: item.method,
        status: item.status,
        reference: item.reference || '',
        accountMasked: item.accountMasked || '****4821',
      }));

    const invoiceAging = [
      { label: '0-30', min: 0, max: 30 },
      { label: '31-60', min: 31, max: 60 },
      { label: '61-90', min: 61, max: 90 },
      { label: '90+', min: 91, max: Infinity },
    ].map((bucket) => {
      const rows = invoices.filter((invoice) => {
        const balance = getBalanceFromInvoice(invoice);
        if (balance <= 0 || !invoice.dueDate) return false;
        const age = Math.max(Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000), 0);
        return age >= bucket.min && age <= bucket.max;
      });
      return {
        label: bucket.label,
        count: rows.length,
        amount: rows.reduce((sum, item) => sum + getBalanceFromInvoice(item), 0),
      };
    });

    res.status(200).json({
      success: true,
      data: {
        roleExperience: isFinanceHead ? 'head' : isFinanceEmployee ? 'employee' : 'viewer',
        kpis: [
          buildKpi('Total Cash', currentRevenue - currentSpend - pendingPaymentAmount, previousRevenue - previousSpend, '/finance/dashboard/payments'),
          buildKpi('Total Budget', totalBudget, totalBudget - usedBudget, '/finance/dashboard/budgets'),
          buildKpi('Total Expenses', totalExpenses, previousSpend, '/finance/dashboard/expenses'),
          buildKpi('Pending Requests', pendingRequests.length, 0, '/finance/dashboard/activity'),
          buildKpi('Pending Approvals', pendingApprovals.length, 0, '/finance/dashboard/approvals'),
          buildKpi('Pending Payments', pendingPaymentAmount, 0, '/finance/dashboard/payments'),
          buildKpi('Outstanding Receivables', totalReceivables, 0, '/finance/dashboard/invoices'),
          buildKpi('Outstanding Payables', pendingExpenseAmount + pendingPaymentAmount, 0, '/finance/dashboard/payments'),
        ],
        departmentFinancials,
        pendingRequests,
        approvalQueue,
        paymentQueue,
        invoiceAging,
        recentAuditActivity: auditLogs,
        totals: {
          invoices: invoices.length,
          overdueInvoices: invoices.filter((item) => item.status === 'overdue').length,
          payments: payments.length,
          pendingExpenses: pendingRequests.length,
          budgets: budgets.length,
          payrolls: payrollCount,
          accounts: accountCount,
          journalEntries: journalCount,
          totalBudget,
          totalExpenses,
          totalReceivables,
          pendingApprovals: pendingApprovals.length,
        },
        recentInvoices: invoices.slice(0, 5),
        recentPayments: payments.slice(0, 5)
      }
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch finance dashboard');
  }
};

/**
 * Chart of Accounts
 */
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find().sort({ code: 1 });
    res.status(200).json({ success: true, data: accounts });
  } catch (err) {
    sendError(res, err, 'Failed to fetch accounts');
  }
};

exports.createAccount = async (req, res) => {
  try {
    const account = await Account.create(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (err) {
    sendError(res, err, 'Failed to create account');
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const account = await Account.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: account });
  } catch (err) {
    sendError(res, err, 'Failed to update account');
  }
};

/**
 * Journal Entries
 */
exports.getJournalEntries = async (req, res) => {
  try {
    const entries = await JournalEntry.find().sort({ entryDate: -1 }).populate('lines.account', 'code name');
    res.status(200).json({ success: true, data: entries });
  } catch (err) {
    sendError(res, err, 'Failed to fetch journal entries');
  }
};

exports.createJournalEntry = async (req, res) => {
  try {
    const payload = req.body || {};
    const lines = normalizeJournalLines(payload.lines);
    const totals = assertBalancedJournal(lines);
    const entryNumber = payload.entryNumber || buildEntryNumber();
    const entry = await JournalEntry.create({
      ...payload,
      entryNumber,
      lines,
      totalDebit: totals.totalDebit,
      totalCredit: totals.totalCredit,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to create journal entry', details: err.message });
  }
};

exports.updateJournalEntry = async (req, res) => {
  try {
    const payload = req.body || {};
    const existing = await JournalEntry.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    if (existing.status === 'posted') {
      return res.status(409).json({ success: false, error: 'Posted journal entries cannot be edited. Create a reversal or adjustment entry.' });
    }
    if (payload.lines) {
      const lines = normalizeJournalLines(payload.lines);
      const totals = assertBalancedJournal(lines);
      payload.lines = lines;
      payload.totalDebit = totals.totalDebit;
      payload.totalCredit = totals.totalCredit;
    }
    const entry = await JournalEntry.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update journal entry', details: err.message });
  }
};

exports.postJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Journal entry not found' });
    }
    if (entry.status === 'posted') {
      return res.status(409).json({ success: false, error: 'Journal entry is already posted' });
    }
    assertBalancedJournal(entry.lines);
    entry.status = 'posted';
    entry.postedAt = new Date();
    await entry.save();
    res.status(200).json({ success: true, data: entry });
  } catch (err) {
    sendError(res, err, 'Failed to post journal entry');
  }
};

/**
 * ERP Reports
 */
exports.getTrialBalance = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    const accountMap = {};
    lines.forEach((line) => {
      const account = line.account;
      const key = account._id.toString();
      if (!accountMap[key]) {
        accountMap[key] = {
          accountId: key,
          code: account.code,
          name: account.name,
          type: account.type,
          debit: 0,
          credit: 0
        };
      }
      accountMap[key].debit += Number(line.debit) || 0;
      accountMap[key].credit += Number(line.credit) || 0;
    });
    const rows = Object.values(accountMap).sort((a, b) => a.code.localeCompare(b.code));
    const totals = rows.reduce(
      (acc, row) => {
        acc.debit += row.debit;
        acc.credit += row.credit;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
    res.status(200).json({ success: true, data: { rows, totals } });
  } catch (err) {
    sendError(res, err, 'Failed to generate trial balance');
  }
};

exports.getBalanceSheet = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    const totals = {
      assets: 0,
      liabilities: 0,
      equity: 0
    };
    lines.forEach((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      const type = line.account.type;
      if (type === 'asset') {
        totals.assets += debit - credit;
      } else if (type === 'liability') {
        totals.liabilities += credit - debit;
      } else if (type === 'equity') {
        totals.equity += credit - debit;
      }
    });
    res.status(200).json({ success: true, data: totals });
  } catch (err) {
    sendError(res, err, 'Failed to generate balance sheet');
  }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const lines = await fetchPostedLines();
    let revenue = 0;
    let expenses = 0;
    lines.forEach((line) => {
      const debit = Number(line.debit) || 0;
      const credit = Number(line.credit) || 0;
      if (line.account.type === 'revenue') {
        revenue += credit - debit;
      }
      if (line.account.type === 'expense') {
        expenses += debit - credit;
      }
    });
    res.status(200).json({
      success: true,
      data: {
        revenue,
        expenses,
        netIncome: revenue - expenses
      }
    });
  } catch (err) {
    sendError(res, err, 'Failed to generate profit and loss');
  }
};

exports.getTaxSummary = async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: { $ne: 'void' } });
    const totals = invoices.reduce(
      (acc, invoice) => {
        acc.taxableSales += Number(invoice.subtotal || 0);
        acc.gstCollected += Number(invoice.gstAmount || 0);
        acc.tdsWithheld += Number(invoice.tdsAmount || 0);
        return acc;
      },
      { taxableSales: 0, gstCollected: 0, tdsWithheld: 0 }
    );
    res.status(200).json({ success: true, data: totals });
  } catch (err) {
    sendError(res, err, 'Failed to generate tax summary');
  }
};

exports.getItrSummary = async (req, res) => {
  try {
    const [invoices, expenses] = await Promise.all([
      Invoice.find({ status: { $ne: 'void' } }),
      Expense.find()
    ]);
    const totalIncome = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const taxableIncome = totalIncome - totalExpenses;
    const estimatedTax = taxableIncome > 0 ? taxableIncome * 0.25 : 0;
    res.status(200).json({
      success: true,
      data: { totalIncome, totalExpenses, taxableIncome, estimatedTax }
    });
  } catch (err) {
    sendError(res, err, 'Failed to generate ITR summary');
  }
};

/**
 * Invoices
 */
exports.getInvoices = async (req, res) => {
  try {
    const { status, search, department } = req.query;
    const query = {};
    const and = [];
    if (status) query.status = status;
    if (search) {
      and.push({ $or: [
        { invoiceNumber: new RegExp(search, 'i') },
        { clientName: new RegExp(search, 'i') }
      ] });
    }
    const departmentQuery = await buildDepartmentQuery(department);
    if (Object.keys(departmentQuery).length) and.push(departmentQuery);
    if (and.length) query.$and = and;
    const invoices = await Invoice.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: invoices });
  } catch (err) {
    sendError(res, err, 'Failed to fetch invoices');
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const payload = req.body || {};
    await assertOpenFinancialPeriod(payload.financialPeriodId);
    const { departmentId, department } = await resolveDepartmentFields(payload);
    const items = normalizeInvoiceItems(payload.items);
    const totals = calculateInvoiceTotals(items, payload.discount, payload.gstRate, payload.tdsRate);
    if (totals.total <= 0) return res.status(422).json({ success: false, error: 'Invoice total must be greater than zero' });
    const invoiceNumber = payload.invoiceNumber || buildInvoiceNumber();
    const duplicate = await Invoice.findOne({ invoiceNumber }).lean();
    if (duplicate) return res.status(409).json({ success: false, error: 'Invoice number already exists' });
    const amountPaid = Number(payload.amountPaid) || 0;
    if (amountPaid < 0 || amountPaid > totals.total) return res.status(422).json({ success: false, error: 'Amount paid must be between zero and invoice total' });
    const balanceDue = totals.total - amountPaid;
    const invoice = await Invoice.create({
      ...payload,
      department,
      departmentId,
      invoiceNumber,
      items,
      ...totals,
      amountPaid,
      balanceDue,
      createdBy: req.user?.id
    });
    await logAudit({
      req,
      action: 'invoice_created',
      resourceType: 'invoice',
      resourceId: invoice._id,
      meta: { invoiceNumber: invoice.invoiceNumber, departmentId: invoice.departmentId, total: invoice.total, balanceDue: invoice.balanceDue },
    });
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to create invoice', details: err.details || err.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const payload = req.body || {};
    const existing = await Invoice.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }
    const shouldRecalculate =
      payload.items || payload.gstRate !== undefined || payload.tdsRate !== undefined || payload.discount !== undefined;
    await assertOpenFinancialPeriod(payload.financialPeriodId || existing.financialPeriodId);
    if (['paid', 'void'].includes(String(existing.status || '').toLowerCase()) && shouldRecalculate) {
      return res.status(409).json({ success: false, error: 'Paid or cancelled invoices cannot be re-amounted' });
    }
    if (payload.invoiceNumber && payload.invoiceNumber !== existing.invoiceNumber) {
      const duplicate = await Invoice.findOne({ invoiceNumber: payload.invoiceNumber, _id: { $ne: existing._id } }).lean();
      if (duplicate) return res.status(409).json({ success: false, error: 'Invoice number already exists' });
    }
    if (shouldRecalculate) {
      const items = payload.items ? normalizeInvoiceItems(payload.items) : existing.items || [];
      const totals = calculateInvoiceTotals(
        items,
        payload.discount !== undefined ? payload.discount : existing.discount,
        payload.gstRate !== undefined ? payload.gstRate : existing.gstRate,
        payload.tdsRate !== undefined ? payload.tdsRate : existing.tdsRate
      );
      if (payload.items) {
        payload.items = items;
      }
      payload.subtotal = totals.subtotal;
      payload.taxTotal = totals.taxTotal;
      payload.gstAmount = totals.gstAmount;
      payload.tdsAmount = totals.tdsAmount;
      payload.discount = totals.discount;
      payload.total = totals.total;
      const amountPaid = payload.amountPaid !== undefined ? Number(payload.amountPaid) || 0 : Number(existing.amountPaid) || 0;
      payload.amountPaid = amountPaid;
      payload.balanceDue = totals.total - amountPaid;
      if (payload.balanceDue < 0) return res.status(422).json({ success: false, error: 'Amount paid cannot exceed invoice total' });
    }
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, payload, { new: true });
    await logAudit({
      req,
      action: 'invoice_updated',
      resourceType: 'invoice',
      resourceId: invoice._id,
      meta: { before: { status: existing.status, total: existing.total, balanceDue: existing.balanceDue }, after: { status: invoice.status, total: invoice.total, balanceDue: invoice.balanceDue } },
      riskFlag: ['paid', 'void', 'overdue'].includes(String(invoice.status || '').toLowerCase()) ? 'medium' : 'none',
    });
    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update invoice', details: err.details || err.message });
  }
};

exports.createInvoiceNote = async (req, res) => {
  try {
    const payload = req.body || {};
    const note = await InvoiceNote.create({
      ...payload,
      invoice: req.params.id,
      createdBy: req.user?.id
    });

    const invoice = await Invoice.findById(req.params.id);
    if (invoice) {
      const amount = Number(note.amount) || 0;
      const adjustment = note.type === 'credit' ? -amount : amount;
      invoice.total = (Number(invoice.total) || 0) + adjustment;
      invoice.balanceDue = invoice.total - (Number(invoice.amountPaid) || 0);
      await invoice.save();
    }

    res.status(201).json({ success: true, data: note });
  } catch (err) {
    sendError(res, err, 'Failed to create invoice note');
  }
};

exports.getInvoiceNotes = async (req, res) => {
  try {
    const query = {};
    if (req.query.invoiceId) {
      query.invoice = req.query.invoiceId;
    }
    const notes = await InvoiceNote.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notes });
  } catch (err) {
    sendError(res, err, 'Failed to fetch invoice notes');
  }
};

/**
 * Payments
 */
exports.getPayments = async (req, res) => {
  try {
    const { status, department } = req.query;
    const query = { ...(status ? { status } : {}), ...(req.projectId ? { projectId: req.projectId } : {}) };
    Object.assign(query, await buildDepartmentQuery(department));
    const payments = await Payment.find(query).sort({ paymentDate: -1 });
    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    sendError(res, err, 'Failed to fetch payments');
  }
};

exports.createPayment = async (req, res) => {
  try {
    const payload = req.body || {};
    const amount = assertPositiveMoney(payload.amount, 'payment amount');
    await assertOpenFinancialPeriod(payload.financialPeriodId);
    if (payload.reference) {
      const duplicateReference = await Payment.findOne({ reference: payload.reference, ...(req.projectId ? { projectId: req.projectId } : {}) }).lean();
      if (duplicateReference) {
        return res.status(409).json({ success: false, error: 'Payment reference already exists' });
      }
    }
    let { departmentId } = await resolveDepartmentFields(payload);
    let invoice = null;
    if (payload.invoice) {
      invoice = await Invoice.findById(payload.invoice);
      if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
      const invoiceBalance = getBalanceFromInvoice(invoice);
      if (invoiceBalance <= 0 || invoice.status === 'paid') {
        return res.status(409).json({ success: false, error: 'Invoice is already fully paid' });
      }
      if (amount > invoiceBalance) {
        return res.status(409).json({ success: false, error: 'Payment cannot exceed invoice balance', details: { invoiceBalance, requested: amount } });
      }
      departmentId = departmentId || invoice.departmentId || null;
    }
    const payment = await Payment.create({
      ...payload,
      amount,
      departmentId,
      budgetId: payload.budgetId || invoice?.budgetId || null,
      requestId: payload.requestId || invoice?.requestId || null,
      approvalId: payload.approvalId || invoice?.approvalId || null,
      projectId: req.projectId || null,
      createdBy: req.user?.id
    });

    if (payment.invoice && invoice) {
        invoice.amountPaid = (Number(invoice.amountPaid) || 0) + amount;
        invoice.balanceDue = Math.max((Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0), 0);
        invoice.paymentId = payment._id;
        if (invoice.balanceDue <= 0) {
          invoice.status = 'paid';
          invoice.balanceDue = 0;
        } else if (invoice.dueDate && invoice.dueDate < new Date()) {
          invoice.status = 'overdue';
        } else if (invoice.status === 'draft') {
          invoice.status = 'sent';
        }
        await invoice.save();
    }
    await logAudit({
      req,
      action: 'payment_created',
      resourceType: 'payment',
      resourceId: payment._id,
      meta: { amount: payment.amount, invoice: payment.invoice, departmentId: payment.departmentId, status: payment.status },
    });
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to record payment', details: err.details || err.message });
  }
};

exports.updatePayment = async (req, res) => {
  try {
    await assertOpenFinancialPeriod(req.body?.financialPeriodId);
    if (req.body?.amount !== undefined) assertPositiveMoney(req.body.amount, 'payment amount');
    const existing = await Payment.findOne({ _id: req.params.id, ...(req.projectId ? { projectId: req.projectId } : {}) }).lean();
    if (!existing) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (['completed', 'reconciled'].includes(String(existing.status || '').toLowerCase()) && req.body?.amount !== undefined) {
      return res.status(409).json({ success: false, error: 'Completed payments cannot be re-amounted' });
    }
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, ...(req.projectId ? { projectId: req.projectId } : {}) },
      { ...req.body, ...(req.projectId ? { projectId: req.projectId } : {}) },
      { new: true, runValidators: true }
    );
    await logAudit({
      req,
      action: 'payment_updated',
      resourceType: 'payment',
      resourceId: payment._id,
      meta: { before: { status: existing.status, amount: existing.amount }, after: { status: payment.status, amount: payment.amount }, failureReason: payment.failureReason },
      riskFlag: payment.status === 'failed' ? 'medium' : 'none',
    });
    res.status(200).json({ success: true, data: payment });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update payment', details: err.details || err.message });
  }
};

/**
 * Expenses
 */
exports.getExpenses = async (req, res) => {
  try {
    const { status, department } = req.query;
    const query = {};
    if (status) query.status = status;
    Object.assign(query, await buildDepartmentQuery(department));
    const expenses = await Expense.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: expenses });
  } catch (err) {
    sendError(res, err, 'Failed to fetch expenses');
  }
};

exports.createExpense = async (req, res) => {
  try {
    const payload = await normalizeExpensePayload(req.body || {});
    const amount = assertPositiveMoney(payload.amount, 'expense amount');
    await assertOpenFinancialPeriod(req.body?.financialPeriodId);
    const budgetSnapshot = await assertBudgetAvailable({
      departmentId: payload.departmentId,
      amount,
      fiscalYear: req.body?.fiscalYear,
    });
    const expense = await Expense.create({
      ...payload,
      amount,
      financialPeriodId: req.body?.financialPeriodId || null,
      budgetId: req.body?.budgetId || budgetSnapshot?.budget?._id || null,
      budgetReservedAt: new Date(),
      submittedBy: req.user?.id,
      statusHistory: [{
        from: '',
        to: 'submitted',
        action: 'submit',
        comment: payload.notes || '',
        actor: req.user?.id,
        actorRole: req.user?.role || '',
        at: new Date(),
      }]
    });
    await logAudit({
      req,
      action: 'finance_request_submitted',
      resourceType: 'finance_request',
      resourceId: expense._id,
      meta: {
        department: expense.department,
        departmentId: expense.departmentId ? String(expense.departmentId) : null,
        amount: expense.amount,
        category: expense.category,
        budgetId: expense.budgetId ? String(expense.budgetId) : null,
        budgetSnapshot: budgetSnapshot ? {
          allocated: budgetSnapshot.allocated,
          spent: budgetSnapshot.spent,
          reserved: budgetSnapshot.reserved,
          availableBeforeRequest: budgetSnapshot.available,
          availableAfterRequest: budgetSnapshot.available - amount,
        } : null,
      },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to create expense', details: err.details || err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const existing = await Expense.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Expense not found' });
    if (req.body?.status && String(req.body.status).toLowerCase() !== String(existing.status || '').toLowerCase()) {
      return res.status(409).json({ success: false, error: 'Use finance request lifecycle actions to change status' });
    }
    await assertOpenFinancialPeriod(req.body?.financialPeriodId || existing.financialPeriodId);
    const normalized = await normalizeExpensePayload(req.body || {});
    const amount = req.body?.amount !== undefined ? assertPositiveMoney(req.body.amount, 'expense amount') : Number(existing.amount || 0);
    await assertBudgetAvailable({
      departmentId: normalized.departmentId || existing.departmentId,
      amount,
      fiscalYear: req.body?.fiscalYear,
      excludeExpenseId: existing._id,
    });
    const payload = { ...normalized, ...req.body, department: normalized.department, departmentId: normalized.departmentId };
    const expense = await Expense.findByIdAndUpdate(req.params.id, payload, { new: true });
    await logAudit({
      req,
      action: 'expense_updated',
      resourceType: 'expense',
      resourceId: expense._id,
      meta: { before: { amount: existing.amount, departmentId: existing.departmentId, category: existing.category }, after: { amount: expense.amount, departmentId: expense.departmentId, category: expense.category } },
      riskFlag: 'low',
    });
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update expense', details: err.details || err.message });
  }
};

/**
 * Budgets
 */
exports.getBudgets = async (req, res) => {
  try {
    const { department, fiscalYear } = req.query;
    const query = {};
    Object.assign(query, await buildDepartmentQuery(department));
    if (fiscalYear) query.fiscalYear = fiscalYear;
    const budgets = await Budget.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: budgets });
  } catch (err) {
    sendError(res, err, 'Failed to fetch budgets');
  }
};

exports.createBudget = async (req, res) => {
  try {
    const payload = await normalizeBudgetPayload(req.body || {});
    await assertOpenFinancialPeriod(req.body?.financialPeriodId);
    const reserved = Number(req.body?.reserved || 0);
    if (payload.allocated < 0 || payload.spent < 0 || reserved < 0) {
      return res.status(422).json({ success: false, error: 'Budget amounts cannot be negative' });
    }
    const { utilization, status } = deriveBudgetStatus(payload.allocated, payload.spent);
    const budget = await Budget.create({
      ...payload,
      financialPeriodId: req.body?.financialPeriodId || null,
      reserved,
      available: Number(payload.allocated || 0) - Number(payload.spent || 0) - reserved,
      utilization,
      status,
      createdBy: req.user?.id
    });
    await logAudit({
      req,
      action: 'budget_created',
      resourceType: 'budget',
      resourceId: budget._id,
      meta: { departmentId: budget.departmentId, allocated: budget.allocated, spent: budget.spent, reserved: budget.reserved, available: budget.available },
    });
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to create budget', details: err.details || err.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const normalized = await normalizeBudgetPayload(req.body || {});
    const payload = { ...normalized, ...req.body, department: normalized.department, departmentId: normalized.departmentId };
    const existing = await Budget.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Budget not found' });
    }
    await assertOpenFinancialPeriod(payload.financialPeriodId || existing.financialPeriodId);
    if (payload.allocated !== undefined || payload.spent !== undefined || payload.reserved !== undefined) {
      const allocated = payload.allocated !== undefined ? Number(payload.allocated) : Number(existing.allocated || 0);
      const spent = payload.spent !== undefined ? Number(payload.spent) : Number(existing.spent || 0);
      const reserved = payload.reserved !== undefined ? Number(payload.reserved) : Number(existing.reserved || 0);
      if (allocated < 0 || spent < 0 || reserved < 0) return res.status(422).json({ success: false, error: 'Budget amounts cannot be negative' });
      const { utilization, status } = deriveBudgetStatus(allocated, spent);
      payload.allocated = allocated;
      payload.spent = spent;
      payload.reserved = reserved;
      payload.available = allocated - spent - reserved;
      payload.utilization = utilization;
      payload.status = payload.status || status;
    }
    const budget = await Budget.findByIdAndUpdate(req.params.id, payload, { new: true });
    await logAudit({
      req,
      action: 'budget_updated',
      resourceType: 'budget',
      resourceId: budget._id,
      meta: { before: { allocated: existing.allocated, spent: existing.spent, reserved: existing.reserved }, after: { allocated: budget.allocated, spent: budget.spent, reserved: budget.reserved, available: budget.available } },
      riskFlag: 'medium',
    });
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update budget', details: err.details || err.message });
  }
};

/**
 * Cost Centers
 */
exports.getCostCenters = async (req, res) => {
  try {
    const costCenters = await CostCenter.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: costCenters });
  } catch (err) {
    sendError(res, err, 'Failed to fetch cost centers');
  }
};

exports.createCostCenter = async (req, res) => {
  try {
    const { departmentId, department } = await resolveDepartmentFields(req.body || {});
    const costCenter = await CostCenter.create({ ...req.body, departmentId, department });
    res.status(201).json({ success: true, data: costCenter });
  } catch (err) {
    sendError(res, err, 'Failed to create cost center');
  }
};

exports.updateCostCenter = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.departmentId !== undefined || payload.department !== undefined) {
      const resolved = await resolveDepartmentFields(payload);
      payload.departmentId = resolved.departmentId;
      payload.department = resolved.department;
    }
    const costCenter = await CostCenter.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.status(200).json({ success: true, data: costCenter });
  } catch (err) {
    sendError(res, err, 'Failed to update cost center');
  }
};

/**
 * Payroll
 */
exports.getPayrolls = async (req, res) => {
  try {
    const payrolls = await Payroll.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: payrolls });
  } catch (err) {
    sendError(res, err, 'Failed to fetch payrolls');
  }
};

exports.createPayroll = async (req, res) => {
  try {
    const payload = normalizePayrollPayload(req.body || {});
    const { departmentId } = await resolveDepartmentFields(req.body || {});
    await assertOpenFinancialPeriod(req.body?.financialPeriodId);
    const payrollAmount = assertPositiveMoney(payload.netPay || payload.grossPay, 'payroll amount');
    const budgetSnapshot = departmentId ? await assertBudgetAvailable({
      departmentId,
      amount: payrollAmount,
      fiscalYear: req.body?.fiscalYear,
    }) : null;
    const payroll = await Payroll.create({
      ...payload,
      departmentId,
      budgetId: req.body?.budgetId || budgetSnapshot?.budget?._id || null,
      financialPeriodId: req.body?.financialPeriodId || null,
    });
    if (budgetSnapshot?.budget?._id && ['processed', 'disbursed'].includes(String(payroll.status || '').toLowerCase())) {
      await Budget.findByIdAndUpdate(budgetSnapshot.budget._id, { $inc: { spent: payrollAmount } });
    }
    await logAudit({
      req,
      action: 'payroll_processed',
      resourceType: 'payroll',
      resourceId: payroll._id,
      meta: { employeeName: payroll.employeeName, departmentId: payroll.departmentId, budgetId: payroll.budgetId, netPay: payroll.netPay, status: payroll.status },
      riskFlag: 'medium',
    });
    res.status(201).json({ success: true, data: payroll });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to create payroll record', details: err.details || err.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    await assertOpenFinancialPeriod(req.body?.financialPeriodId);
    const existing = await Payroll.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ success: false, error: 'Payroll record not found' });
    if (['disbursed'].includes(String(existing.status || '').toLowerCase()) && (req.body?.netPay !== undefined || req.body?.grossPay !== undefined)) {
      return res.status(409).json({ success: false, error: 'Disbursed payroll cannot be re-amounted' });
    }
    const payroll = await Payroll.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await logAudit({
      req,
      action: 'payroll_updated',
      resourceType: 'payroll',
      resourceId: payroll._id,
      meta: { before: { status: existing.status, netPay: existing.netPay }, after: { status: payroll.status, netPay: payroll.netPay } },
      riskFlag: 'medium',
    });
    res.status(200).json({ success: true, data: payroll });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, error: err.statusCode ? err.message : 'Failed to update payroll record', details: err.details || err.message });
  }
};

/**
 * Reports
 */
exports.getReports = async (req, res) => {
  try {
    const reports = await FinancialReport.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (err) {
    sendError(res, err, 'Failed to fetch reports');
  }
};

exports.createReport = async (req, res) => {
  try {
    const report = await FinancialReport.create({
      ...req.body,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    sendError(res, err, 'Failed to create report');
  }
};

/**
 * Compliance
 */
exports.getCompliance = async (req, res) => {
  try {
    const records = await ComplianceRecord.find(req.projectId ? { projectId: req.projectId } : {}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: records });
  } catch (err) {
    sendError(res, err, 'Failed to fetch compliance records');
  }
};

exports.createCompliance = async (req, res) => {
  try {
    const record = await ComplianceRecord.create({
      ...req.body,
      projectId: req.projectId || null,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    sendError(res, err, 'Failed to create compliance record');
  }
};

exports.updateCompliance = async (req, res) => {
  try {
    const record = await ComplianceRecord.findOneAndUpdate(
      { _id: req.params.id, ...(req.projectId ? { projectId: req.projectId } : {}) },
      { ...req.body, ...(req.projectId ? { projectId: req.projectId } : {}) },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    sendError(res, err, 'Failed to update compliance record');
  }
};

/**
 * Vendors
 */
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: vendors });
  } catch (err) {
    sendError(res, err, 'Failed to fetch vendors');
  }
};

exports.createVendor = async (req, res) => {
  try {
    const payload = req.body || {};
    const normalized = {
      name: payload.name,
      contactEmail: payload.contactEmail || payload.email || '',
      contactPhone: payload.contactPhone || payload.phone || '',
      address: payload.address || '',
      paymentTerms: payload.paymentTerms || '',
      taxId: payload.taxId || '',
      notes: payload.notes || ''
    };
    const existing = await Vendor.findOne({
      name: normalized.name,
      contactEmail: normalized.contactEmail
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Vendor already exists' });
    }
    const vendor = await Vendor.create(normalized);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    sendError(res, err, 'Failed to create vendor');
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, error: 'Invoice not found' });
    if (['paid', 'overdue'].includes(String(invoice.status || '').toLowerCase())) {
      return res.status(409).json({ success: false, error: 'Posted or completed invoices cannot be deleted' });
    }
    const deleted = await Invoice.findByIdAndDelete(req.params.id);
    await logAudit({
      req,
      action: 'invoice_deleted',
      resourceType: 'invoice',
      resourceId: deleted._id,
      meta: { invoiceNumber: deleted.invoiceNumber, status: deleted.status },
      riskFlag: 'medium',
    });
    res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    sendError(res, err, 'Failed to delete invoice');
  }
};

exports.listDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('name code description isSystem')
      .lean();
    res.status(200).json({ success: true, data: departments });
  } catch (err) {
    sendError(res, err, 'Failed to fetch department catalog');
  }
};

exports.getDepartmentFinancials = async (req, res) => {
  try {
    const rows = await computeDepartmentFinancials();
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    sendError(res, err, 'Failed to fetch department financials');
  }
};

exports.getDepartmentFinancialProfile = async (req, res) => {
  try {
    const rawDepartment = String(req.params.departmentId || '').trim();
    const departmentQuery = mongoose.Types.ObjectId.isValid(rawDepartment)
      ? { _id: rawDepartment, isActive: true }
      : { code: rawDepartment.toUpperCase(), isActive: true };
    const department = await Department.findOne(departmentQuery).lean();
    if (!department) return res.status(404).json({ success: false, error: 'Department not found' });
    const deptId = department._id;

    const [expenses, budgets, invoices, payments, expenseIds, auditLogs, allRows] = await Promise.all([
      Expense.find({ departmentId: deptId }).sort({ createdAt: -1 }).lean(),
      Budget.find({ departmentId: deptId }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ departmentId: deptId }).sort({ createdAt: -1 }).lean(),
      Payment.find({ departmentId: deptId }).sort({ paymentDate: -1 }).lean(),
      Expense.find({ departmentId: deptId }).distinct('_id'),
      AuditLog.find({ 'meta.departmentId': String(deptId) }).sort({ createdAt: -1 }).limit(50).lean(),
      computeDepartmentFinancials(),
    ]);
    const approvals = await ApprovalWorkflow.find({
      module: 'finance',
      entityType: 'expense',
      entityId: { $in: expenseIds.map(String) },
    }).sort({ createdAt: -1 }).lean();

    const profile = allRows.find((row) => row.departmentId === String(deptId)) || null;
    const requests = buildFinanceRequests({ expenses, approvals });

    res.status(200).json({
      success: true,
      data: {
        profile,
        requests,
        expenses,
        invoices,
        budgets,
        payments,
        transactions: [
          ...invoices.map((item) => ({ id: String(item._id), type: 'invoice', reference: item.invoiceNumber, amount: getAmountFromInvoice(item), status: item.status, createdAt: item.createdAt })),
          ...expenses.map((item) => ({ id: String(item._id), type: 'expense', reference: item.title, amount: Number(item.amount) || 0, status: item.status, createdAt: item.createdAt })),
          ...payments.map((item) => ({ id: String(item._id), type: 'payment', reference: item.reference, amount: Number(item.amount) || 0, status: item.status, createdAt: item.createdAt })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        documents: expenses.flatMap((item) => (item.documents || []).map((doc) => ({ ...doc, requestId: `REQ-${String(item._id).slice(-6).toUpperCase()}` }))),
        activity: auditLogs,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch department financial profile');
  }
};

exports.getFinanceRequests = async (req, res) => {
  try {
    const { page, limit, skip } = withPagination(req.query);
    const { search, department, status, requestType, priority, assignedEmployee } = req.query;
    const [expenses, approvals] = await Promise.all([
      Expense.find().sort({ createdAt: -1 }).lean(),
      ApprovalWorkflow.find({ module: 'finance' }).sort({ createdAt: -1 }).lean(),
    ]);

    let rows = buildFinanceRequests({ expenses, approvals });
    if (department) rows = rows.filter((item) => item.department === department || item.departmentId === department);
    if (status) rows = rows.filter((item) => String(item.status || '').toLowerCase() === String(status).toLowerCase());
    if (requestType) rows = rows.filter((item) => String(item.type || '').toLowerCase() === String(requestType).toLowerCase());
    if (priority) rows = rows.filter((item) => String(item.priority || '').toLowerCase() === String(priority).toLowerCase());
    if (assignedEmployee) rows = rows.filter((item) => String(item.assignedEmployee || '').toLowerCase().includes(String(assignedEmployee).toLowerCase()));
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter((item) =>
        [item.requestId, item.department, item.requester, item.type, item.category, item.status, item.assignedEmployee]
          .some((value) => String(value || '').toLowerCase().includes(q))
      );
    }

    const total = rows.length;
    res.status(200).json({
      success: true,
      data: {
        items: rows.slice(skip, skip + limit),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch finance requests');
  }
};

exports.getFinanceRequestDetail = async (req, res) => {
  try {
    const [expense, approvals, auditLogs] = await Promise.all([
      Expense.findById(req.params.id).lean(),
      ApprovalWorkflow.find({ module: 'finance', entityType: 'expense', entityId: String(req.params.id) }).sort({ createdAt: -1 }).lean(),
      AuditLog.find({ resourceType: 'finance_request', resourceId: String(req.params.id) }).sort({ createdAt: -1 }).lean(),
    ]);
    if (!expense) return res.status(404).json({ success: false, error: 'Finance request not found' });
    const request = buildFinanceRequests({ expenses: [expense], approvals })[0];
    res.status(200).json({
      success: true,
      data: {
        ...request,
        statusHistory: expense.statusHistory || [],
        approvals,
        auditLogs,
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch finance request detail');
  }
};

exports.updateFinanceRequestAction = async (req, res) => {
  try {
    const data = await transitionFinanceRequest({
      req,
      requestId: req.params.id,
      action: req.params.action,
      comment: req.body?.comment || req.body?.remarks || '',
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.statusCode ? err.message : 'Failed to update finance request',
      details: err.message,
    });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, error: 'Expense not found' });
    if (String(expense.status || '').toLowerCase() === 'paid') {
      return res.status(409).json({ success: false, error: 'Paid expenses cannot be deleted' });
    }
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    await logAudit({
      req,
      action: 'expense_deleted',
      resourceType: 'expense',
      resourceId: deleted._id,
      meta: { title: deleted.title, status: deleted.status },
      riskFlag: 'medium',
    });
    res.status(200).json({ success: true, data: deleted });
  } catch (err) {
    sendError(res, err, 'Failed to delete expense');
  }
};

exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: vendor });
  } catch (err) {
    sendError(res, err, 'Failed to update vendor');
  }
};

/**
 * Clients
 */
exports.getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: clients });
  } catch (err) {
    sendError(res, err, 'Failed to fetch clients');
  }
};

exports.createClient = async (req, res) => {
  try {
    const client = await Client.create(req.body);
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    sendError(res, err, 'Failed to create client');
  }
};

exports.updateClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: client });
  } catch (err) {
    sendError(res, err, 'Failed to update client');
  }
};

/**
 * Enterprise: Transactions, Audit Logs, Approvals & Workflows
 */
exports.getTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = withPagination(req.query);
    const { type, department, status, fromDate, toDate, search } = req.query;

    const invoiceQuery = {};
    const expenseQuery = {};
    const paymentQuery = {};

    if (status) {
      invoiceQuery.status = status;
      expenseQuery.status = status;
      paymentQuery.status = status;
    }
    if (department) {
      Object.assign(expenseQuery, await buildDepartmentQuery(department));
      Object.assign(invoiceQuery, await buildDepartmentQuery(department));
      Object.assign(paymentQuery, await buildDepartmentQuery(department));
    }
    if (fromDate || toDate) {
      const range = {};
      if (fromDate) range.$gte = new Date(fromDate);
      if (toDate) range.$lte = new Date(toDate);
      invoiceQuery.createdAt = range;
      expenseQuery.createdAt = range;
      paymentQuery.createdAt = range;
    }
    if (search) {
      const q = new RegExp(search, 'i');
      invoiceQuery.$or = [{ invoiceNumber: q }, { clientName: q }];
      expenseQuery.$or = [{ title: q }, { category: q }];
      paymentQuery.$or = [{ customerName: q }, { reference: q }];
    }

    const loadInvoices = !type || type === 'income' || type === 'invoice';
    const loadExpenses = !type || type === 'expense';
    const loadPayments = !type || type === 'vendor_payment' || type === 'payment';

    const [invoices, expenses, payments] = await Promise.all([
      loadInvoices ? Invoice.find(invoiceQuery).sort({ createdAt: -1 }).lean() : [],
      loadExpenses ? Expense.find(expenseQuery).sort({ createdAt: -1 }).lean() : [],
      loadPayments ? Payment.find(paymentQuery).sort({ createdAt: -1 }).lean() : [],
    ]);

    const merged = [
      ...invoices.map((item) => ({
        id: String(item._id),
        type: 'income',
        category: 'invoice',
        amount: Number(item.total || 0),
        status: item.status,
        department: 'Finance',
        reference: item.invoiceNumber,
        party: item.clientName,
        createdAt: item.createdAt,
      })),
      ...expenses.map((item) => ({
        id: String(item._id),
        type: 'expense',
        category: item.category || 'general',
        amount: Number(item.amount || 0),
        status: item.status,
        department: item.department || 'General',
        reference: item.title,
        party: 'Internal',
        createdAt: item.createdAt,
      })),
      ...payments.map((item) => ({
        id: String(item._id),
        type: 'vendor_payment',
        category: item.method || 'bank',
        amount: Number(item.amount || 0),
        status: item.status,
        department: 'Finance',
        reference: item.reference || '',
        party: item.customerName || 'Counterparty',
        createdAt: item.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = merged.length;
    const rows = merged.slice(skip, skip + limit);

    res.status(200).json({
      success: true,
      data: {
        items: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch transactions');
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = withPagination(req.query);
    const query = {};
    if (req.query.action) query.action = req.query.action;
    if (req.query.riskFlag) query.riskFlag = req.query.riskFlag;
    if (req.query.resourceType) query.resourceType = req.query.resourceType;

    const [items, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch audit logs');
  }
};

exports.getApprovalWorkflows = async (req, res) => {
  try {
    const { page, limit, skip } = withPagination(req.query);
    const query = {};
    if (req.query.module) query.module = req.query.module;
    if (req.query.status) query.status = req.query.status;

    const [items, total] = await Promise.all([
      ApprovalWorkflow.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ApprovalWorkflow.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        items,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch approval workflows');
  }
};

exports.createApprovalWorkflow = async (req, res) => {
  try {
    const payload = req.body || {};
    const workflow = await ApprovalWorkflow.create({
      module: payload.module || 'finance',
      entityType: payload.entityType || 'budget',
      entityId: String(payload.entityId || ''),
      requestedBy: req.user?.id,
      steps: Array.isArray(payload.steps) ? payload.steps : [],
      status: 'pending',
    });
    await logAudit({
      req,
      action: 'approval_workflow_created',
      resourceType: 'approval_workflow',
      resourceId: workflow._id,
      meta: { module: workflow.module, entityType: workflow.entityType },
    });
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    sendError(res, err, 'Failed to create approval workflow');
  }
};

exports.updateApprovalWorkflowDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, remarks = '' } = req.body || {};
    const workflow = await ApprovalWorkflow.findById(id);
    if (!workflow) return res.status(404).json({ success: false, error: 'Workflow not found' });
    if (String(workflow.requestedBy || '') === String(req.user?.id || '')) {
      return res.status(403).json({ success: false, error: 'Users cannot approve their own finance requests' });
    }

    const role = String(req.user?.role || '').toLowerCase();
    const canOverride = FINANCE_HEAD_ROLES.has(role);
    const pendingStep = workflow.steps.find((step) => step.status === 'pending' && String(step.role || '').toLowerCase() === role)
      || (canOverride ? workflow.steps.find((step) => step.status === 'pending' && !step.optional) : null);
    if (!pendingStep) {
      return res.status(403).json({ success: false, error: 'No pending step for your role' });
    }

    pendingStep.status = decision === 'reject' ? 'rejected' : 'approved';
    pendingStep.decidedBy = req.user?.id;
    pendingStep.decidedAt = new Date();
    pendingStep.remarks = remarks;

    if (pendingStep.status === 'rejected') {
      workflow.status = 'rejected';
    } else {
      const hasPending = workflow.steps.some((step) => step.status === 'pending');
      workflow.status = hasPending ? 'pending' : 'approved';
    }

    await workflow.save();
    if (workflow.module === 'finance' && workflow.entityType === 'expense') {
      const nextStatus = workflow.status === 'approved' ? 'approved' : workflow.status === 'rejected' ? 'rejected' : 'pending_approval';
      const expense = await Expense.findById(workflow.entityId);
      if (expense && String(expense.status || '').toLowerCase() !== nextStatus) {
        const previousStatus = expense.status;
        expense.status = nextStatus;
        if (nextStatus === 'approved') expense.approvedBy = req.user?.id;
        expense.statusHistory.push({
          from: previousStatus,
          to: nextStatus,
          action: `approval_${pendingStep.status}`,
          comment: remarks,
          actor: req.user?.id,
          actorRole: req.user?.role || '',
          at: new Date(),
        });
        await expense.save();
      }
    }
    await logAudit({
      req,
      action: 'approval_workflow_decision',
      resourceType: 'approval_workflow',
      resourceId: workflow._id,
      meta: { decision: pendingStep.status, remarks },
      riskFlag: pendingStep.status === 'rejected' ? 'medium' : 'none',
    });
    res.status(200).json({ success: true, data: workflow });
  } catch (err) {
    sendError(res, err, 'Failed to update approval decision');
  }
};

exports.syncPayrollFromHr = async (req, res) => {
  try {
    const payload = normalizePayrollPayload(req.body || {});
    const payroll = await Payroll.create({
      ...payload,
      notes: payload.notes || 'Synced from HR module',
    });
    await logAudit({
      req,
      action: 'payroll_synced_from_hr',
      resourceType: 'payroll',
      resourceId: payroll._id,
      meta: { employeeName: payroll.employeeName },
    });
    res.status(201).json({ success: true, data: payroll });
  } catch (err) {
    sendError(res, err, 'Failed to sync payroll from HR');
  }
};

exports.linkComplianceWithLaw = async (req, res) => {
  try {
    const { complianceId, lawReference } = req.body || {};
    const record = await ComplianceRecord.findByIdAndUpdate(
      complianceId,
      { reference: lawReference, notes: `Linked with LAW: ${lawReference}` },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, error: 'Compliance record not found' });
    await logAudit({
      req,
      action: 'compliance_linked_with_law',
      resourceType: 'compliance',
      resourceId: record._id,
      meta: { lawReference },
    });
    res.status(200).json({ success: true, data: record });
  } catch (err) {
    sendError(res, err, 'Failed to link compliance with law');
  }
};

exports.getIntegrationSnapshot = async (req, res) => {
  try {
    const [payrollCount, pendingBudgets, pendingCompliance, pendingApprovals, pendingExpenses] = await Promise.all([
      Payroll.countDocuments(),
      Budget.countDocuments({ status: { $in: ['at-risk', 'over'] } }),
      ComplianceRecord.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
      ApprovalWorkflow.countDocuments({ status: 'pending' }),
      Expense.countDocuments({ status: { $in: ['submitted', 'pending'] } }),
    ]);
    res.status(200).json({
      success: true,
      data: {
        hrPayrollSync: { totalPayrollRuns: payrollCount },
        adminBudgetApprovals: { flaggedBudgets: pendingBudgets, pendingApprovals },
        lawCompliance: { pendingCompliance },
        itInfraCost: { pendingExpenses },
        projectsExpense: { pendingExpenses },
        outsourcingPayments: { pendingExpenses },
      },
    });
  } catch (err) {
    sendError(res, err, 'Failed to fetch integration snapshot');
  }
};
