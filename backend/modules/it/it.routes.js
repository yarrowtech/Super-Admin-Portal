const express = require("express");
const { authenticate, authorize, authorizePortalAccess } = require("../../middlewares/auth.middleware");
const { requireProjectContext, attachOptionalProjectContext } = require("../../middlewares/project.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { ROLES } = require("../../config/roles");
const controller = require("./it.controller");
const v = require("./it.validation");

const router = express.Router();

router.use(authenticate);
router.use(
  authorize(
    ROLES.IT_MANAGER,
    ROLES.IT_ADMIN,
    ROLES.IT_EMPLOYEE,
    ROLES.IT_HR,
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN
  )
);
router.use(authorizePortalAccess("it"));
router.use(attachOptionalProjectContext);

const canManageIt = (req, res, next) => {
  const role = String(req.user?.role || "").toLowerCase();
  if (["it_manager", "it_admin", "admin", "super_admin"].includes(role)) return next();
  return res.status(403).json({ success: false, error: "Insufficient role for IT management action" });
};

router.get("/overview", requireProjectContext, controller.getOverview);
router.get("/assets", requireProjectContext, v.listValidation, validate, controller.getAssets);
router.post("/assets", requireProjectContext, canManageIt, v.createAssetValidation, validate, controller.createAsset);
router.get("/assets/:id", requireProjectContext, v.idValidation, validate, controller.getAssetById);
router.put("/assets/:id", requireProjectContext, canManageIt, v.idValidation, validate, controller.updateAsset);
router.delete("/assets/:id", requireProjectContext, canManageIt, v.idValidation, validate, controller.deleteAsset);
router.get("/tickets", requireProjectContext, v.listValidation, validate, controller.getTickets);
router.post("/tickets", requireProjectContext, v.createTicketValidation, validate, controller.createTicket);
router.get("/tickets/:id", requireProjectContext, v.idValidation, validate, controller.getTicketById);
router.put("/tickets/:id", requireProjectContext, canManageIt, v.idValidation, validate, controller.updateTicket);
router.delete("/tickets/:id", requireProjectContext, canManageIt, v.idValidation, validate, controller.deleteTicket);
router.patch("/tickets/:id/status", requireProjectContext, canManageIt, v.ticketStatusValidation, validate, controller.updateTicketStatus);
router.post("/access-requests", requireProjectContext, v.accessRequestValidation, validate, controller.requestSystemAccess);
router.patch("/access-requests/:workflowId/decision", requireProjectContext, canManageIt, v.accessDecisionValidation, validate, controller.decideSystemAccess);

module.exports = router;
