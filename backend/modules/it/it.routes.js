const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./it.controller");
const v = require("./it.validation");

const router = express.Router();

router.use(authenticate);
router.use(
  authorize(
    ROLES.IT,
    ROLES.IT_ADMIN,
    ROLES.SYSTEM_OPERATOR,
    ROLES.SECURITY_ANALYST,
    ROLES.DEVOPS_ENGINEER,
    ROLES.EMPLOYEE,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  )
);
router.use(authorizePortalAccess("it"));

const canManageIt = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["it_admin", "it", "admin", "super_admin", "system_operator", "security_analyst", "devops_engineer"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Insufficient role for IT management action" });
};

router.get("/overview", controller.getOverview);
router.get("/assets", v.listValidation, validate, controller.getAssets);
router.post("/assets", canManageIt, v.createAssetValidation, validate, controller.createAsset);
router.get("/assets/:id", v.idValidation, validate, controller.getAssetById);
router.put("/assets/:id", canManageIt, v.idValidation, validate, controller.updateAsset);
router.delete("/assets/:id", canManageIt, v.idValidation, validate, controller.deleteAsset);
router.get("/tickets", v.listValidation, validate, controller.getTickets);
router.post("/tickets", v.createTicketValidation, validate, controller.createTicket);
router.get("/tickets/:id", v.idValidation, validate, controller.getTicketById);
router.put("/tickets/:id", canManageIt, v.idValidation, validate, controller.updateTicket);
router.delete("/tickets/:id", canManageIt, v.idValidation, validate, controller.deleteTicket);
router.patch("/tickets/:id/status", canManageIt, v.ticketStatusValidation, validate, controller.updateTicketStatus);
router.post("/access-requests", v.accessRequestValidation, validate, controller.requestSystemAccess);
router.patch("/access-requests/:workflowId/decision", canManageIt, v.accessDecisionValidation, validate, controller.decideSystemAccess);

module.exports = router;
