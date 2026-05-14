const logger = require('../logger/logger');

const DEFAULT_TTL_SECONDS = 60;
const memoryStore = new Map();

let redisClient = null;
let redisReady = false;

const initRedis = async () => {
  if (redisClient || redisReady) return;
  try {
    // Optional dependency: if redis package is unavailable, fallback to memory cache.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { createClient } = require('redis');
    const url = process.env.REDIS_URL;
    if (!url) {
      logger.warn('REDIS_URL not set. Using in-memory cache fallback.');
      redisReady = false;
      return;
    }
    redisClient = createClient({ url });
    redisClient.on('error', (err) => {
      logger.warn({ err }, 'Redis client error. Falling back to in-memory cache.');
      redisReady = false;
    });
    await redisClient.connect();
    redisReady = true;
    logger.info('Redis cache connected');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable. Using in-memory cache fallback.');
    redisReady = false;
    redisClient = null;
  }
};

const getMemory = (key) => {
  const row = memoryStore.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return row.value;
};

const setMemory = (key, value, ttlSeconds) => {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const getCache = async (key) => {
  await initRedis();
  if (redisReady && redisClient) {
    const raw = await redisClient.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  return getMemory(key);
};

const setCache = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  await initRedis();
  if (redisReady && redisClient) {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return;
  }
  setMemory(key, value, ttlSeconds);
};

module.exports = {
  getCache,
  setCache,
};
