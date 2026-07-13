const logger = require('../utils/logger');
const env = require('../config/env');

const DEFAULT_TTL_SECONDS = 60;
const memoryStore = new Map();

let redisClient = null;
let redisReady = false;
let redisInitialized = false;

const initRedis = async () => {
  if (redisInitialized || redisClient || redisReady) return;
  try {
    // Optional dependency: if redis package is unavailable, fallback to memory cache.
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    const { createClient } = require('redis');
    const url = process.env.REDIS_URL;
    if (!url) {
      if (env.IS_PRODUCTION) {
        logger.warn('REDIS_URL not set. Using in-memory cache fallback.');
      }
      redisInitialized = true;
      redisReady = false;
      return;
    }
    redisClient = createClient({ url });
    redisClient.on('error', (err) => {
      logger.warn({ err }, 'Redis client error. Falling back to in-memory cache.');
      redisReady = false;
    });
    await redisClient.connect();
    redisInitialized = true;
    redisReady = true;
    logger.info('Redis cache connected');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable. Using in-memory cache fallback.');
    redisInitialized = true;
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
    // Store a snapshot rather than the live reference, so a caller mutating the
    // object after caching it can never corrupt the cached copy (matches the
    // Redis path, which only ever stores a serialized string).
    value: JSON.parse(JSON.stringify(value)),
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const deleteMemory = (key) => {
  memoryStore.delete(key);
};

const deleteMemoryPrefix = (prefix) => {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) memoryStore.delete(key);
  }
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

const deleteCache = async (key) => {
  await initRedis();
  if (redisReady && redisClient) {
    await redisClient.del(key);
    return;
  }
  deleteMemory(key);
};

const deleteCachePrefix = async (prefix) => {
  await initRedis();
  if (redisReady && redisClient) {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length) await redisClient.del(keys);
    return;
  }
  deleteMemoryPrefix(prefix);
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCachePrefix,
};
