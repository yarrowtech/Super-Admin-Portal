const pinoPretty = require("pino-pretty");

const LEVEL_LABELS = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  fatal: "FATAL",
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

const COLORS = {
  dim: "\x1b[90m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

const colorForLevel = (level) => {
  if (level === "FATAL") return "magenta";
  if (level === "ERROR") return "red";
  if (level === "WARN") return "yellow";
  if (level === "INFO") return "green";
  return "cyan";
};

const paint = (name, text) => process.env.NO_COLOR === "true" ? text : `${COLORS[name] || ""}${text}${COLORS.reset}`;
const upper = (value, fallback = "") => String(value || fallback).toUpperCase();
const pad = (value, length) => String(value ?? "").padEnd(length).slice(0, length);
const toSafeId = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value.toHexString === "function") return value.toHexString();
  if (value._id) return toSafeId(value._id);
  if (value.id) return toSafeId(value.id);
  const text = String(value);
  return text === "[object Object]" ? "" : text;
};
const compactId = (value) => {
  const id = toSafeId(value);
  return id ? id.slice(0, 8) : "-";
};
const cleanPath = (value) => String(value || "-").split(/[?#]/)[0];

const formatTime = (time) => {
  const date = time ? new Date(time) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toTimeString().slice(0, 8) : date.toTimeString().slice(0, 8);
};

const formatDuration = (durationMs) => {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms)) return "-";
  return `${Math.round(ms)}ms`;
};

const categoryFor = (entry) => {
  if (entry.category) return upper(entry.category);
  if (entry.module === "authentication") return "AUTH";
  if (entry.module === "authorization") return "RBAC";
  if (entry.collection || entry.operation) return "DB";
  if (entry.event?.startsWith("http.")) return "HTTP";
  if (entry.event?.startsWith("perf.")) return "PERF";
  if (entry.source === "frontend") return "FRONTEND";
  if (entry.err || entry.error) return "API";
  return "SYSTEM";
};

const contextSuffix = (entry) => {
  const parts = [];
  if (entry.requestId) parts.push(`req=${compactId(entry.requestId)}`);
  if (entry.userId) parts.push(`user=${compactId(entry.userId)}`);
  if (entry.role) parts.push(`role=${entry.role}`);
  if (entry.department) parts.push(`dept=${entry.department}`);
  if (entry.portal) parts.push(`portal=${entry.portal}`);
  return parts.length ? paint("dim", parts.join(" ")) : "";
};

const formatHttp = (entry) => {
  const statusCode = entry.statusCode || entry.res?.statusCode || "-";
  return `${pad(entry.method, 6)} ${cleanPath(entry.route || entry.path || entry.url || entry.req?.url)} ${statusCode} ${formatDuration(entry.durationMs || entry.responseTime)}`;
};

const formatDb = (entry) => {
  if (!entry.collection && !entry.operation) return formatSystem(entry);
  const target = `${entry.collection || "unknown"}.${entry.operation || "query"}`;
  return `${target} ${formatDuration(entry.queryDurationMs || entry.durationMs)}`;
};

const formatPerf = (entry) => {
  if (entry.span) return `${entry.span} ${formatDuration(entry.durationMs)}`;
  return `${pad(entry.method, 6)} ${cleanPath(entry.route || entry.path)} ${entry.statusCode || "-"} ${formatDuration(entry.durationMs)}`;
};

const formatAuth = (entry) => {
  if (entry.event === "auth.register.success") return "Registration successful";
  if (entry.event === "auth.register.failed") return `Registration failed${entry.reason ? ` reason=${entry.reason}` : ""}`;
  if (entry.event === "auth.login.success") return "Login successful";
  if (entry.event === "auth.login.failed") return `Login failed${entry.reason ? ` reason=${entry.reason}` : ""}`;
  if (entry.event === "auth.token.expired") return "Token expired";
  if (entry.event === "auth.token.invalid") return "Invalid token";
  if (entry.event === "auth.profile.updated") return "Profile updated";
  if (entry.event === "auth.password.changed") return "Password changed";
  if (entry.event === "auth.password.change.failed") return `Password change failed${entry.reason ? ` reason=${entry.reason}` : ""}`;
  if (entry.event === "rbac.access.denied") return "Access denied";
  if (entry.event === "rbac.access.granted") return "Access granted";
  return entry.msg || entry.event || "Authentication event";
};

