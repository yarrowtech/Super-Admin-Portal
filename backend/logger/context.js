const { AsyncLocalStorage } = require("async_hooks");

const requestContext = new AsyncLocalStorage();

const runWithRequestContext = (context, callback) => requestContext.run(context, callback);

const getRequestContext = () => requestContext.getStore() || {};

const setRequestContext = (updates = {}) => {
  const store = requestContext.getStore();
  if (!store || !updates || typeof updates !== "object") return;
  Object.assign(store, updates);
};

module.exports = {
  runWithRequestContext,
  getRequestContext,
  setRequestContext,
};
