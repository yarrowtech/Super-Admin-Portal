/**
 * Registry of datasets exposed over the MCP endpoint.
 *
 * Every entry is READ-ONLY. Adding a dataset here is the only way to widen
 * what the connected analytics product can see, which keeps the exposure
 * surface reviewable in one file.
 *
 * `redact` lists field paths stripped from every document before it leaves the
 * process. Secrets must never reach an external agent even when it is our own
 * product.
 */

const DATASETS = [
  // ---- CRM -------------------------------------------------------------
  { key: 'crm_clients', model: 'crm/CRMClient', domain: 'crm', description: 'CRM client companies with status, owner and lifecycle fields.' },
  { key: 'crm_contacts', model: 'crm/CRMContact', domain: 'crm', description: 'Individual contact people attached to CRM clients.' },
  { key: 'crm_followups', model: 'crm/CRMFollowUp', domain: 'crm', description: 'Scheduled and completed CRM follow-up activities.' },
  { key: 'crm_communications', model: 'crm/CRMCommunication', domain: 'crm', description: 'Logged calls, emails and meetings against CRM clients.' },
  { key: 'crm_vendors', model: 'crm/CRMVendor', domain: 'crm', description: 'Vendor records tracked in the CRM module.' },

  // ---- Delivery --------------------------------------------------------
  { key: 'projects', model: 'common/Project', domain: 'delivery', description: 'Projects with status, timeline, budget and assignment fields.' },
  { key: 'tasks', model: 'common/Task', domain: 'delivery', description: 'Tasks across projects, with assignee, status and due dates.' },
  { key: 'departments', model: 'department/Department', domain: 'delivery', description: 'Department master records.' },

  // ---- People ----------------------------------------------------------
  {
    key: 'users',
    model: 'auth/User',
    domain: 'people',
    description: 'Portal user accounts: role, department, status. Credentials are redacted.',
    redact: ['password', 'passwordHash', 'refreshToken', 'resetPasswordToken', 'resetPasswordExpires', 'twoFactorSecret', 'mfaSecret', 'otp', 'otpExpires'],
  },
  { key: 'hr_employee_records', model: 'hr/EmployeeRecord', domain: 'people', description: 'HR employee records: designation, joining date, employment status.' },
  { key: 'hr_attendance', model: 'hr/Attendance', domain: 'people', description: 'Daily attendance punches and derived hours.' },
  { key: 'hr_leaves', model: 'hr/Leave', domain: 'people', description: 'Leave applications with type, range and approval state.' },
  { key: 'hr_leave_balances', model: 'hr/LeaveBalance', domain: 'people', description: 'Per-employee leave balance ledger.' },
  { key: 'hr_holidays', model: 'hr/Holiday', domain: 'people', description: 'Company holiday calendar.' },
  { key: 'hr_job_posts', model: 'hr/JobPost', domain: 'people', description: 'Open and closed recruitment job posts.' },
  { key: 'hr_applicants', model: 'hr/Applicant', domain: 'people', description: 'Recruitment applicants and pipeline stage.' },
  { key: 'hr_appraisal_reviews', model: 'hr/AppraisalReview', domain: 'people', description: 'Performance appraisal reviews and ratings.' },
  { key: 'hr_work_reports', model: 'hr/StaffWorkReport', domain: 'people', description: 'Staff-submitted work reports.' },

  // ---- Finance ---------------------------------------------------------
  { key: 'finance_invoices', model: 'finance/Invoice', domain: 'finance', description: 'Sales invoices with totals, tax, status and due dates.' },
  { key: 'finance_payments', model: 'finance/Payment', domain: 'finance', description: 'Payments received or made, with method and reconciliation state.' },
  { key: 'finance_expenses', model: 'finance/Expense', domain: 'finance', description: 'Recorded business expenses by category and cost centre.' },
  { key: 'finance_budgets', model: 'finance/Budget', domain: 'finance', description: 'Budget allocations per period and cost centre.' },
  { key: 'finance_accounts', model: 'finance/Account', domain: 'finance', description: 'Chart of accounts.' },
  { key: 'finance_journal_entries', model: 'finance/JournalEntry', domain: 'finance', description: 'Double-entry journal lines.' },
  { key: 'finance_clients', model: 'finance/Client', domain: 'finance', description: 'Billing-side client records.' },
  { key: 'finance_vendors', model: 'finance/Vendor', domain: 'finance', description: 'Billing-side vendor records.' },
  { key: 'finance_refunds', model: 'finance/Refund', domain: 'finance', description: 'Issued refunds.' },
  { key: 'finance_disputes', model: 'finance/Dispute', domain: 'finance', description: 'Billing disputes and their resolution state.' },
  { key: 'finance_cost_centers', model: 'finance/CostCenter', domain: 'finance', description: 'Cost centre master data.' },
  { key: 'finance_periods', model: 'finance/FinancialPeriod', domain: 'finance', description: 'Accounting periods and their open/closed state.' },

  // ---- Outsourcing -----------------------------------------------------
  { key: 'outsourcing_jobs', model: 'outsourcing/OutsourcingJob', domain: 'outsourcing', description: 'Outsourced job postings and their state.' },
  { key: 'outsourcing_contracts', model: 'outsourcing/OutsourcingContract', domain: 'outsourcing', description: 'Freelancer contracts with rates and terms.' },
  { key: 'outsourcing_freelancers', model: 'outsourcing/OutsourcingFreelancer', domain: 'outsourcing', description: 'Freelancer profiles and skills.' },
  { key: 'outsourcing_milestones', model: 'outsourcing/OutsourcingMilestone', domain: 'outsourcing', description: 'Contract milestones and completion state.' },
  { key: 'outsourcing_payments', model: 'outsourcing/OutsourcingPayment', domain: 'outsourcing', description: 'Payments made to freelancers.' },
  { key: 'outsourcing_time_logs', model: 'outsourcing/OutsourcingTimeLog', domain: 'outsourcing', description: 'Freelancer time entries.' },

  // ---- Portfolio -------------------------------------------------------
  { key: 'portfolio_groups', model: 'portfolio/PortfolioGroup', domain: 'portfolio', description: 'Top level of the digital portfolio hierarchy.' },
  { key: 'portfolio_categories', model: 'portfolio/PortfolioCategory', domain: 'portfolio', description: 'Categories nested under portfolio groups.' },
  { key: 'portfolio_assets', model: 'portfolio/PortfolioAsset', domain: 'portfolio', description: 'Digital portfolio assets with status and ownership.' },
  { key: 'portfolio_tasks', model: 'portfolio/PortfolioTask', domain: 'portfolio', description: 'Tasks attached to portfolio assets.' },
  { key: 'portfolio_metric_entries', model: 'portfolio/PortfolioMetricEntry', domain: 'portfolio', description: 'Recorded metric values for portfolio assets.' },

  // ---- Operations ------------------------------------------------------
  { key: 'it_tickets', model: 'it/ITTicket', domain: 'operations', description: 'IT support tickets with priority and resolution state.' },
  { key: 'support_tickets', model: 'PortalSupportTicket', domain: 'operations', description: 'Portal support tickets raised by users.' },
  { key: 'law_contracts', model: 'law/LawContract', domain: 'operations', description: 'Legal contracts with parties, value and expiry.' },
  { key: 'policies', model: 'policy/Policy', domain: 'operations', description: 'Central policy records.' },
  { key: 'audit_logs', model: 'admin/AuditLog', domain: 'operations', description: 'Administrative audit trail entries.' },
];

