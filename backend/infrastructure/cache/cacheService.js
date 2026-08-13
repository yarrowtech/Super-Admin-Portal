const crypto = require('crypto');
const logger = require('../../utils/logger');
const metrics = require('./cacheMetrics');
const keys = require('./cacheKeyBuilder');
const {
  CACHE_ENABLED,
  CACHE_LOG_EVENTS,
  REDIS_COMMAND_TIMEOUT_MS,
  REDIS_LOCK_TTL_MS,
  REDIS_LOCK_WAIT_MS,
  getPolicy,
  ttlWithJitter,
} = require('./cachePolicy');
const { getRedisClient, withTimeout } = require('./redisClient');

const memoryStore = new Map();
const tagStore = new Map();
const localFlights = new Map();

const now = () => Date.now();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (value) => JSON.parse(JSON.stringify(value));

const logEvent = (event, key, metadata = {}) => {
  if (!CACHE_LOG_EVENTS) return;
  logger.info({
    module: 'cache',
    event,
    cacheKeyHash: key ? keys.safeKeyHash(key) : undefined,
    resource: metadata.resource,
    ttl: metadata.ttl,
    durationMs: metadata.durationMs,
    status: metadata.status,
  }, event);
};

const op = async (operation, fn) => {
  const startedAt = now();
  try {
    const client = await getRedisClient();
    if (!client) return { ok: false, value: null };
    const value = await withTimeout(fn(client), REDIS_COMMAND_TIMEOUT_MS, operation);
    metrics.observeRedisLatency(now() - startedAt);
    return { ok: true, value };
  } catch (err) {
    metrics.increment('cache_error_total');
    logger.warn({ err, operation }, 'Cache operation failed; falling back where possible');
    return { ok: false, value: null };
  }
};

const getMemoryRow = (key) => {
  const row = memoryStore.get(key);
  if (!row) return null;
  if (row.expiresAt && now() > row.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return row;
};

const addTagsMemory = (key, tags = []) => {
  tags.forEach((tag) => {
    if (!tagStore.has(tag)) tagStore.set(tag, new Set());
    tagStore.get(tag).add(key);
  });
};

const setMemory = (key, value, ttlSeconds, tags = []) => {
  memoryStore.set(key, {
    value: clone(value),
    expiresAt: ttlSeconds ? now() + ttlSeconds * 1000 : 0,
  });
  addTagsMemory(key, tags);
};

const deleteMemory = (key) => {
  memoryStore.delete(key);
  tagStore.forEach((set) => set.delete(key));
};

const deleteMemoryPattern = (pattern) => {
  const prefix = String(pattern).replace(/\*+$/, '');
  let count = 0;
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      deleteMemory(key);
      count += 1;
    }
  }
  return count;
};

const normalizeTags = (tags = []) => Array.from(new Set((Array.isArray(tags) ? tags : [tags]).filter(Boolean).map(String)));

const addTagsRedis = async (key, tags, ttlSeconds) => {
  const cleanTags = normalizeTags(tags);
  if (!cleanTags.length) return;
  await Promise.all(cleanTags.map(async (tag) => {
    const tagKey = keys.tagKey(tag);
    await op('redis_sadd_tag', (client) => client.sAdd(tagKey, key));
    if (ttlSeconds) await op('redis_expire_tag', (client) => client.expire(tagKey, Math.max(ttlSeconds * 2, ttlSeconds + 60)));
  }));
};

const get = async (key) => {
  if (!CACHE_ENABLED || !key) return null;
  const result = await op('redis_get', (client) => client.get(key));
  if (result.ok) {
    if (result.value) {
      metrics.increment('cache_hit_total');
      logEvent('CACHE_HIT', key);
      return JSON.parse(result.value);
    }
    metrics.increment('cache_miss_total');
    logEvent('CACHE_MISS', key);
    return null;
  }

  const row = getMemoryRow(key);
  if (row) {
    metrics.increment('cache_hit_total');
    return clone(row.value);
  }
  metrics.increment('cache_miss_total');
  return null;
};

const set = async (key, value, options = {}) => {
  if (!CACHE_ENABLED || !key || value === undefined) return false;
  const policy = getPolicy(options.policy);
  const ttl = ttlWithJitter(options.ttl || policy.ttl, options.jitter ?? policy.jitter);
  const tags = normalizeTags([...(policy.tags || []), ...(options.tags || [])]);
  const serialized = JSON.stringify(value);
  const result = await op('redis_set', (client) => client.setEx(key, ttl, serialized));
  if (result.ok) {
    await addTagsRedis(key, tags, ttl);
    metrics.increment('cache_set_total');
    logEvent('CACHE_SET', key, { ttl });
    return true;
  }
  setMemory(key, value, ttl, tags);
  metrics.increment('cache_set_total');
  return true;
};

