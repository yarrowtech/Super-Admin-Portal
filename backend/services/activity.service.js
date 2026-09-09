const ActivityLog = require("../models/auth/ActivityLog");
const logger = require("../utils/logger");
const { getRequestContext } = require("../logger/context");
const { sanitizeForLog } = require("../logger/sanitize");
const logService = require("./log.service");

const NAV_EVENTS = new Set(["PAGE_VIEW", "PORTAL_ENTER", "TAB_VIEW"]);
const ACTION_EVENTS = new Set([
  "SEARCH",
  "FILTER",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
  "REJECT",
  "DOWNLOAD",
  "UPLOAD",
  "EXPORT",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_DELETED",
  "USER_STATUS_CHANGED",
  "CAMPAIGN_CREATED",
  "CAMPAIGN_UPDATED",
  "CAMPAIGN_DELETED",
  "CONTENT_CREATED",
  "CONTENT_UPDATED",
  "CONTENT_PUBLISHED",
  "APPROVAL_APPROVED",
  "APPROVAL_REJECTED",
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_DOWNLOADED",
  "PROFILE_UPDATED",
  "PASSWORD_CHANGED",
]);

const cleanString = (value, max = 250) => {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeEvent = (value) => cleanString(value, 120).replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase();

const categoryForEvent = (event) => (NAV_EVENTS.has(event) ? "NAV" : "ACTION");

const messageForEvent = (event, payload = {}) => {
  if (event === "PAGE_VIEW") return "Page viewed";
  if (event === "PORTAL_ENTER") return "Portal entered";
  if (event === "TAB_VIEW") return "Tab viewed";
  const subject = cleanString(payload.entityType || payload.module || "Activity", 80).replace(/[_-]+/g, " ");
  const action = cleanString(payload.action || event, 80).replace(/[_-]+/g, " ").toLowerCase();
  return `${subject} ${action}`;
};

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === "function") return value.toHexString();
  return String(value);
};

const recordActivityFromRequest = async (req, payload = {}) => {
  const event = normalizeEvent(payload.event || payload.action);
  if (!event) {
    const error = new Error("Activity event is required");
    error.statusCode = 400;
    throw error;
  }

  if (!NAV_EVENTS.has(event) && !ACTION_EVENTS.has(event)) {
    const error = new Error("Unsupported activity event");
    error.statusCode = 422;
    throw error;
  }

  const context = getRequestContext();
  const userId = req.user?.id || req.user?._id;
  const sessionId = toLogId(req.authSessionId || context.sessionId);
  const category = categoryForEvent(event);
  const status = cleanString(payload.status, 40) || "success";
  const module = cleanString(payload.module, 160) || context.module || "activity";
  const portal = cleanString(payload.portal, 160) || context.portal || "";
  const page = cleanString(payload.page, 200);
  const frontendRoute = cleanString(payload.route || payload.frontendRoute, 500);
  const entityType = cleanString(payload.entityType || payload.targetType, 160);
  const entityId = cleanString(payload.entityId || payload.targetId, 160);
  const action = cleanString(payload.action, 160) || event;
  const metadata = sanitizeForLog({
    ...(payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {}),
    tab: cleanString(payload.tab, 160) || undefined,
    query: event === "SEARCH" ? cleanString(payload.query, 120) : undefined,
    filter: event === "FILTER" ? payload.filter : undefined,
  });

  const activity = await ActivityLog.create({
    actor: userId,
    user: userId,
    action,
    module,
    portal,
    role: req.user?.role || "",
    department: req.user?.department || "",
    requestId: req.id || req.headers["x-request-id"] || context.requestId || "",
    sessionId,
    status,
    page,
    frontendRoute,
    targetType: entityType || module,
    targetId: entityId,
    entityType,
    entityId,
    metadata,
    ipAddress: req.ip || req.socket?.remoteAddress || "",
    userAgent: req.get("user-agent") || "",
  });

  logger.info(
    {
      event: `activity.${event.toLowerCase()}`,
      category,
      requestId: req.id || req.headers["x-request-id"] || context.requestId || null,
      sessionId,
      userId: toLogId(userId),
      role: req.user?.role || null,
      department: req.user?.department || null,
      portal: portal || null,
      module,
      page: page || null,
      frontendRoute: frontendRoute || null,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      status,
    },
    messageForEvent(event, payload)
  );

  logService.fireAndForgetFromRequest(req, {
    level: "info",
    event,
    message: messageForEvent(event, payload),
    emit: false,
    source: "FRONTEND",
    module,
    action,
    portal,
    page,
    frontendRoute,
    entityType,
    entityId,
    targetId: entityId,
    statusCode: 202,
    sessionId,
    metadata: {
      category,
      status,
    },
  });

  return activity;
};

module.exports = {
  recordActivityFromRequest,
};
