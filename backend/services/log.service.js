const mongoose = require("mongoose");
const logger = require("../utils/logger");
const SystemLog = require("../models/system/SystemLog");
const { sanitizeForLog } = require("../logger/sanitize");

const PERSISTED_LEVELS = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

const toObjectId = (value) => {
  if (!value) return undefined;
  const raw = String(value);
  return mongoose.Types.ObjectId.isValid(raw) ? new mongoose.Types.ObjectId(raw) : undefined;
};

const cleanString = (value, max = 1000) => {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  if (!text) return undefined;
  return text.length > max ? `${text.slice(0, max)}...` : text;
};

const getUserName = (user = {}) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return cleanString(user.name || user.fullName || name, 200);
};

const normalizeError = (error) => {
  if (!error) return null;
  const source = error instanceof Error ? error : error.err instanceof Error ? error.err : error;
  return sanitizeForLog({
    name: source.name || "Error",
    message: source.message || undefined,
    code: source.code || undefined,
    statusCode: source.statusCode || source.status || undefined,
  });
};

const normalizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object") return {};
  return sanitizeForLog(metadata);
};

const normalizeRoute = (value) => {
  const route = cleanString(value, 500);
  return route ? route.split("?")[0] : undefined;
};

const emitPino = (level, payload, message) => {
  const target = PERSISTED_LEVELS.has(level) ? level : "info";
  const fn = logger[target] || logger.info;
  fn.call(logger, payload, message);
};

const normalizePayload = (input = {}) => {
  const user = input.user || {};
  const userId = toObjectId(input.userId || user.id || user._id);
  const level = PERSISTED_LEVELS.has(input.level) ? input.level : "info";
  const event = cleanString(input.event || "APPLICATION_EVENT", 120)?.toUpperCase();
  const message = cleanString(input.message || event || "Application event", 500);

  const doc = {
    createdAt: input.createdAt instanceof Date ? input.createdAt : new Date(),
    level,
    event,
    message,
    userId,
    userName: cleanString(input.userName || getUserName(user), 200),
    userEmail: cleanString(input.userEmail || user.email, 320),
    role: cleanString(input.role || user.role, 120),
    department: cleanString(input.department || user.department, 160),
    module: cleanString(input.module, 160),
    action: cleanString(input.action, 160),
    requestId: cleanString(input.requestId, 160),
    method: cleanString(input.method, 16)?.toUpperCase(),
    route: normalizeRoute(input.route || input.path),
    statusCode: Number.isFinite(Number(input.statusCode)) ? Number(input.statusCode) : undefined,
    durationMs: Number.isFinite(Number(input.durationMs)) ? Number(input.durationMs) : undefined,
    ip: cleanString(input.ip, 160),
    userAgent: cleanString(input.userAgent, 500),
    metadata: normalizeMetadata(input.metadata),
    source: cleanString(input.source, 80),
    targetId: cleanString(input.targetId, 160),
    collection: cleanString(input.collection, 160),
    operation: cleanString(input.operation, 80),
    thresholdMs: Number.isFinite(Number(input.thresholdMs)) ? Number(input.thresholdMs) : undefined,
    error: normalizeError(input.error),
  };

  Object.keys(doc).forEach((key) => {
    if (doc[key] === undefined) delete doc[key];
  });

  return doc;
};

const create = async (input = {}) => {
  const doc = normalizePayload(input);
  const pinoPayload = {
    event: doc.event,
    requestId: doc.requestId,
    userId: doc.userId ? String(doc.userId) : undefined,
    userName: doc.userName,
    userEmail: doc.userEmail,
    role: doc.role,
    department: doc.department,
    module: doc.module,
    action: doc.action,
    method: doc.method,
    route: doc.route,
    statusCode: doc.statusCode,
    durationMs: doc.durationMs,
    ip: doc.ip,
    targetId: doc.targetId,
    source: doc.source,
    collection: doc.collection,
    operation: doc.operation,
    thresholdMs: doc.thresholdMs,
    metadata: doc.metadata,
    error: doc.error,
  };

  if (input.emit !== false) {
    emitPino(doc.level, pinoPayload, doc.message);
  }

  try {
    await SystemLog.create(doc);
  } catch (error) {
    logger.warn(
      {
        err: error,
        event: doc.event,
        requestId: doc.requestId,
      },
      "System log persistence failed"
    );
  }
};

const createFromRequest = (req, input = {}) => {
  const user = req?.user || {};
  const route =
    input.route ||
    `${req?.baseUrl || ""}${req?.route?.path && req.route.path !== "/" ? req.route.path : ""}` ||
    req?.originalUrl ||
    req?.path;
  return create({
    requestId: req?.id || req?.headers?.["x-request-id"] || input.requestId,
    method: req?.method,
    route,
    ip: req?.ip || req?.socket?.remoteAddress,
    userAgent: req?.get?.("user-agent"),
    user,
    userId: user.id || user._id,
    userName: input.userName,
    userEmail: input.userEmail || user.email,
    role: input.role || user.role,
    department: input.department || user.department,
    ...input,
  });
};

const fireAndForget = (input = {}) => {
  create(input).catch((error) => {
    logger.warn({ err: error }, "System log create failed");
  });
};

const fireAndForgetFromRequest = (req, input = {}) => {
  createFromRequest(req, input).catch((error) => {
    logger.warn({ err: error }, "System request log create failed");
  });
};

module.exports = {
  create,
  createFromRequest,
  fireAndForget,
  fireAndForgetFromRequest,
  normalizePayload,
};
