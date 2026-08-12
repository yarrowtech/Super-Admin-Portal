const logger = require("../utils/logger");
const { runWithRequestContext, setRequestContext } = require("../logger/context");
const { sanitizeForLog } = require("../logger/sanitize");
const logService = require("../services/log.service");

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

const toEventName = (req, statusCode) => {
  const method = String(req.method || "").toUpperCase();
  const path = String(req.originalUrl || req.path || "").toLowerCase();
  const action = inferAction(req);
  const module = inferModule(path);

  if (path.includes("/auth/login") || path.includes("/auth/outsourcing/login") || path.includes("/auth/logout") || path.includes("/auth/refresh-token")) {
    return null;
  }
  if (statusCode < 400 && path.includes("/users")) {
    return null;
  }

  if (statusCode === 401) return "UNAUTHORIZED";
  if (statusCode === 403) return "FORBIDDEN";
  if (statusCode === 404) return "NOT_FOUND";
  if (statusCode === 400 || statusCode === 422) return "VALIDATION_ERROR";
  if (statusCode >= 500) return "API_ERROR";
  if (method === "GET") return null;

  if (module === "users" || path.includes("/users")) {
    if (method === "POST") return "USER_CREATED";
    if (method === "DELETE") return "USER_DELETED";
    if (path.includes("role")) return "ROLE_CHANGED";
    if (path.includes("permission")) return "PERMISSION_CHANGED";
    return "USER_UPDATED";
  }

  if (module === "projects" || path.includes("/projects") || path.includes("/project")) {
    if (method === "POST") return "PROJECT_CREATED";
    if (method === "DELETE") return "PROJECT_DELETED";
    return "PROJECT_UPDATED";
  }

  return `${module}_${action}`.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase();
};

const toHumanMessage = (event, req, statusCode) => {
  if (!event) return "";
  if (event === "API_ERROR") return `${req.method} ${req.originalUrl || req.path} failed`;
  if (event === "VALIDATION_ERROR") return `${req.method} ${req.originalUrl || req.path} validation failed`;
  if (event === "UNAUTHORIZED") return "Request rejected: authentication required";
  if (event === "FORBIDDEN") return "Request rejected: insufficient permissions";
  if (event === "NOT_FOUND") return "Route not found";
  if (event === "USER_CREATED") return "User created successfully";
  if (event === "USER_UPDATED") return "User updated successfully";
  if (event === "USER_DELETED") return "User deleted successfully";
  if (event === "ROLE_CHANGED") return "User role updated";
  if (event === "PERMISSION_CHANGED") return "User permissions updated";
  if (event === "PROJECT_CREATED") return "Project created successfully";
  if (event === "PROJECT_UPDATED") return "Project updated successfully";
  if (event === "PROJECT_DELETED") return "Project deleted successfully";
  return `${req.method} ${req.originalUrl || req.path} completed with status ${statusCode}`;
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

      const event = req.systemErrorLogged ? null : toEventName(req, res.statusCode);
      if (event) {
        logService.fireAndForgetFromRequest(req, {
          level: res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
          event,
          message: toHumanMessage(event, req, res.statusCode),
          emit: false,
          module,
          action,
          statusCode: res.statusCode,
          durationMs: roundedDurationMs,
          metadata: {
            status,
          },
        });
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
