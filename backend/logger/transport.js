const env = require("../config/env");
const { createDevelopmentConsoleStream } = require("./developmentConsoleStream");

const buildTransport = () => {
  if (env.NODE_ENV === "test") {
    return undefined;
  }

  if (!env.IS_PRODUCTION && env.LOG_PRETTY) {
    return createDevelopmentConsoleStream();
  }

  return undefined;
};

module.exports = {
  buildTransport,
};

