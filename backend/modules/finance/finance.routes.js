const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { requireProjectContext, attachOptionalProjectContext } = require("../../middlewares/project.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./finance.controller");
const v = require("./finance.validation");

const router = express.Router();
const canWriteFinance = (req, res, next) => ['finance_manager', 'finance_employee', 'admin', 'super_admin'].includes(req.user?.role) ? next() : res.status(403).json({ success: false, error: 'Read-only finance access' });

router.use(authenticate);
router.use(
  authorize(
    ROLES.FINANCE_MANAGER,
    ROLES.FINANCE_EMPLOYEE,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.CEO
  )
);
router.use(authorizePortalAccess("finance"));
router.use(attachOptionalProjectContext);

router.get("/overview", requireProjectContext, controller.getOverview);
router.get("/transactions", requireProjectContext, v.listValidation, validate, controller.getTransactions);
router.post("/invoices/:invoiceId/link-contract", requireProjectContext, canWriteFinance, v.linkContractValidation, validate, controller.createContractLinkedInvoice);

module.exports = router;