const del = async (key) => {
  if (!key) return 0;
  const result = await op('redis_del', (client) => client.del(key));
  deleteMemory(key);
  metrics.increment('cache_delete_total');
  logEvent('CACHE_DELETE', key);
  return result.ok ? result.value : 1;
};

const deleteMany = async (patterns = []) => {
  const normalized = Array.isArray(patterns) ? patterns : [patterns];
  let deleted = 0;
  for (const pattern of normalized.filter(Boolean)) {
    if (String(pattern).includes('*')) {
      const scanResult = await op('redis_scan_delete', async (client) => {
        let cursor = '0';
        let count = 0;
        do {
          const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 250 });
          cursor = reply.cursor;
          if (reply.keys.length) count += await client.del(reply.keys);
        } while (cursor !== '0');
        return count;
      });
      deleted += scanResult.ok ? scanResult.value : deleteMemoryPattern(pattern);
    } else {
      deleted += await del(pattern);
    }
  }
  return deleted;
};

const invalidateTag = async (tag) => {
  const tagKey = keys.tagKey(tag);
  const result = await op('redis_invalidate_tag', async (client) => {
    const members = await client.sMembers(tagKey);
    if (members.length) await client.del(members);
    await client.del(tagKey);
    return members.length;
  });
  const memoryKeys = tagStore.get(tag) || new Set();
  memoryKeys.forEach(deleteMemory);
  tagStore.delete(tag);
  metrics.increment('cache_delete_total', result.ok ? result.value : memoryKeys.size);
  logEvent('CACHE_INVALIDATE', tagKey, { resource: tag });
  return result.ok ? result.value : memoryKeys.size;
};

const acquireLock = async (key, ttlMs = REDIS_LOCK_TTL_MS) => {
  const lockKey = keys.lockKey(key);
  const token = crypto.randomUUID();
  const result = await op('redis_lock', (client) => client.set(lockKey, token, { NX: true, PX: ttlMs }));
  if (result.ok && result.value === 'OK') {
    metrics.increment('cache_lock_acquired_total');
    logEvent('CACHE_LOCK_ACQUIRED', key);
    return { lockKey, token, distributed: true };
  }
  return null;
};

const releaseLock = async (lock) => {
  if (!lock?.distributed) return;
  await op('redis_unlock', (client) => client.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [lock.lockKey], arguments: [lock.token] }
  ));
};

const waitForValue = async (key, waitMs = REDIS_LOCK_WAIT_MS) => {
  const deadline = now() + waitMs;
  while (now() < deadline) {
    await sleep(50);
    const value = await get(key);
    if (value !== null) return value;
  }
  metrics.increment('cache_lock_timeout_total');
  logEvent('CACHE_LOCK_TIMEOUT', key);
  return null;
};

const getOrSet = async (key, producer, options = {}) => {
  const cached = await get(key);
  if (cached !== null) return cached;

  if (localFlights.has(key)) return localFlights.get(key);

  const flight = (async () => {
    const lock = await acquireLock(key, options.lockTtlMs);
    if (!lock) {
      const waited = await waitForValue(key, options.lockWaitMs);
      if (waited !== null) return waited;
    }

    try {
      metrics.increment('mongodb_fallback_count');
      const value = await producer();
      await set(key, value, options);
      return value;
    } finally {
      await releaseLock(lock);
      localFlights.delete(key);
    }
  })();

  localFlights.set(key, flight);
  return flight;
};

const exists = async (key) => {
  const result = await op('redis_exists', (client) => client.exists(key));
  if (result.ok) return Boolean(result.value);
  return Boolean(getMemoryRow(key));
};

const mget = async (manyKeys = []) => Promise.all(manyKeys.map((key) => get(key)));
const mset = async (entries = [], options = {}) => Promise.all(entries.map(([key, value]) => set(key, value, options)));
const increment = async (key, amount = 1) => {
  const result = await op('redis_incrby', (client) => client.incrBy(key, amount));
  if (result.ok) return result.value;
  const row = getMemoryRow(key);
  const next = Number(row?.value || 0) + amount;
  setMemory(key, next, getPolicy('default').ttl);
  return next;
};
const expire = async (key, ttlSeconds) => {
  const result = await op('redis_expire', (client) => client.expire(key, ttlSeconds));
  const row = getMemoryRow(key);
  if (row) row.expiresAt = now() + ttlSeconds * 1000;
  return result.ok ? Boolean(result.value) : Boolean(row);
};
const ttl = async (key) => {
  const result = await op('redis_ttl', (client) => client.ttl(key));
  if (result.ok) return result.value;
  const row = getMemoryRow(key);
  return row?.expiresAt ? Math.max(0, Math.round((row.expiresAt - now()) / 1000)) : -2;
};

module.exports = {
  delete: del,
  deleteMany,
  exists,
  expire,
  get,
  getOrSet,
  increment,
  invalidateTag,
  mget,
  mset,
  metrics: metrics.snapshot,
  set,
  ttl,
};
