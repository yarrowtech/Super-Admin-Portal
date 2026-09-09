const errorLogger = require("../logger/errorLogger");
const logService = require("../services/log.service");

const mapMongoAndJwtError = (err) => {
  if (!err) return { statusCode: 500, message: "Internal server error" };

  if (err.name === "VersionError") return { statusCode: 409, message: "Record changed; reload and retry" };

  if (err.name === "CastError") {
    return { statusCode: 400, message: "Invalid record ID or field type" };
  }

  if (err.code === 11000) {
    return { statusCode: 409, message: "Duplicate field value detected" };
  }

  if (err.name === "ValidationError") {
    return {
      statusCode: 400,
      message: Object.values(err.errors || {})
        .map((item) => item.message)
        .join(", ") || "Validation failed",
    };
  }

  if (err.name === "JsonWebTokenError") {
    return { statusCode: 401, message: "Invalid token" };
  }

  if (err.name === "TokenExpiredError") {
    return { statusCode: 401, message: "Token expired" };
  }

  return {
    statusCode: err.statusCode || 500,
    message: err.message || "Internal server error",
  };
};

const errorMiddleware = (err, req, res, next) => {
  const mapped = mapMongoAndJwtError(err);
  errorLogger(err, req, mapped.statusCode);
  req.systemErrorLogged = true;
  logService.fireAndForgetFromRequest(req, {
    level: mapped.statusCode >= 500 ? "error" : "warn",
    event: mapped.statusCode === 400 ? "VALIDATION_ERROR" : mapped.statusCode === 401 ? "UNAUTHORIZED" : mapped.statusCode === 403 ? "FORBIDDEN" : "API_ERROR",
    message: mapped.statusCode >= 500 ? `${req.method} ${req.originalUrl || req.path} failed` : mapped.message,
    emit: false,
    module: req.logContext?.module || 'api',
    action: req.logContext?.action || 'request',
    statusCode: mapped.statusCode,
    metadata: {
      status: 'error',
    },
    error: err,
  });

  res.status(mapped.statusCode).json({
    success: false,
    code: ({ 400: 'VALIDATION_ERROR', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN', 404: 'NOT_FOUND', 409: 'CONFLICT', 429: 'RATE_LIMITED' })[mapped.statusCode] || 'INTERNAL_ERROR',
    fields: err.name === 'ValidationError' ? Object.fromEntries(Object.entries(err.errors || {}).map(([key, value]) => [key, value.message])) : {},
    error:
      mapped.statusCode >= 500
        ? "Internal server error"
        : mapped.message,
  });
};

module.exports = errorMiddleware;
