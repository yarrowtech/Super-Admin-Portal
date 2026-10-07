'use strict';
// Closes the loop between finance employees and the finance head: a submission tells the
// head it is waiting, and a decision tells the submitter what happened. Without this, an
// employee's item sits in a queue nobody is told about.
//
// Notifications are best-effort: a delivery failure must never roll back or block the
// financial write that triggered it, so every call is wrapped and logged, not thrown.
const Notification = require('../../models/manager/ManagerNotification');
const User = require('../../models/auth/User');

const FINANCE_HEAD_ROLES = ['finance_manager', 'admin', 'super_admin'];

const recipientIds = async (session) => {
  const query = User.find({ role: { $in: FINANCE_HEAD_ROLES }, isActive: true }, '_id');
  const heads = await (session ? query.session(session) : query).lean();
  return heads.map((h) => h._id);
};

// Written outside the caller's transaction on purpose: the financial record is the thing
// that must be atomic, and a notification is not worth failing a payment over.
async function send(rows) {
  if (!rows.length) return 0;
  try {
    await Notification.insertMany(rows, { ordered: false });
    return rows.length;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('finance notification delivery failed', err.message);
    return 0;
  }
}

const label = (module) => ({ invoice: 'Invoice', journal: 'Journal entry', expense: 'Expense' }[module] || 'Record');

// An employee submitted something for approval -> tell every finance head.
async function submittedForReview({ module, doc, actor, actorName, title, amount, note }) {
  const heads = await recipientIds();
  const who = actorName || 'A finance team member';
  return send(heads
    .filter((id) => String(id) !== String(actor))
    .map((id) => ({
      manager: id,
      department: 'Finance',
      title: `${label(module)} awaiting your approval`,
      message: `${who} submitted ${title}${amount ? ` for ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}` : ''}.${note ? ` Note: ${note}` : ''}`,
      type: 'finance_review_submitted',
      metadata: { module, recordId: String(doc._id), amount: amount || 0, action: 'review', path: `/finance/dashboard/review` },
      sourceEmployee: actor || undefined,
    })));
}

// The head approved or returned it -> tell whoever submitted it.
async function reviewDecided({ module, doc, decision, decidedByName, title, note, submittedBy }) {
  if (!submittedBy) return 0;
  const approved = decision === 'approve';
  return send([{
    manager: submittedBy,
    department: 'Finance',
    title: `${label(module)} ${approved ? 'approved' : 'returned for changes'}`,
    message: approved
      ? `${decidedByName || 'The finance head'} approved ${title}.`
      : `${decidedByName || 'The finance head'} returned ${title}: ${note || 'no reason given'}`,
    type: approved ? 'finance_review_approved' : 'finance_review_returned',
    metadata: { module, recordId: String(doc._id), decision, path: '/finance/dashboard/review' },
  }]);
}

// An expense moved stage -> tell the person who raised it.
async function expenseDecided({ expense, action, actorName, comment }) {
  if (!expense.submittedBy) return 0;
  const past = { approve: 'approved', reject: 'rejected', verify: 'verified', request_information: 'sent back for more information', complete: 'paid out', cancel: 'cancelled', process: 'queued for payment' }[action];
  if (!past) return 0;
  return send([{
    manager: expense.submittedBy,
    department: expense.department || 'Finance',
    title: `Expense ${past}`,
    message: `${actorName || 'A reviewer'} ${past} your claim "${expense.title}".${comment ? ` Note: ${comment}` : ''}`,
    type: `finance_expense_${action}`,
    metadata: { module: 'expense', recordId: String(expense._id), action, path: '/finance/dashboard/expenses' },
  }]);
}

// A budget crossed an alert level -> tell the finance heads once per crossing.
async function budgetAlert({ budget, alert }) {
  const heads = await recipientIds();
  return send(heads.map((id) => ({
    manager: id,
    department: budget.department || 'Finance',
    title: alert.level >= 100 ? 'Budget fully consumed' : `Budget at ${alert.level}%`,
    message: alert.message,
    type: 'finance_budget_alert',
    metadata: { module: 'budget', recordId: String(budget._id), level: alert.level, utilization: alert.utilization, path: '/finance/dashboard/budgets' },
  })));
}

// An invoice has gone past due: tell every finance head, and the project's own manager
// where the invoice carries a project. Collection is the manager's problem as much as
// finance's, and an escalation only finance sees tends not to get chased.
async function overdueInvoices({ invoices = [], thresholdDays }) {
  if (!invoices.length) return 0;
  const heads = await recipientIds();
  const currency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(amount) || 0);
  const rows = [];
  for (const invoice of invoices) {
    const days = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86400000);
    const message = `${invoice.invoiceNumber} for ${invoice.clientName || 'a customer'} is ${days} day${days === 1 ? '' : 's'} overdue with ${currency(invoice.balanceDue)} outstanding.`;
    const metadata = {
      module: 'invoice',
      recordId: String(invoice._id),
      daysOverdue: days,
      thresholdDays,
      path: `/finance/dashboard/invoices/${invoice._id}`,
    };
    // De-duplicated per recipient: a project manager who is also a finance head gets one
    // notification, not two.
    const recipients = new Set(heads.map(String));
    if (invoice.projectManager) recipients.add(String(invoice.projectManager));
    for (const id of recipients) {
      rows.push({
        manager: id,
        department: 'Finance',
        title: 'Overdue invoice needs collection',
        message,
        type: 'finance_overdue_invoice',
        metadata,
      });
    }
  }
  return send(rows);
}

module.exports = { submittedForReview, reviewDecided, expenseDecided, budgetAlert, overdueInvoices, FINANCE_HEAD_ROLES };
