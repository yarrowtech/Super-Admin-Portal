const logger = require("../utils/logger");
const { runWithRequestContext, setRequestContext } = require("../logger/context");
const { sanitizeForLog } = require("../logger/sanitize");

const METHOD_ACTION = {
  GET: "read",
  POST: "create",
  PUT: "update",
  PATCH: "update",
  DELETE: "delete",
};

const MODULE_PATTERNS = [
  [/\/auth\b/, "authentication"],
  [/\/sso\b|\/external-auth\b/, "authentication"],
  [/\/dept\/admin\b|\/admin\b/, "admin"],
  [/\/super-admin\b|\/dept\/super-admin\b/, "super-admin"],
  [/\/dept\/ceo\b|\/ceo\b/, "ceo"],
  [/\/dept\/hr\b|\/hr\b|\/attendance\b/, "hr"],
  [/\/dept\/finance\b|\/finance\b/, "finance"],
  [/\/dept\/it\b|\/it\b/, "it"],
  [/\/dept\/law\b|\/law\b|\/legal\b/, "law"],
  [/\/dept\/media\b|\/media\b/, "media"],
  [/\/dept\/sales\b|\/sales\b/, "sales"],
  [/\/dept\/manager\b|\/manager\b/, "manager"],
  [/\/dept\/employee\b|\/employee\b/, "employee"],
  [/\/notifications\b/, "notifications"],
  [/\/chat\b/, "chat"],
  [/\/reports\b|\/analytics\b/, "reports"],
  [/\/project|\/projects/, "projects"],
  [/\/portal-support\b/, "portal-support"],
  [/\/outsourcing\b/, "outsourcing"],
  [/\/integrations\b|\/efnbmms\b|\/edifyeight\b/, "external-api"],
  [/\/dashboard\b/, "dashboard"],
  [/\/profile\b/, "users"],
  [/\/automation\b/, "automation"],
];

const inferModule = (path = "") => {
  const normalized = String(path).toLowerCase();
  const match = MODULE_PATTERNS.find(([pattern]) => pattern.test(normalized));
  return match?.[1] || "api";
};

const inferAction = (req) => {
  const path = String(req.originalUrl || req.path || "").toLowerCase();
  if (path.includes("approve")) return "approve";
  if (path.includes("reject")) return "reject";
  if (path.includes("assign") || path.includes("reassign")) return "assign";
  if (path.includes("permission")) return "permission_change";
  if (path.includes("role")) return "role_change";
  if (path.includes("status")) return "status_change";
  if (path.includes("login")) return "login";
  if (path.includes("logout")) return "logout";
  if (path.includes("refresh")) return "refresh";
  if (path.includes("upload")) return "upload";
  if (path.includes("download") || path.includes("export")) return "export";
  return METHOD_ACTION[req.method] || "request";
};

const requestContextMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const module = inferModule(req.originalUrl || req.path);
  const action = inferAction(req);
  const context = {
    requestId: req.id || req.headers["x-request-id"] || null,
    module,
    action,
    status: "started",
    userId: null,
    role: null,
    method: req.method,
    path: req.originalUrl || req.path,
  };

  runWithRequestContext(context, () => {
    req.logContext = context;
    req.updateLogContext = setRequestContext;
    if (req.log?.child) {
      req.log = req.log.child({ requestId: context.requestId, module, action });
    }

    logger.trace(
      {
        module,
        action,
        requestId: context.requestId,
        method: req.method,
        path: req.originalUrl || req.path,
        status: "received",
        query: sanitizeForLog(req.query || {}),
      },
      "Request received"
    );

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const status = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "failed" : "success";
      const roundedDurationMs = Math.round(durationMs * 100) / 100;
      setRequestContext({
        status,
        userId: req.user?.id || req.user?._id || null,
        role: req.user?.role || null,
      });
      logger.info(
        {
          requestId: context.requestId,
          userId: req.user?.id || req.user?._id || null,
          role: req.user?.role || null,
          module,
          action,
          status,
          method: req.method,
          path: req.originalUrl || req.path,
          statusCode: res.statusCode,
          durationMs: roundedDurationMs,
        },
        "Request performance"
      );
      const slowRequestMs = Math.max(1, Number(process.env.SLOW_REQUEST_MS) || 1000);
      if (roundedDurationMs >= slowRequestMs) {
        logger.warn(
          {
            requestId: context.requestId,
            userId: req.user?.id || req.user?._id || null,
            role: req.user?.role || null,
            module,
            action,
            method: req.method,
            path: req.originalUrl || req.path,
            statusCode: res.statusCode,
            durationMs: roundedDurationMs,
            thresholdMs: slowRequestMs,
          },
          "Slow request"
        );
      }
    });

    next();
  });
};

module.exports = {
  requestContextMiddleware,
  inferModule,
  inferAction,
};
