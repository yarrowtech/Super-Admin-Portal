const crypto = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("./logger");

const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const requestId = (typeof incoming === "string" && incoming.trim()) || crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: (req) => ({
    requestId: req.id,
    route: req.route?.path || req.path,
  }),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req) => `${req.method} ${req.url} completed`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed: ${err.message}`,
});

module.exports = requestLogger;

