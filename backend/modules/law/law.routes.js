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
  if (["law", "legal_head", "finance", "finance_manager", "admin", "super_admin"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot manage contracts" });
};
const canDecideLawApproval = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["legal_head", "admin", "super_admin"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Role cannot decide legal approvals" });
};

router.get("/overview", requireProjectContext, controller.getOverview);
router.get("/projects", v.listValidation, validate, controller.getProjects);
router.get("/contracts", requireProjectContext, v.listValidation, validate, controller.getContracts);
router.post("/contracts", requireProjectContext, canManageLawContract, v.createContractValidation, validate, controller.createContract);
router.get("/contracts/:id", requireProjectContext, v.contractIdValidation, validate, controller.getContractById);
router.put("/contracts/:id", requireProjectContext, canManageLawContract, v.contractIdValidation, validate, controller.updateContract);
router.delete("/contracts/:id", requireProjectContext, canManageLawContract, v.contractIdValidation, validate, controller.deleteContract);
router.post("/contracts/:id/approval-request", canManageLawContract, v.contractIdValidation, validate, controller.createContractApproval);
router.patch("/contracts/approval/:workflowId/decision", canDecideLawApproval, v.contractDecisionValidation, validate, controller.decideContractApproval);
router.get("/compliance-snapshot", requireProjectContext, controller.getComplianceSnapshot);
router.post("/disputes", requireProjectContext, v.disputeValidation, validate, controller.raiseDispute);
router.get("/security-compliance-logs", requireProjectContext, v.listValidation, validate, controller.getSecurityComplianceLogs);
router.get("/:moduleKey/project/:projectId", requireProjectContext, v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
