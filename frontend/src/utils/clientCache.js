const CACHE_PREFIX = 'sap_cache_v1:';

const now = () => Date.now();

const toKey = (key) => `${CACHE_PREFIX}${key}`;

export const getCached = (key) => {
  try {
    const raw = sessionStorage.getItem(toKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < now()) {
      sessionStorage.removeItem(toKey(key));
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

export const setCached = (key, value, ttlMs = 60_000) => {
  try {
    const payload = {
      value,
      expiresAt: now() + Math.max(1_000, Number(ttlMs) || 60_000)
    };
    sessionStorage.setItem(toKey(key), JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
};

export const clearCached = (key) => {
  try {
    sessionStorage.removeItem(toKey(key));
  } catch {
    // ignore
  }
};

export const clearCachedByPrefix = (prefix) => {
  try {
    const fullPrefix = toKey(prefix);
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        sessionStorage.removeItem(k);
      }
    }
  } catch {
    // ignore
  }
};

