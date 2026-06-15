const pino = require("pino");
const env = require("../config/env");
const { buildTransport } = require("./transport");

const transport = buildTransport();

const logger = pino(
  {
    name: "super-admin-backend",
    level: env.LOG_LEVEL,
    enabled: env.NODE_ENV !== "test",
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
        "req.headers.cookie",
        "req.headers['set-cookie']",
        "authorization",
        "cookie",
        "set-cookie",
        "token",
        "password",
        "*.cookie",
        "*.password",
        "*.set-cookie",
        "*.token",
        "*.refreshToken",
      ],
      remove: true,
    },
  },
  transport
);

module.exports = logger;