// Fields stripped from every dataset regardless of registry config.
const GLOBAL_REDACT = [
  'password', 'passwordHash', 'hashedPassword', 'salt',
  'refreshToken', 'accessToken', 'token', 'apiKey', 'secret', 'secretHash',
  'keyHash', 'twoFactorSecret', 'mfaSecret', 'otp', 'otpSecret',
  'resetPasswordToken', 'resetToken', '__v',
];

let cache = null;

/**
 * Resolves registry entries to live Mongoose models. Entries whose model file
 * is missing are skipped with a warning rather than crashing boot — the
 * registry is intentionally broad and model files move.
 */
const getDatasets = (logger) => {
  if (cache) return cache;
  const resolved = new Map();
  for (const entry of DATASETS) {
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      const model = require(`../../models/${entry.model}`);
      if (!model || typeof model.find !== 'function') throw new Error('not a model');
      resolved.set(entry.key, {
        ...entry,
        modelRef: model,
        redact: Array.from(new Set([...(entry.redact || []), ...GLOBAL_REDACT])),
      });
    } catch (err) {
      logger?.warn?.({ dataset: entry.key, model: entry.model, err: err.message }, 'MCP dataset skipped');
    }
  }
  cache = resolved;
  return cache;
};

const stripRedacted = (doc, redact) => {
  if (!doc || typeof doc !== 'object') return doc;
  if (Array.isArray(doc)) return doc.map((item) => stripRedacted(item, redact));
  const out = {};
  for (const [key, value] of Object.entries(doc)) {
    if (redact.includes(key)) continue;
    out[key] = value && typeof value === 'object' ? stripRedacted(value, redact) : value;
  }
  return out;
};

module.exports = { DATASETS, GLOBAL_REDACT, getDatasets, stripRedacted };
