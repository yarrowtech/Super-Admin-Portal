const logger = require('../utils/logger');
const CacheService = require('../infrastructure/cache/cacheService');
const CacheKeys = require('../infrastructure/cache/cacheKeyBuilder');
const { invalidateForMutation, invalidateTags } = require('../infrastructure/cache/cacheInvalidator');

const onFinished = (res, callback) => {
  const done = () => {
    res.removeListener('finish', done);
    res.removeListener('close', done);
    callback();
  };
  res.once('finish', done);
  res.once('close', done);
};

const invalidateCacheAfterMutation = (resource, extraTags = []) => (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  onFinished(res, () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    invalidateForMutation(resource, extraTags).catch((err) => {
      logger.warn({
        err,
        module: 'cache',
        action: 'invalidate_after_mutation',
        resource,
        path: req.originalUrl,
        method: req.method,
      }, 'Cache invalidation failed after mutation');
    });
  });
  return next();
};

const invalidateTagsAfterMutation = (tags = []) => (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  onFinished(res, () => {
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    invalidateTags(tags).catch((err) => {
      logger.warn({
        err,
        module: 'cache',
        action: 'invalidate_tags_after_mutation',
        tags,
        path: req.originalUrl,
        method: req.method,
      }, 'Cache tag invalidation failed after mutation');
    });
  });
  return next();
};

const SKIP_GET_CACHE = [
  /\/auth\b/i,
  /\/login\b/i,
  /\/logout\b/i,
  /\/refresh\b/i,
  /\/chat\b/i,
  /\/messages\b/i,
  /\/notifications\b/i,
  /\/export\b/i,
  /\/download\b/i,
  /\/upload\b/i,
  /\/health\b/i,
  /\/logs\b/i,
];

const inferPolicy = (path = '') => {
  if (/\/(settings|config|workflow|permissions|roles|departments|holidays)/i.test(path)) return 'reference';
  if (/\/(reports|analytics|stats|metrics|revenue|kpis)/i.test(path)) return 'analytics';
  if (/\/(dashboard|overview|summary)/i.test(path)) return 'dashboard';
  if (/\/(employees|users|projects|tasks|assets|campaigns|content|tickets|requests|leave|attendance)/i.test(path)) return 'list';
  return 'default';
};

const cacheGetResponses = (resource, options = {}) => async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!req.user) return next();
  if (options.skip?.(req)) return next();
  if (SKIP_GET_CACHE.some((pattern) => pattern.test(req.originalUrl || req.path || ''))) return next();

  const cacheKey = CacheKeys.forRequest(req, resource, {
    path: req.baseUrl || req.path,
    originalUrl: req.originalUrl,
  }, { userScoped: options.userScoped !== false });

  try {
    const cached = await CacheService.get(cacheKey);
    if (cached !== null) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached);
    }
  } catch (err) {
    logger.warn({
      err,
      module: 'cache',
      action: 'response_cache_read',
      resource,
      path: req.originalUrl,
    }, 'Response cache read failed');
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 200 && res.statusCode < 300 && body !== undefined) {
      const policy = options.policy || inferPolicy(req.originalUrl || req.path || '');
      const tags = [resource, ...(options.tags || [])];
      CacheService.set(cacheKey, body, { policy, tags }).catch((err) => {
        logger.warn({
          err,
          module: 'cache',
          action: 'response_cache_write',
          resource,
          path: req.originalUrl,
        }, 'Response cache write failed');
      });
      res.setHeader('X-Cache', 'MISS');
    }
    return originalJson(body);
  };

  return next();
};

module.exports = {
  cacheGetResponses,
  invalidateCacheAfterMutation,
  invalidateTagsAfterMutation,
};
