const logger = require("./logger");

const errorLogger = (err, req, statusCode) => {
  const error = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Request failed");

  logger.error(
    {
      err: error,
      statusCode: statusCode || 500,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id || req.headers["x-request-id"] || null,
      userId: req.user?.id || null,
      role: req.user?.role || null,
      ip: req.ip || req.socket?.remoteAddress || null,
    },
    "Request failed"
  );
};

module.exports = errorLogger;

