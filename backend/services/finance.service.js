const Invoice = require('../models/finance/Invoice');
const Expense = require('../models/finance/Expense');
const Budget = require('../models/finance/Budget');
const Payroll = require('../models/finance/Payroll');

const getFinanceSummary = async () => {
  const [invoices, expenses, budgets, payrolls] = await Promise.all([
    Invoice.countDocuments(),
    Expense.countDocuments(),
    Budget.countDocuments(),
    Payroll.countDocuments(),
  ]);

  return { invoices, expenses, budgets, payrolls };
};

module.exports = {
  getFinanceSummary,
};
