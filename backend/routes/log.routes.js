const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/roles");
const logsController = require("../controllers/systemLogs.controller");

const router = express.Router();

router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get("/", logsController.listLogs);
// Declared before "/:id" so the literal path is not captured as an ID.
router.get("/stats", logsController.logStats);
router.get("/:id", logsController.getLogById);

module.exports = router;
