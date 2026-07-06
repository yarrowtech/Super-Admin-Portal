// Pure budget math — no DB access, fully unit-testable in isolation.

const computeRemaining = (totalBudget = 0, usedBudget = 0) => Math.max(0, Number(totalBudget) - Number(usedBudget));

const computeROI = (revenue = 0, spend = 0) => {
  if (!spend) return 0;
  return ((Number(revenue) - Number(spend)) / Number(spend)) * 100;
};

const computeROAS = (revenue = 0, spend = 0) => {
  if (!spend) return 0;
  return Number(revenue) / Number(spend);
};

const computeCPL = (spend = 0, leads = 0) => {
  if (!leads) return 0;
  return Number(spend) / Number(leads);
};

module.exports = {
  computeRemaining,
  computeROI,
  computeROAS,
  computeCPL,
};
