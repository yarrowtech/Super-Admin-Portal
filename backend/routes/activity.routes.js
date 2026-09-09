const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activity.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.post("/", authenticate, activityController.recordActivity);

module.exports = router;
