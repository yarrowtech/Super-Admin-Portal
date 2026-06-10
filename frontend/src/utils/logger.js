import pino from 'pino';

const APP_NAME = 'super-admin-frontend';
const ENV = import.meta.env.MODE || 'development';

const logger = pino({
  name: APP_NAME,
  level: ENV === 'production' ? 'info' : 'debug',
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
  browser: {
    asObject: true,
  },
});

const createLogger = (bindings = {}) => logger.child(bindings);

export { createLogger };
export default logger;
