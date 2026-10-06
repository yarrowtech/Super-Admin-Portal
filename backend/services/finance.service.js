const Invoice = require('../models/finance/Invoice');
const Expense = require('../models/finance/Expense');
const Budget = require('../models/finance/Budget');

const getFinanceSummary = async () => {
  const [invoices, expenses, budgets] = await Promise.all([
    Invoice.countDocuments(),
    Expense.countDocuments(),
    Budget.countDocuments(),
  ]);

  return { invoices, expenses, budgets };
};

module.exports = {
  getFinanceSummary,
};
