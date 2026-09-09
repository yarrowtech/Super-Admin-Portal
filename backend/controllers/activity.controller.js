const env = require("../config/env");
const { recordActivityFromRequest } = require("../services/activity.service");

exports.recordActivity = async (req, res) => {
  if (!env.LOG_PAGE_ACTIVITY && ["PAGE_VIEW", "PORTAL_ENTER", "TAB_VIEW"].includes(String(req.body?.event || "").toUpperCase())) {
    return res.status(204).end();
  }
  if (!env.LOG_BUSINESS_ACTIVITY && !["PAGE_VIEW", "PORTAL_ENTER", "TAB_VIEW"].includes(String(req.body?.event || "").toUpperCase())) {
    return res.status(204).end();
  }

  try {
    await recordActivityFromRequest(req, req.body || {});
    return res.status(202).json({ success: true });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      error: statusCode >= 500 ? "Failed to record activity" : error.message,
      code: statusCode >= 500 ? "ACTIVITY_RECORD_ERROR" : "INVALID_ACTIVITY",
    });
  }
};
