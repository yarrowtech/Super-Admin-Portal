const pino = require("pino");
const env = require("../config/env");
const { buildTransport } = require("./transport");
const { getRequestContext } = require("./context");

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
    mixin() {
      const context = getRequestContext();
      return Object.keys(context).length ? context : {};
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
        "req.body.password",
        "req.body.currentPassword",
        "req.body.newPassword",
        "req.body.confirmPassword",
        "req.body.token",
        "req.body.accessToken",
        "req.body.refreshToken",
        "req.body.apiKey",
        "req.body.secret",
        "req.query.token",
        "req.query.accessToken",
        "req.query.refreshToken",
        "req.query.apiKey",
        "authorization",
        "cookie",
        "set-cookie",
        "token",
        "accessToken",
        "password",
        "passwordHash",
        "currentPassword",
        "newPassword",
        "confirmPassword",
        "jwt",
        "apiKey",
        "api_key",
        "secret",
        "clientSecret",
        "privateKey",
        "cardNumber",
        "cvv",
        "cvc",
        "accountNumber",
        "*.cookie",
        "*.password",
        "*.passwordHash",
        "*.currentPassword",
        "*.newPassword",
        "*.confirmPassword",
        "*.jwt",
        "*.set-cookie",
        "*.token",
        "*.accessToken",
        "*.refreshToken",
        "*.apiKey",
        "*.api_key",
        "*.secret",
        "*.clientSecret",
        "*.privateKey",
        "*.cardNumber",
        "*.cvv",
        "*.cvc",
        "*.accountNumber",
      ],
      remove: true,
    },
  },
  transport
);

module.exports = logger;

