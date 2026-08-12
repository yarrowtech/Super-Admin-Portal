const ActivityLog = require("../models/auth/ActivityLog");
const AdminAuditLog = require("../models/admin/AuditLog");
const FinanceAuditLog = require("../models/finance/AuditLog");
const logger = require("../utils/logger");
const { getRequestContext } = require("../logger/context");
const { sanitizeForLog } = require("../logger/sanitize");

const writeAuditTrail = async ({
  userId,
  role = "",
  module = "system",
  action,
  targetType = "",
  targetId = "",
  metadata = {},
  ipAddress = "",
  userAgent = "",
  riskFlag = "none",
}) => {
  if (!action) return null;
  const context = getRequestContext();
  const safeMetadata = sanitizeForLog({
    requestId: context.requestId || metadata.requestId || null,
    status: context.status || metadata.status || "success",
    ...metadata,
  });

  const writes = [
    ActivityLog.create({
      actor: userId || null,
      user: userId || null,
      module,
      action,
      targetType: targetType || module,
      targetId: targetId ? String(targetId) : "",
      metadata: safeMetadata,
      ipAddress,
      userAgent,
    }),
  ];

  if (userId) {
    writes.push(AdminAuditLog.create({
      actor: userId,
      action,
      resource: targetType || module,
      resourceId: targetId ? String(targetId) : "",
      metadata: {
        module,
        role,
        ...safeMetadata,
      },
      ipAddress,
    }));
  }

  if (module === "finance") {
    writes.push(FinanceAuditLog.create({
      actor: userId || null,
      actorRole: role || "",
      action,
      resourceType: targetType || module,
      resourceId: targetId ? String(targetId) : "",
      meta: { module, ...safeMetadata },
      riskFlag,
    }));
  }

  const [activity] = await Promise.all(writes);

  logger.info(
    {
      requestId: context.requestId || safeMetadata.requestId || null,
      userId: userId || null,
      module,
      action,
      status: safeMetadata.status || "success",
      targetType: targetType || module,
      targetId: targetId ? String(targetId) : "",
    },
    "Business audit event recorded"
  );

  return activity;
};

module.exports = { writeAuditTrail };
