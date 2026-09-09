const crypto = require("crypto");
const pinoHttp = require("pino-http");
const logger = require("./logger");

const serializeReq = (req) => {
  const raw = req.raw || req;
  return {
    id: raw.id || req.id,
    method: raw.method,
    url: raw.url?.split(/[?#]/)[0],
    remoteAddress: raw.socket?.remoteAddress || raw.remoteAddress,
    remotePort: raw.socket?.remotePort || raw.remotePort,
  };
};

const serializeRes = (res) => {
  const raw = res.raw || res;
  return {
    statusCode: raw.statusCode,
  };
};

const toLogId = (value) => {
  if (!value) return null;
  if (typeof value.toHexString === "function") return value.toHexString();
  return String(value);
};

const requestLogger = pinoHttp({
  logger,
  autoLogging: false,
  serializers: {
    req: serializeReq,
    res: serializeRes,
  },
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const requestId = (typeof incoming === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(incoming) && incoming) || crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: (req) => ({
    requestId: req.id,
    sessionId: req.authSessionId || req.logContext?.sessionId || null,
    module: req.logContext?.module || null,
    action: req.logContext?.action || null,
    route: (req.originalUrl || req.path || "").split(/[?#]/)[0],
    userId: toLogId(req.user?.id),
    role: req.user?.role || null,
    department: req.user?.department || null,
    portal: req.logContext?.portal || null,
    ip: req.ip || req.socket?.remoteAddress || null,
  }),
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req) => `${req.method} ${req.url?.split(/[?#]/)[0]} completed`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url?.split(/[?#]/)[0]} failed: ${err?.message || "HTTP error"}`,
  quietReqLogger: true,
});

module.exports = requestLogger;

