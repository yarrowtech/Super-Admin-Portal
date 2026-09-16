// Utilization % cutoffs used to derive a department's financial health status.
// Wrapped in a function (not exported as a raw constant) so a later phase can swap the
// body for a DB-backed settings lookup without changing any call site.
const DEPARTMENT_BUDGET_STATUS_THRESHOLDS = Object.freeze({
  WATCH: 60,
  WARNING: 80,
  CRITICAL: 95,
});

const getFinanceStatusThresholds = () => DEPARTMENT_BUDGET_STATUS_THRESHOLDS;

module.exports = { getFinanceStatusThresholds };
