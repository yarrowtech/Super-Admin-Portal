const logger = require('../../utils/logger');
const {
  CACHE_ENABLED,
  REDIS_CONNECT_TIMEOUT_MS,
  REDIS_URL,
} = require('./cachePolicy');
const metrics = require('./cacheMetrics');

let client = null;
let initializing = null;
let ready = false;

const withTimeout = (promise, timeoutMs, operation = 'redis_operation') => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${operation}_timeout`)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
};

const getRedisClient = async () => {
  if (!CACHE_ENABLED || !REDIS_URL) return null;
  if (ready && client) return client;
  if (initializing) return initializing;

  initializing = (async () => {
    try {
      // eslint-disable-next-line global-require
      const { createClient } = require('redis');
      client = createClient({
        url: REDIS_URL,
        socket: {
          connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
          reconnectStrategy: (retries) => Math.min(50 * retries, 1000),
        },
      });
      client.on('error', (err) => {
        ready = false;
        metrics.increment('cache_error_total');
        logger.warn({ err }, 'Redis cache client error');
      });
      client.on('ready', () => {
        ready = true;
        logger.info('Redis cache connected');
      });
      client.on('end', () => {
        ready = false;
      });
      await withTimeout(client.connect(), REDIS_CONNECT_TIMEOUT_MS, 'redis_connect');
      ready = true;
      return client;
    } catch (err) {
      ready = false;
      client = null;
      metrics.increment('cache_error_total');
      logger.warn({ err }, 'Redis unavailable; cache will use process memory fallback');
      return null;
    } finally {
      initializing = null;
    }
  })();

  return initializing;
};

const isRedisReady = () => Boolean(ready && client);

const closeRedis = async () => {
  if (!client) return;
  try {
    await client.quit();
  } catch (err) {
    logger.warn({ err }, 'Redis cache close failed');
  } finally {
    client = null;
    ready = false;
  }
};

module.exports = {
  closeRedis,
  getRedisClient,
  isRedisReady,
  withTimeout,
};
