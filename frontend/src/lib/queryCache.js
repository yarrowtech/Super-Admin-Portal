const DEFAULT_STALE_TIME = 60_000;

class QueryCache {
  cache = new Map();

  get(key) {
    const record = this.cache.get(JSON.stringify(key));
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.cache.delete(JSON.stringify(key));
      return null;
    }
    return record.data;
  }

  set(key, data, staleTime = DEFAULT_STALE_TIME) {
    this.cache.set(JSON.stringify(key), {
      data,
      expiresAt: Date.now() + staleTime,
    });
    return data;
  }

  invalidate(prefix) {
    const normalizedPrefix = JSON.stringify(prefix).slice(0, -1);
    Array.from(this.cache.keys()).forEach((key) => {
      if (key.startsWith(normalizedPrefix)) {
        this.cache.delete(key);
      }
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const queryCache = new QueryCache();
