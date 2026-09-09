const pino = require("pino");
const env = require("../config/env");
const { sanitizeForLog } = require("./sanitize");
const { buildTransport } = require("./transport");
const { getRequestContext } = require("./context");

const transport = buildTransport();

const logger = pino(
  {
    hooks: {
      logMethod(args, method) {
        return method.apply(this, args.map(value => {
          if (value instanceof Error) return { err: sanitizeForLog(value) };
          if (value && typeof value === "object" && !Array.isArray(value)) {
            value = { ...value };
            if (value.req) value.req = pino.stdSerializers.req(value.req);
            if (value.res) value.res = pino.stdSerializers.res(value.res);
          }
          return sanitizeForLog(value);
        }));
      },
    },
    name: "super-admin-backend",
    level: env.LOG_LEVEL,
    enabled: env.NODE_ENV !== "test",
    base: {
      service: "super-admin-backend",
      environment: env.NODE_ENV,
    },
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    mixin() {
      const context = getRequestContext();
      if (!Object.keys(context).length) return {};
      const { logger: _logger, ...safeContext } = context;
      return sanitizeForLog(safeContext);
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
        "req.body.oldPassword",
        "req.body.token",
        "req.body.accessToken",
        "req.body.refreshToken",
        "req.body.resetToken",
        "req.body.otp",
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
        "refreshToken",
        "password",
        "passwordHash",
        "currentPassword",
        "newPassword",
        "confirmPassword",
        "oldPassword",
        "otp",
        "otpHash",
        "resetToken",
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
        "*.resetToken",
        "*.otp",
        "*.otpHash",
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

