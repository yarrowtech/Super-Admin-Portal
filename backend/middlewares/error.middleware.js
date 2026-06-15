const errorLogger = require("../logger/errorLogger");

const mapMongoAndJwtError = (err) => {
  if (!err) return { statusCode: 500, message: "Internal server error" };

  if (err.name === "CastError") {
    return { statusCode: 400, message: `Invalid ${err.path}: ${err.value}` };
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

  res.status(mapped.statusCode).json({
    success: false,
    error:
      process.env.NODE_ENV === "production" && mapped.statusCode >= 500
        ? "Internal server error"
        : mapped.message,
  });
};

module.exports = errorMiddleware;
