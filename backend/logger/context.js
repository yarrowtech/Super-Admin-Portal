const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

const runWithRequestContext = (context, callback) => requestContext.run(context, callback);

const getRequestContext = () => requestContext.getStore() || {};

const setRequestContext = (updates = {}) => {
  const store = requestContext.getStore();
  if (!store || !updates || typeof updates !== "object") return;
  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined) return;
    store[key] = value != null && typeof value.toString === "function" && value.constructor?.name === "ObjectId"
      ? value.toString()
      : value;
  });
};

const getRequestLogger = (fallbackLogger) => {
  const store = getRequestContext();
  return store.logger || fallbackLogger;
};

const createTimer = (name) => {
  const startedAt = process.hrtime.bigint();
  return () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const rounded = Math.round(durationMs * 100) / 100;
    setRequestContext({ lastSpan: name, lastSpanDurationMs: rounded });
    return rounded;
  };
};

module.exports = {
  runWithRequestContext,
  getRequestContext,
  setRequestContext,
  getRequestLogger,
  createTimer,
};
