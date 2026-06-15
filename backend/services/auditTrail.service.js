const ActivityLog = require("../models/auth/ActivityLog");
const FinanceAuditLog = require("../models/finance/AuditLog");

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

  const [activity] = await Promise.all([
    ActivityLog.create({
      actor: userId || null,
      user: userId || null,
      module,
      action,
      targetType: targetType || module,
      targetId: targetId ? String(targetId) : "",
      metadata,
      ipAddress,
      userAgent,
    }),
    FinanceAuditLog.create({
      actor: userId || null,
      actorRole: role || "",
      action,
      resourceType: targetType || module,
      resourceId: targetId ? String(targetId) : "",
      meta: { module, ...metadata },
      riskFlag,
    }),
  ]);

  return activity;
};

module.exports = { writeAuditTrail };
