const logger = require("../../utils/logger");
const financeService = require("./finance.service");

exports.getOverview = async (req, res) => {
  try {
    const data = await financeService.getOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module getOverview error");
    res.status(500).json({ success: false, error: "Failed to fetch finance overview", details: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const data = await financeService.listTransactions(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module getTransactions error");
    res.status(500).json({ success: false, error: "Failed to fetch transactions", details: err.message });
  }
};

exports.createExpenseRequest = async (req, res) => {
  try {
    const data = await financeService.createExpenseRequest({
      payload: req.body || {},
      actor: {
        id: req.user?.id || req.user?._id,
        role: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module createExpenseRequest error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to create expense request", details: err.message });
  }
};

exports.decideExpenseRequest = async (req, res) => {
  try {
    const data = await financeService.decideExpenseRequest({
      workflowId: req.params.workflowId,
      decision: req.body?.decision,
      remarks: req.body?.remarks || "",
      actor: { id: req.user?.id || req.user?._id, role: req.user?.role },
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module decideExpenseRequest error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to decide expense request", details: err.message });
  }
};

exports.triggerPayrollFromHr = async (req, res) => {
  try {
    const data = await financeService.triggerPayrollFromHr({
      payload: req.body || {},
      actor: { id: req.user?.id || req.user?._id, role: req.user?.role },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module triggerPayrollFromHr error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to trigger payroll", details: err.message });
  }
};

exports.createContractLinkedInvoice = async (req, res) => {
  try {
    const data = await financeService.createContractLinkedInvoice({
      invoiceId: req.params.invoiceId,
      payload: req.body || {},
      actor: { id: req.user?.id || req.user?._id, role: req.user?.role },
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    logger.error({ err }, "Finance module createContractLinkedInvoice error");
    res.status(err.statusCode || 500).json({ success: false, error: "Failed to create linked contract", details: err.message });
  }
};
