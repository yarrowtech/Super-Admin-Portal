const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./finance.controller");
const v = require("./finance.validation");

const router = express.Router();
const canWriteFinance = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["auditor", "employee"].includes(role)) return res.status(403).json({ success: false, error: "Read-only role for this finance action" });
  return next();
};

router.use(authenticate);
router.use(
  authorize(
    ROLES.FINANCE,
    ROLES.FINANCE_MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.AUDITOR,
    ROLES.EMPLOYEE,
    ROLES.HR,
    ROLES.MANAGER,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CEO
  )
);
router.use(authorizePortalAccess("finance"));

router.get("/overview", controller.getOverview);
const canDecideFinance = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["manager", "finance_manager", "admin", "super_admin"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot decide finance approvals" });
};
const canTriggerPayroll = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["hr", "finance_manager", "admin", "super_admin"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot trigger payroll" });
};

router.get("/transactions", v.listValidation, validate, controller.getTransactions);
router.post("/expenses", canWriteFinance, v.createExpenseValidation, validate, controller.createExpenseRequest);
router.patch("/expenses/:workflowId/decision", canDecideFinance, v.decisionValidation, validate, controller.decideExpenseRequest);
router.post("/payroll/hr-trigger", canTriggerPayroll, v.payrollTriggerValidation, validate, controller.triggerPayrollFromHr);
router.post("/invoices/:invoiceId/link-contract", canWriteFinance, v.linkContractValidation, validate, controller.createContractLinkedInvoice);

module.exports = router;
