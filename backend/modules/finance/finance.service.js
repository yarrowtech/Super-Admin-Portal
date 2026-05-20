const Payroll = require("../../models/finance/Payroll");
const Budget = require("../../models/finance/Budget");
const Invoice = require("../../models/finance/Invoice");
const Expense = require("../../models/finance/Expense");
const ApprovalWorkflow = require("../../models/finance/ApprovalWorkflow");
const LawContract = require("../../models/law/LawContract");
const { createApprovalRequest, decideApprovalRequest } = require("../../services/approvalEngine.service");
const { writeAuditTrail } = require("../../services/auditTrail.service");

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const getOverview = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [invoiceCount, expenseCount, budgetCount, payrollCount, pendingApprovals] = await Promise.all([
    Invoice.countDocuments(scope),
    Expense.countDocuments(scope),
    Budget.countDocuments(scope),
    Payroll.countDocuments(scope),
    ApprovalWorkflow.countDocuments({ ...scope, status: "pending" }),
  ]);
  return { invoiceCount, expenseCount, budgetCount, payrollCount, pendingApprovals };
};

const listTransactions = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const [invoices, expenses] = await Promise.all([
    Invoice.find(projectId ? { projectId } : {}).sort({ createdAt: -1 }).lean(),
    Expense.find(projectId ? { projectId } : {}).sort({ createdAt: -1 }).lean(),
  ]);
  const merged = [
    ...invoices.map((row) => ({ type: "income", amount: Number(row.total || 0), status: row.status, at: row.createdAt })),
    ...expenses.map((row) => ({ type: "expense", amount: Number(row.amount || 0), status: row.status, at: row.createdAt })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at));
  const items = merged.slice(skip, skip + limit);
  return { items, pagination: { page, limit, total: merged.length, totalPages: Math.ceil(merged.length / limit) || 1 } };
};

const createExpenseRequest = async ({ payload = {}, actor, projectId }) => {
  const expense = await Expense.create({
    ...payload,
    projectId,
    submittedBy: actor.id,
    status: "submitted",
  });
  const workflow = await createApprovalRequest({
    module: "finance",
    entityType: "expense",
    entityId: expense._id,
    requestedBy: actor.id,
    steps: [{ role: "manager" }, { role: "finance_manager" }, { role: "admin" }],
  });
  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "finance",
    action: "finance_expense_submitted",
    targetType: "FinanceExpense",
    targetId: expense._id,
    metadata: { workflowId: workflow._id, amount: expense.amount },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return { expense, workflow };
};

const decideExpenseRequest = async ({ workflowId, decision, remarks, actor, projectId }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actor.role,
    userId: actor.id,
    decision,
    remarks,
  });

  if (workflow.entityType === "expense") {
    const status = workflow.status === "approved" ? "verified" : workflow.status === "rejected" ? "rejected" : "submitted";
    await Expense.findOneAndUpdate({ _id: workflow.entityId, projectId }, { status, verifiedBy: actor.id });
  }

  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "finance",
    action: "finance_expense_decision",
    targetType: "ApprovalWorkflow",
    targetId: workflow._id,
    metadata: { decision, remarks, status: workflow.status },
  });
  return workflow;
};

const triggerPayrollFromHr = async ({ payload = {}, actor, projectId }) => {
  const payroll = await Payroll.create({
    ...payload,
    projectId,
    status: "processed",
  });
  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "finance",
    action: "finance_payroll_triggered_from_hr",
    targetType: "FinancePayroll",
    targetId: payroll._id,
    metadata: { employee: payroll.employee, netPay: payroll.netPay },
  });
  return payroll;
};

const createContractLinkedInvoice = async ({ invoiceId, payload = {}, actor, projectId }) => {
  const invoice = await Invoice.findOne({ _id: invoiceId, projectId });
  if (!invoice) {
    const err = new Error("Invoice not found");
    err.statusCode = 404;
    throw err;
  }
  const contract = await LawContract.create({
    title: payload.title || `Contract for ${invoice.invoiceNumber}`,
    expiryDate: payload.expiryDate || new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    projectId,
    status: "draft",
    linkedInvoiceId: invoice._id,
    createdBy: actor.id,
    updatedBy: actor.id,
    metadata: { source: "finance_invoice", invoiceNumber: invoice.invoiceNumber },
  });
  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "finance",
    action: "finance_invoice_linked_law_contract",
    targetType: "LawContract",
    targetId: contract._id,
    metadata: { invoiceId: invoice._id },
  });
  return contract;
};

module.exports = {
  getOverview,
  listTransactions,
  createExpenseRequest,
  decideExpenseRequest,
  triggerPayrollFromHr,
  createContractLinkedInvoice,
};
