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
          singleLine: false,
          ignore: "pid,hostname",
          errorLikeObjectKeys: ["err", "error"],
        },
      });
    } catch (err) {
      // Fall back to raw JSON logs if pretty-print transport cannot start.
      return undefined;
    }
  }

  return undefined;
};

module.exports = {
  buildTransport,
};

