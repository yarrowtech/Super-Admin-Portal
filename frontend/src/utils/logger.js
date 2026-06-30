import pino from 'pino';

const APP_NAME = 'super-admin-frontend';
const ENV = import.meta.env.MODE || 'development';
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (import.meta.env.PROD ? 'info' : 'debug');

const isTest = ENV === 'test';

const logger = pino({
  name: APP_NAME,
  level: LOG_LEVEL,
  enabled: !isTest,
  base: {
    service: APP_NAME,
    env: ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'authorization',
      'cookie',
      'token',
      'refreshToken',
      'password',
      '*.authorization',
      '*.cookie',
      '*.token',
      '*.refreshToken',
      '*.password',
    ],
    remove: true,
  },
  browser: {
    asObject: true,
  },
});

const createLogger = (bindings = {}) => logger.child(bindings);

export { createLogger };
export default logger;
