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
<<<<<<< HEAD
        "req.headers['set-cookie']",
=======
>>>>>>> 6bf966de8f22d883f07348bbd403c9d21a75ab2e
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

