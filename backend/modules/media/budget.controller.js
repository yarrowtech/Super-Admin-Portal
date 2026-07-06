const logger = require('../../utils/logger');
const budgetService = require('./budget.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });
};

exports.getAllocation = async (req, res) => {
  try {
    const data = await budgetService.getAllocation(req.projectId);
    res.status(200).json({ success: true, data: data || null });
  } catch (err) {
    handleError(res, err, 'Failed to fetch budget allocation', 'Budget module getAllocation error');
  }
};

exports.upsertAllocation = async (req, res) => {
  try {
    const data = await budgetService.upsertAllocation(req.projectId, req.body || {}, req.user?.id || req.user?._id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update budget allocation', 'Budget module upsertAllocation error');
  }
};

exports.addExpense = async (req, res) => {
  try {
    const data = await budgetService.addExpense(req.projectId, req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to record expense', 'Budget module addExpense error');
  }
};

exports.listExpenses = async (req, res) => {
  try {
    const data = await budgetService.listExpenses(req.projectId, req.query || {});
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch expenses', 'Budget module listExpenses error');
  }
};

exports.getSummary = async (req, res) => {
  try {
    const data = await budgetService.getBudgetSummary(req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch budget summary', 'Budget module getSummary error');
  }
};
