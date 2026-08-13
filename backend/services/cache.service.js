const cache = require('../infrastructure/cache/cacheService');

const getCache = (key) => cache.get(key);
const setCache = (key, value, ttlSeconds = undefined, options = {}) => cache.set(key, value, { ...options, ttl: ttlSeconds });
const deleteCache = (key) => cache.delete(key);
const deleteCachePrefix = (prefix) => cache.deleteMany(`${prefix}*`);

module.exports = {
  CacheService: cache,
  deleteCache,
  deleteCachePrefix,
  getCache,
  setCache,
};
