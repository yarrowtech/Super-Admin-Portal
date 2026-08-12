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
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const state = {
  sections: new Set(),
  requests: 0,
  errors: 0,
  totalResponseMs: 0,
  routeCount: null,
  lastStatusAt: 0,
};

const width = 88;
const sectionLine = "-".repeat(width);

const pad = (value, length) => String(value ?? "").padEnd(length).slice(0, length);
const left = (value, length) => String(value ?? "").slice(0, length).padEnd(length);
const upper = (value, fallback = "") => String(value || fallback).toUpperCase();
const paint = (name, text) => `${COLORS[name] || ""}${text}${COLORS.reset}`;

const formatTime = (time) => {
  const date = time ? new Date(time) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toTimeString().slice(0, 8) : date.toTimeString().slice(0, 8);
};

const formatDuration = (durationMs) => {
  const ms = Number(durationMs);
  if (!Number.isFinite(ms)) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10000 ? 1 : 2)}s`;
  return `${Math.round(ms)}ms`;
};

const detail = (label, value) => `          ${pad(label, 10)}: ${value == null || value === "" ? "-" : value}`;

const printSection = (name) => {
  if (state.sections.has(name)) return "";
  state.sections.add(name);
  return `\n${paint("bold", name)}\n${paint("dim", sectionLine)}\n`;
};

const getErrorMessage = (entry) => {
  if (entry.err?.message) return entry.err.message;
  if (entry.error?.message) return entry.error.message;
  if (typeof entry.error === "string") return entry.error;
  return entry.msg || "Request failed";
};

const getErrorStack = (entry) => {
  const stack = entry.err?.stack || entry.error?.stack;
  if (!stack || process.env.SHOW_ERROR_STACKS === "false") return "";
  return stack.split("\n").slice(1, 5).map((line) => `          ${line.trim()}`).join("\n");
};

const formatHeader = (entry, time) => {
  const env = upper(entry.env || process.env.NODE_ENV || "development");
  const port = entry.port || process.env.PORT || "-";
  const routeCount = state.routeCount || entry.routeCount || "-";
  return [
    "",
    paint("bold", `+${"-".repeat(width - 2)}+`),
    paint("bold", `| SUPER ADMIN API${" ".repeat(39)}STATUS: ONLINE |`),
    paint("bold", `| Node / Express / MongoDB / Redis / Pino${" ".repeat(20)}${time} |`),
    paint("bold", `+${"-".repeat(width - 2)}+`),
    "",
    paint("bold", "SYSTEM"),
    paint("dim", sectionLine),
    `${paint("green", "OK")} SERVER       :${port}`,
    `${paint("green", "OK")} ENVIRONMENT  ${env}`,
    `${paint("green", "OK")} ROUTES       ${routeCount} loaded`,
    `${paint("green", "OK")} LOGGER       Pino Ready`,
    `${paint("green", "OK")} STATUS       ONLINE`,
  ].join("\n");
};

const formatSystem = (entry, time, level) => {
  if (entry.msg === "Server running") return formatHeader(entry, time);
  if (entry.msg === "Routes loaded") {
    state.routeCount = entry.routeCount || state.routeCount;
    return "";
  }

  const section = entry.msg?.includes("MongoDB") ? "DATABASE"
    : entry.msg?.includes("Redis") ? "REDIS"
      : "SYSTEM";
  const color = level === "ERROR" ? "red" : level === "WARN" ? "yellow" : "green";
  const label = level === "ERROR" ? "ERR" : level === "WARN" ? "WARN" : "OK";
  const lines = [
    printSection(section),
    `${time}  ${paint(color, pad(label, 5))} ${entry.msg || ""}`,
  ];
  if (entry.database) lines.push(detail("Database", entry.database));
  if (entry.host) lines.push(detail("Host", entry.host));
  if (entry.port) lines.push(detail("Port", entry.port));
  if (entry.err?.message) lines.push(detail("Error", entry.err.message));
  return lines.filter(Boolean).join("\n");
};

const updateRequestMetrics = (entry) => {
  state.requests += 1;
  if (Number(entry.statusCode) >= 500) state.errors += 1;
  const duration = Number(entry.durationMs || entry.responseTime);
  if (Number.isFinite(duration)) state.totalResponseMs += duration;
};

const formatRequest = (entry, time) => {
  updateRequestMetrics(entry);
  const status = Number(entry.statusCode || entry.res?.statusCode || 0);
  const color = status >= 500 ? "red" : status >= 400 ? "yellow" : "green";
  const user = entry.role || entry.userId || "ANON";
  const requestId = entry.requestId ? ` ${paint("dim", entry.requestId)}` : "";
  const heading = state.sections.has("API ACTIVITY")
    ? ""
    : `${printSection("API ACTIVITY")}TIME      METHOD ENDPOINT                              STATUS  TIME     USER`;
  const row = [
    left(time, 9),
    left(entry.method || "-", 6),
    left(entry.path || entry.url || entry.req?.url || "-", 37),
    left(paint(color, status || "-"), 15),
    left(formatDuration(entry.durationMs || entry.responseTime), 8),
    left(upper(user), 18),
  ].join(" ");
  return `${heading ? `${heading}\n` : ""}${row}${requestId}`;
};

const formatSlowRequest = (entry, time) => [
  printSection("PERFORMANCE"),
  `${time}  ${paint("yellow", "WARN")} Slow Request`,
  detail("Route", `${entry.method || "-"} ${entry.path || "-"}`),
  detail("Duration", formatDuration(entry.durationMs)),
  detail("Threshold", formatDuration(entry.thresholdMs)),
  detail("Request", entry.requestId || "-"),
].filter(Boolean).join("\n");

const formatSlowQuery = (entry, time) => [
  printSection("DATABASE"),
  `${time}  ${paint("yellow", "WARN")} Slow Query`,
  detail("Collection", entry.collection || "-"),
  detail("Operation", entry.operation || "-"),
  detail("Duration", formatDuration(entry.durationMs)),
  detail("Threshold", formatDuration(entry.thresholdMs)),
  detail("Request", entry.requestId || "-"),
].filter(Boolean).join("\n");

const formatError = (entry, time, level) => {
  state.errors += 1;
  const stack = getErrorStack(entry);
  return [
    printSection("ERRORS"),
    `${time}  ${paint(level === "FATAL" ? "magenta" : "red", pad(level, 5))} ${entry.method || "-"} ${entry.path || entry.url || entry.req?.url || "-"}`,
    "",
    detail("Status", entry.statusCode || entry.res?.statusCode || "-"),
    detail("Request", entry.requestId || "-"),
    detail("User", entry.role || entry.userId || "-"),
    detail("Module", upper(entry.module, "api")),
    detail("Error", getErrorMessage(entry)),
    stack,
  ].filter(Boolean).join("\n");
};

const authEventName = (entry, level) => {
  const action = String(entry.action || "").toLowerCase();
  if (entry.module === "authorization") return entry.status === "success" ? "ACCESS_GRANTED" : "ACCESS_DENIED";
  if (action === "auth.login" && entry.status === "failed") return "LOGIN_FAILED";
  if (action === "auth.login") return "LOGIN_SUCCESS";
  if (action === "auth.logout") return "LOGOUT";
  if (action.includes("refresh")) return entry.status === "failed" || level === "WARN" ? "TOKEN_REFRESH_FAILURE" : "TOKEN_REFRESH";
  return upper(entry.action, "AUTH");
};

const formatAuth = (entry, time, level) => {
  const isDenied = entry.status === "failed" || level === "WARN";
  const type = entry.module === "authorization" ? "RBAC" : "AUTH";
  return [
    printSection("SECURITY"),
    `${time}  ${type}   ${paint(isDenied ? "yellow" : "green", isDenied ? "WARN" : "OK")} ${authEventName(entry, level)}`,
    detail("User", entry.userId || "-"),
    detail("Role", entry.role || "-"),
    detail("Module", upper(entry.module, "authentication")),
    detail("Action", upper(entry.action, "authenticate")),
    detail("Request", entry.requestId || "-"),
  ].filter(Boolean).join("\n");
};

const formatAudit = (entry, time) => [
  printSection("MODULE ACTIVITY"),
  `${time}  [${pad(upper(entry.module, "system"), 12)}] ${upper(entry.action, "AUDIT")}`,
  detail("User", entry.userId || "-"),
  detail("Target", entry.targetId || "-"),
  detail("Request", entry.requestId || "-"),
].filter(Boolean).join("\n");

const formatRedis = (entry, time) => [
  printSection("REDIS"),
  `${time}  ${paint(entry.status === "miss" ? "yellow" : "green", entry.status === "miss" ? "MISS" : "OK")} ${upper(entry.action, "CACHE")}`,
  ...(entry.key ? [detail("Key", entry.key)] : []),
].filter(Boolean).join("\n");

const formatFrontend = (entry, time, level) => {
  const direction = entry.direction === "in" ? "<-" : entry.direction === "error" ? "X " : "->";
  const color = level === "ERROR" ? "red" : level === "WARN" ? "yellow" : "cyan";
  const lines = [
    printSection("FRONTEND"),
    `${time}  ${paint(color, `FRONTEND ${direction}`)} ${pad(entry.method || "APP", 6)} ${entry.path || entry.route || entry.message || "-"}`,
  ];
  if (entry.statusCode) lines.push(detail("Status", entry.statusCode));
  if (entry.userId) lines.push(detail("User", entry.userId));
  if (entry.role) lines.push(detail("Role", entry.role));
  if (entry.requestId) lines.push(detail("Request", entry.requestId));
  if (entry.durationMs != null) lines.push(detail("Time", formatDuration(entry.durationMs)));
  if (entry.error) lines.push(detail("Error", entry.error));
  return lines.filter(Boolean).join("\n");
};

const formatRuntimeStatus = () => {
  const now = Date.now();
  if (state.requests === 0 || state.requests % 50 !== 0 || now - state.lastStatusAt < 10000) return "";
  state.lastStatusAt = now;
  const memory = process.memoryUsage();
  const avg = state.requests ? state.totalResponseMs / state.requests : 0;
  return [
    printSection("SERVER"),
    `Uptime        ${formatDuration(process.uptime() * 1000)}`,
    `Requests      ${state.requests}`,
    `Errors        ${state.errors}`,
    `Avg Response  ${formatDuration(avg)}`,
    `Memory RSS    ${Math.round(memory.rss / 1024 / 1024)}MB`,
  ].filter(Boolean).join("\n");
};

const formatEntry = (entry) => {
  const time = formatTime(entry.time);
  const level = LEVEL_LABELS[entry.level] || upper(entry.level, "INFO");

  if (entry.msg === "Routes loaded") return formatSystem(entry, time, level);
  if (entry.msg === "Redis cache event") return formatRedis(entry, time);
  if (entry.msg === "Server running" || entry.msg?.includes("MongoDB") || entry.msg?.includes("Redis")) return formatSystem(entry, time, level);
  if (entry.msg === "Frontend activity" || entry.source === "frontend") return formatFrontend(entry, time, level);
  if (entry.msg === "Request performance") return [formatRequest(entry, time), formatRuntimeStatus()].filter(Boolean).join("\n");
  if (entry.msg === "Slow request") return formatSlowRequest(entry, time);
  if (entry.msg === "Slow query") return formatSlowQuery(entry, time);
  if (entry.module === "authentication" || entry.module === "authorization") return formatAuth(entry, time, level);
  if (entry.msg === "Business audit event recorded") return formatAudit(entry, time);
  if (entry.msg === "Request failed" || entry.err || level === "ERROR" || level === "FATAL") return formatError(entry, time, level);
  if (level === "DEBUG" || level === "TRACE") return "";
  return formatSystem(entry, time, level);
};

const createDevelopmentConsoleStream = () => ({
  write(line) {
    try {
      const entry = JSON.parse(line);
      const formatted = formatEntry(entry);
      if (formatted) process.stdout.write(`${formatted}\n`);
    } catch (err) {
      process.stdout.write(line);
    }
  },
});

module.exports = {
  createDevelopmentConsoleStream,
};
