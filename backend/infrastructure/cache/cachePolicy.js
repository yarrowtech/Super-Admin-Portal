const DEFAULT_TTL_SECONDS = 90;
const DEFAULT_JITTER_RATIO = 0.1;

const parseSeconds = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
};

const CACHE_VERSION = process.env.CACHE_VERSION || 'v1';
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const CACHE_LOG_EVENTS = process.env.LOG_CACHE_EVENTS === 'true';
const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_CONNECT_TIMEOUT_MS = parseSeconds(process.env.REDIS_CONNECT_TIMEOUT_MS, 2000);
const REDIS_COMMAND_TIMEOUT_MS = parseSeconds(process.env.REDIS_COMMAND_TIMEOUT_MS, 750);
const REDIS_LOCK_TTL_MS = parseSeconds(process.env.REDIS_LOCK_TTL_MS, 5000);
const REDIS_LOCK_WAIT_MS = parseSeconds(process.env.REDIS_LOCK_WAIT_MS, 750);

const policies = Object.freeze({
  authProfile: { ttl: parseSeconds(process.env.CACHE_TTL_AUTH_PROFILE_SECONDS, 120), tags: ['auth', 'profile'], jitter: 0.05 },
  permissions: { ttl: parseSeconds(process.env.CACHE_TTL_PERMISSIONS_SECONDS, 900), tags: ['auth', 'permissions'], jitter: 0.05 },
  dashboard: { ttl: parseSeconds(process.env.CACHE_TTL_DASHBOARD_SECONDS, 60), tags: ['dashboard'], jitter: 0.15, swr: 30 },
  analytics: { ttl: parseSeconds(process.env.CACHE_TTL_ANALYTICS_SECONDS, 300), tags: ['analytics'], jitter: 0.15, swr: 60 },
  list: { ttl: parseSeconds(process.env.CACHE_TTL_LIST_SECONDS, 180), tags: ['list'], jitter: 0.1 },
  reference: { ttl: parseSeconds(process.env.CACHE_TTL_REFERENCE_SECONDS, 1800), tags: ['reference'], jitter: 0.1, swr: 300 },
  realtime: { ttl: 0, tags: ['realtime'], jitter: 0 },
  default: { ttl: parseSeconds(process.env.CACHE_TTL_DEFAULT_SECONDS, DEFAULT_TTL_SECONDS), tags: ['default'], jitter: DEFAULT_JITTER_RATIO },
});

const getPolicy = (name = 'default') => policies[name] || policies.default;

const ttlWithJitter = (ttlSeconds, jitterRatio = DEFAULT_JITTER_RATIO) => {
  const ttl = parseSeconds(ttlSeconds, DEFAULT_TTL_SECONDS);
  if (!jitterRatio) return ttl;
  const spread = Math.max(1, Math.round(ttl * jitterRatio));
  const offset = Math.floor(Math.random() * (spread * 2 + 1)) - spread;
  return Math.max(1, ttl + offset);
};

module.exports = {
  CACHE_ENABLED,
  CACHE_LOG_EVENTS,
  CACHE_VERSION,
  REDIS_URL,
  REDIS_CONNECT_TIMEOUT_MS,
  REDIS_COMMAND_TIMEOUT_MS,
  REDIS_LOCK_TTL_MS,
  REDIS_LOCK_WAIT_MS,
  getPolicy,
  policies,
  ttlWithJitter,
};
