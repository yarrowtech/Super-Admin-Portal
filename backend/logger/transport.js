const pino = require("pino");
const env = require("../config/env");

const buildTransport = () => {
  if (env.NODE_ENV === "test") {
    return undefined;
  }

  if (!env.IS_PRODUCTION) {
    try {
      return pino.transport({
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
          ignore: "pid,hostname",
        },
      });
    } catch (err) {
      return undefined;
    }
  }

  return undefined;
};

module.exports = {
  buildTransport,
};

