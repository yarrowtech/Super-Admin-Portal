// Utilization % cutoffs used to derive a department's financial health status.
// Wrapped in a function (not exported as a raw constant) so a later phase can swap the
// body for a DB-backed settings lookup without changing any call site.
const DEPARTMENT_BUDGET_STATUS_THRESHOLDS = Object.freeze({
  WATCH: 60,
  WARNING: 80,
  CRITICAL: 95,
});

const getFinanceStatusThresholds = () => DEPARTMENT_BUDGET_STATUS_THRESHOLDS;

// An expense at or above this rupee amount cannot be submitted without a supporting
// document. Set FINANCE_RECEIPT_REQUIRED_ABOVE to change it; 0 requires a receipt on
// every claim. Enforced in the backend workflow, not just the form, so the rule holds
// for any client.
const DEFAULT_RECEIPT_REQUIRED_ABOVE = 500;
const getReceiptThreshold = () => {
  const configured = Number(process.env.FINANCE_RECEIPT_REQUIRED_ABOVE);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_RECEIPT_REQUIRED_ABOVE;
};

// Budget utilization percentages that raise an alert on the department budget.
const getBudgetAlertLevels = () => Object.freeze([80, 100]);

module.exports = { getFinanceStatusThresholds, getReceiptThreshold, getBudgetAlertLevels };
