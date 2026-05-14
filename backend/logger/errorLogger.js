const logger = require("./logger");

const errorLogger = (err, req) => {
  logger.error(
    {
      err,
      path: req.originalUrl,
      method: req.method,
      requestId: req.id || req.headers["x-request-id"] || null,
      userId: req.user?.id || null,
      role: req.user?.role || null,
    },
    "Request failed"
  );
};

module.exports = errorLogger;