const formatError = (entry) => {
  const error = entry.err || entry.error || {};
  const message = error.message || entry.msg || "Request failed";
  return `${pad(entry.method, 6)} ${cleanPath(entry.route || entry.path || entry.url)} ${entry.statusCode || "-"} ${message}`;
};

const formatSystem = (entry) => {
  if (entry.msg === "Server running") return `API server started env=${entry.environment || process.env.NODE_ENV || "development"} port=${entry.port || process.env.PORT || "-"}`;
  if (entry.msg === "Routes loaded") return `Routes loaded count=${entry.routeCount || "-"}`;
  if (entry.msg?.includes("MongoDB connected")) return `MongoDB connected database=${entry.database || "-"}`;
  return entry.msg || entry.event || "Log event";
};

const formatMessage = (entry, category) => {
  if (category === "HTTP") return formatHttp(entry);
  if (category === "DB") return formatDb(entry);
  if (category === "PERF") return formatPerf(entry);
  if (category === "AUTH" || category === "RBAC") return formatAuth(entry);
  if (category === "API" || entry.err || entry.error) return formatError(entry);
  return formatSystem(entry);
};

const formatEntry = (entry) => {
  const level = LEVEL_LABELS[entry.level] || upper(entry.level, "INFO");
  if ((level === "DEBUG" || level === "TRACE") && process.env.LOG_SHOW_DEBUG_PRETTY !== "true") {
    const event = String(entry.event || "");
    if (!event.startsWith("perf.") && !event.startsWith("rbac.")) return "";
  }

  const time = formatTime(entry.time);
  const category = categoryFor(entry);
  const body = formatMessage(entry, category);
  const suffix = contextSuffix(entry);
  const levelText = paint(colorForLevel(level), pad(level, 5));
  return `${time} ${levelText} ${pad(category, 6)} ${body}${suffix ? ` ${suffix}` : ""}`;
};

const formatPrettyMessage = (entry) => {
  const category = categoryFor(entry);
  const body = formatMessage(entry, category);
  const suffix = contextSuffix(entry);
  return `${pad(category, 6)} ${body}${suffix ? ` ${suffix}` : ""}`;
};

const shouldDisplay = (entry) => {
  const level = LEVEL_LABELS[entry.level] || upper(entry.level, "INFO");
  if (level !== "DEBUG" && level !== "TRACE") return true;
  if (process.env.LOG_SHOW_DEBUG_PRETTY === "true") return true;
  const event = String(entry.event || "");
  return event.startsWith("perf.") || event.startsWith("rbac.");
};

const createDevelopmentConsoleStream = () => {
  const pretty = pinoPretty({
    colorize: process.env.NO_COLOR !== "true",
    translateTime: "HH:MM:ss",
    ignore: [
      "pid",
      "hostname",
      "service",
      "environment",
      "name",
      "event",
      "category",
      "requestId",
      "method",
      "route",
      "path",
      "statusCode",
      "durationMs",
      "queryDurationMs",
      "thresholdMs",
      "verySlowThresholdMs",
      "contentLength",
      "userId",
      "role",
      "department",
      "portal",
      "ip",
      "userAgent",
      "module",
      "action",
      "status",
      "span",
      "collection",
      "operation",
      "filterFields",
      "req",
      "res",
      "responseTime",
      "lastSpan",
      "lastSpanDurationMs",
    ].join(","),
    hideObject: true,
    messageFormat(log) {
      return formatPrettyMessage(log);
    },
  });

  return {
    write(line) {
      try {
        const entry = JSON.parse(line);
        if (!shouldDisplay(entry)) return;
      } catch (err) {
        // Let pino-pretty handle malformed lines exactly as it normally would.
      }
      pretty.write(line);
    },
  };
};

module.exports = {
  createDevelopmentConsoleStream,
};
