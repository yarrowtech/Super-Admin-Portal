import { subscribeAuthSession } from '../lib/authSession';
import { getCacheSessionScope } from './cacheScope';

const KEY = 'sap_query_cache_v3';
const MAX_AGE = 30 * 60_000;
const MODULE_PREFIX = 'sap_ls_v2:';
const project = () => {
  try { return localStorage.getItem('activeProjectId') || 'all'; } catch { return 'all'; }
};
const scope = () => {
  const session = getCacheSessionScope();
  return session ? JSON.stringify([session, project()]) : null;
};

export const clearPersistedCache = () => {
  try {
    localStorage.removeItem('sap_query_cache_v2');
    sessionStorage.removeItem(KEY);
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (key?.startsWith('sap_ls_v1:') || key?.startsWith(MODULE_PREFIX)) storage.removeItem(key);
      }
    }
  } catch { /* Storage can be unavailable. */ }
};

// Application data stays in memory by default. Only reviewed, non-sensitive
// queries explicitly marked meta.persist=true may survive a reload in this tab.
export const attachQueryPersister = (queryClient) => {
  let session = getCacheSessionScope();
  let timer;
  try {
    localStorage.removeItem('sap_query_cache_v2');
    const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (session && saved?.scope === scope() && Array.isArray(saved.queries)) {
      for (const item of saved.queries) {
        const age = Date.now() - item.updatedAt;
        if (Array.isArray(item.queryKey) && age >= 0 && age < MAX_AGE) {
          queryClient.setQueryData(item.queryKey, item.data, { updatedAt: item.updatedAt });
        }
      }
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch { clearPersistedCache(); }

  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        const currentScope = scope();
        if (!currentScope) { clearPersistedCache(); return; }
        const queries = queryClient.getQueryCache().getAll()
          .filter(q => q.meta?.persist === true && q.state.status === 'success'
            && !q.state.isInvalidated && Date.now() - q.state.dataUpdatedAt < MAX_AGE)
          .slice(-50)
          .map(q => ({ queryKey: q.queryKey, data: q.state.data, updatedAt: q.state.dataUpdatedAt }));
        const serialized = JSON.stringify({ scope: currentScope, queries });
        if (queries.length && serialized.length <= 500_000) sessionStorage.setItem(KEY, serialized);
        else sessionStorage.removeItem(KEY);
      } catch { /* Quota or serialization errors must not break queries. */ }
    }, 1000);
  };
  const unsubscribe = queryClient.getQueryCache().subscribe(persist);
  const unsubscribeAuth = subscribeAuthSession(() => {
    const nextSession = getCacheSessionScope();
    if (nextSession && nextSession === session) return; // Access-token rotation.
    session = nextSession;
    queryClient.clear();
    clearTimeout(timer);
    clearPersistedCache();
  });
  return () => { clearTimeout(timer); unsubscribe(); unsubscribeAuth(); };
};

const moduleKey = key => {
  const currentScope = scope();
  return currentScope ? MODULE_PREFIX + currentScope + ':' + key : null;
};
export const lsGet = key => {
  try {
    const scopedKey = moduleKey(key);
    if (!scopedKey) return null;
    const item = JSON.parse(sessionStorage.getItem(scopedKey) || 'null');
    if (!Number.isFinite(item?.expiresAt) || item.expiresAt <= Date.now()) {
      sessionStorage.removeItem(scopedKey);
      return null;
    }
    return item.value ?? null;
  } catch { return null; }
};
export const lsSet = (key, value, ttlMs = MAX_AGE) => {
  try {
    const scopedKey = moduleKey(key);
    if (!scopedKey || !Number.isFinite(ttlMs) || ttlMs <= 0) return;
    sessionStorage.setItem(scopedKey, JSON.stringify({ value, expiresAt: Date.now() + Math.min(ttlMs, MAX_AGE) }));
  } catch { /* Optional cache. */ }
};
export const lsDel = key => {
  try { const scopedKey = moduleKey(key); if (scopedKey) sessionStorage.removeItem(scopedKey); } catch { /* Optional cache. */ }
};
export const lsClearByPrefix = prefix => {
  try {
    const full = moduleKey(prefix);
    if (!full) return;
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(full)) sessionStorage.removeItem(key);
    }
  } catch { /* Optional cache. */ }
};
