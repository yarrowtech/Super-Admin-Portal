/**
 * localStorage-backed persistence layer for TanStack Query.
 *
 * Persists the in-memory query cache to localStorage so that on the next
 * page load users see stale-but-instant data while fresh data loads in
 * the background (stale-while-revalidate pattern).
 *
 * Usage (call once after QueryClient is created):
 *   import { attachQueryPersister } from '@/utils/localStorageCache';
 *   attachQueryPersister(queryClient);
 */
import { subscribeAuthSession } from '../lib/authSession';
import { readAuthSession } from '../lib/authSession';

const LS_KEY = 'sap_query_cache_v2';
const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h
const PERSIST_DEBOUNCE_MS = 2_000;               // flush at most every 2 s

// ── Helpers ──────────────────────────────────────────────────────────────────

const readPersistedCache = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Date.now() - (parsed.timestamp || 0) > PERSIST_MAX_AGE_MS) {
      localStorage.removeItem(LS_KEY);
      return null;
    }
    return parsed.clientState ?? null;
  } catch {
    return null;
  }
};

const writePersistedCache = (clientState) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({
      timestamp: Date.now(),
      clientState,
    }));
  } catch {
    // Quota exceeded or private browsing — silently degrade
  }
};

export const clearPersistedCache = () => {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
};

// ── Core persister ───────────────────────────────────────────────────────────

/**
 * Attaches a subscriber to queryClient that flushes the serialised cache to
 * localStorage on a debounced interval.  On startup it hydrates the client
 * from whatever was persisted last session.
 *
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 */
export const attachQueryPersister = (queryClient) => {
  const { token } = readAuthSession();
  if (!token) {
    queryClient.clear();
    clearPersistedCache();
  }

  // Hydrate from previous session
  const persisted = token ? readPersistedCache() : null;
  if (persisted) {
    try {
      queryClient.setQueryData = queryClient.setQueryData.bind(queryClient);
      const queries = persisted.queries ?? [];
      queries.forEach(({ queryKey, state }) => {
        // Only restore data that is not too old
        const age = Date.now() - (state?.dataUpdatedAt ?? 0);
        if (age < PERSIST_MAX_AGE_MS && state?.data !== undefined) {
          queryClient.setQueryData(queryKey, state.data);
        }
      });
    } catch {
      // Corrupt cache — ignore
    }
  }

  // Debounced flush on every cache change
  let timer = null;
  const clearAll = () => {
    clearTimeout(timer);
    queryClient.clear();
    clearPersistedCache();
  };
  const flush = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const cache = queryClient.getQueryCache();
        const queries = cache.getAll()
          .filter(q => q.state.data !== undefined && q.state.status === 'success')
          .map(q => ({ queryKey: q.queryKey, state: { data: q.state.data, dataUpdatedAt: q.state.dataUpdatedAt } }));
        if (queries.length > 0) {
          writePersistedCache({ queries });
        }
      } catch {
        // ignore serialisation errors
      }
    }, PERSIST_DEBOUNCE_MS);
  };

  const unsubscribe = queryClient.getQueryCache().subscribe(flush);
  const unsubscribeAuth = subscribeAuthSession(clearAll);
  return () => {
    clearTimeout(timer);
    unsubscribe();
    unsubscribeAuth();
  };
};

// ── Per-module localStorage KV cache (long-lived static data) ────────────────

const LS_MODULE_PREFIX = 'sap_ls_v1:';
const now = () => Date.now();

export const lsGet = (key) => {
  try {
    const raw = localStorage.getItem(`${LS_MODULE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expiresAt !== 'number') return null;
    if (parsed.expiresAt < now()) {
      localStorage.removeItem(`${LS_MODULE_PREFIX}${key}`);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
};

export const lsSet = (key, value, ttlMs = 30 * 60_000) => {
  try {
    localStorage.setItem(`${LS_MODULE_PREFIX}${key}`, JSON.stringify({
      value,
      expiresAt: now() + Math.max(1_000, Number(ttlMs) || 30 * 60_000),
    }));
  } catch {
    // Quota exceeded — silently degrade
  }
};

export const lsDel = (key) => {
  try { localStorage.removeItem(`${LS_MODULE_PREFIX}${key}`); } catch { /* ignore */ }
};

export const lsClearByPrefix = (prefix) => {
  try {
    const full = `${LS_MODULE_PREFIX}${prefix}`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
};
