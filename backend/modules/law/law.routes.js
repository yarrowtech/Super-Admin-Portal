const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./law.controller");
const v = require("./law.validation");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.LAW, ROLES.LEGAL_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.EMPLOYEE, ROLES.AUDITOR, ROLES.FINANCE, ROLES.FINANCE_MANAGER));
router.use(authorizePortalAccess("law"));

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

router.get("/overview", controller.getOverview);
router.get("/projects", v.listValidation, validate, controller.getProjects);
router.get("/contracts", v.listValidation, validate, controller.getContracts);
router.post("/contracts", canManageLawContract, v.createContractValidation, validate, controller.createContract);
router.get("/contracts/:id", v.contractIdValidation, validate, controller.getContractById);
router.put("/contracts/:id", canManageLawContract, v.contractIdValidation, validate, controller.updateContract);
router.delete("/contracts/:id", canManageLawContract, v.contractIdValidation, validate, controller.deleteContract);
router.post("/contracts/:id/approval-request", canManageLawContract, v.contractIdValidation, validate, controller.createContractApproval);
router.patch("/contracts/approval/:workflowId/decision", canDecideLawApproval, v.contractDecisionValidation, validate, controller.decideContractApproval);
router.get("/compliance-snapshot", controller.getComplianceSnapshot);
router.post("/disputes", v.disputeValidation, validate, controller.raiseDispute);
router.get("/security-compliance-logs", v.listValidation, validate, controller.getSecurityComplianceLogs);
router.get("/:moduleKey/project/:projectId", v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
