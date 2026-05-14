const pino = require("pino");
const env = require("../config/env");
const { buildTransport } = require("./transport");

const logger = pino(
  {
    name: "super-admin-backend",
    level: env.LOG_LEVEL,
    base: {
      service: "super-admin-backend",
      env: env.NODE_ENV,
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    redact: {
      paths: [
        "req.headers.authorization",
        "authorization",
        "token",
        "password",
        "*.password",
        "*.token",
        "*.refreshToken",
      ],
      remove: true,
    },
  },
  buildTransport()
);

module.exports = logger;

