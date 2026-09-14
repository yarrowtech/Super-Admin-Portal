const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { requireProjectContext, attachOptionalProjectContext } = require("../../middlewares/project.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./law.controller");
const v = require("./law.validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE));
router.use(authorizePortalAccess("law"));
router.use(attachOptionalProjectContext);

const canManageLawContract = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if ([ROLES.LAW_HEAD, ROLES.LAW_EMPLOYEE, ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot manage contracts" });
};
const canDecideLawApproval = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if ([ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot decide legal approvals" });
};

router.get("/overview", requireProjectContext, controller.getOverview);
router.get("/projects", v.listValidation, validate, controller.getProjects);
router.get("/contracts", requireProjectContext, v.listValidation, validate, controller.getContracts);
router.post("/contracts", requireProjectContext, canManageLawContract, v.createContractValidation, validate, controller.createContract);
router.get("/contracts/:id", requireProjectContext, v.contractIdValidation, validate, controller.getContractById);
router.put("/contracts/:id", requireProjectContext, canManageLawContract, v.contractIdValidation, validate, controller.updateContract);
router.delete("/contracts/:id", requireProjectContext, canManageLawContract, v.contractIdValidation, validate, controller.deleteContract);
router.post("/contracts/:id/approval-request", requireProjectContext, canManageLawContract, v.contractIdValidation, validate, controller.createContractApproval);
router.patch("/contracts/approval/:workflowId/decision", canDecideLawApproval, v.contractDecisionValidation, validate, controller.decideContractApproval);
router.get("/compliance-snapshot", requireProjectContext, controller.getComplianceSnapshot);
router.post("/disputes", requireProjectContext, v.disputeValidation, validate, controller.raiseDispute);

// Generic Law-record CRUD — Compliance (Privacy & Policy, IP & Copyright),
// Risk (Disputes & Fraud), and non-outsourcing Contracts (Agreements, Work
// on Hire, Third Party). Project scope comes from attachOptionalProjectContext
// above, same as compliance-snapshot — optional here since a record can also
// be company-wide.
router.get("/records", v.listValidation, validate, controller.getRecords);
router.post("/records", v.createRecordValidation, validate, controller.createRecord);
router.get("/records/:id", v.recordIdValidation, validate, controller.getRecordById);
router.put("/records/:id", v.updateRecordValidation, validate, controller.updateRecord);
router.delete("/records/:id", v.recordIdValidation, validate, controller.deleteRecord);
router.get("/security-compliance-logs", requireProjectContext, v.listValidation, validate, controller.getSecurityComplianceLogs);
router.get("/:moduleKey/project/:projectId", requireProjectContext, v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
