const logger = require("./logger");

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === "function") return value.toHexString();
  return String(value);
};

const errorLogger = (err, req, statusCode) => {
  const error = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Request failed");

  logger.error(
    {
      event: "http.request.error",
      category: "API",
      err: error,
      statusCode: statusCode || 500,
      route: (req.originalUrl || req.path || "").split(/[?#]/)[0],
      method: req.method,
      requestId: req.id || req.headers["x-request-id"] || null,
      module: req.logContext?.module || null,
      action: req.logContext?.action || null,
      status: "error",
      userId: toLogId(req.user?.id),
      role: req.user?.role || null,
      department: req.user?.department || null,
      portal: req.logContext?.portal || null,
      ip: req.ip || req.socket?.remoteAddress || null,
    },
    "Request failed"
  );
};

module.exports = errorLogger;

