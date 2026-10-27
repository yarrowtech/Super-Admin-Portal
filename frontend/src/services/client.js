import { API_BASE_URL } from '../config/backend';
import { createRequestId } from '../utils/logger';
import { clearAuthSession, readAuthSession, writeAuthSession, subscribeAuthSession } from '../lib/authSession';


// TanStack Query owns response freshness; share only concurrent GETs here.
const inflight = new Map();
let refreshPromise = null;
let cacheGeneration = 0;
const getStoredProjectId = () => {
  try { return localStorage.getItem('activeProjectId') || ''; } catch { return ''; }
};
const CACHE_PREFIX = 'sap_http_cache_v1:';
// A single entry is capped so one large list cannot evict everything else, and the store
// is swept when it grows past a sane size rather than growing without bound.
const CACHE_MAX_ENTRY_BYTES = 256 * 1024;
const CACHE_MAX_ENTRIES = 120;

const clearApiCache = () => {
  cacheGeneration += 1;
  inflight.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable. */ }
};

// max-age from the server's Cache-Control, in ms. `no-store`/`no-cache` mean never, and
// an absent or unparseable header also means never — the client does not invent a TTL
// the server did not grant.
const maxAgeMs = (cacheControl) => {
  const value = String(cacheControl || '').toLowerCase();
  if (!value || value.includes('no-store') || value.includes('no-cache')) return 0;
  const match = /max-age=(\d+)/.exec(value);
  if (!match) return 0;
  return Number(match[1]) * 1000;
};

// Entries are read back only for the same identity: the key carries the token, so a
// different user (or a signed-out one) can never read a cached response, and
// cacheGeneration invalidates everything after any mutation.
const cacheKey = (path, token) =>
  `${CACHE_PREFIX}${JSON.stringify([API_BASE_URL, path, token || '', getStoredProjectId(), cacheGeneration])}`;

const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.expiresAt !== 'number') return undefined;
    if (Date.now() >= entry.expiresAt) {
      sessionStorage.removeItem(key);
      return undefined;
    }
    return entry.payload;
  } catch {
    // A corrupt or unreadable entry must never break a request.
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
    return undefined;
  }
};

// `generation` is the cacheGeneration the request started in. A request already in flight
// when the cache is cleared (a mutation, a token change, sign-out) must not write its
// response back afterwards, or a stale entry outlives the very event that invalidated it
// — including sign-out, which would leave one user's data readable in storage.
const writeCache = (key, payload, ttlMs, generation) => {
  if (!(ttlMs > 0)) return;
  if (generation !== cacheGeneration) return;
  try {
    const raw = JSON.stringify({ expiresAt: Date.now() + ttlMs, payload });
    if (raw.length > CACHE_MAX_ENTRY_BYTES) return;
    // Evict by dropping stored entries directly, never via clearApiCache(): that bumps
    // cacheGeneration, which would both invalidate every in-flight request's key and let
    // this write land under the *new* generation, so the entry would then survive the
    // sweep that a mutation or sign-out performs. Eviction is a size concern; generation
    // is a correctness one, and the two must not be conflated.
    const stored = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) stored.push(k);
    }
    if (stored.length >= CACHE_MAX_ENTRIES) {
      for (const k of stored) sessionStorage.removeItem(k);
    }
    sessionStorage.setItem(key, raw);
  } catch {
    // Quota exceeded or storage blocked: drop stored entries and carry on uncached.
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  }
};
clearApiCache();
subscribeAuthSession(clearApiCache);

const getDefaultHeaders = (token, requestId = createRequestId()) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-request-id': requestId,
    'x-client-source': 'frontend',
  };
  try {
    const activeProjectId = getStoredProjectId();
    if (activeProjectId && activeProjectId.toLowerCase() !== 'all') {
      headers['x-project-id'] = activeProjectId;
    }
  } catch {
    // ignore storage access errors
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (res, requestId) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // express-validator's `validate` middleware returns a flat "Validation failed"
    // top-level message plus a per-field `errors` array — surface the actual
    // field-level reason instead of the generic banner text wherever it exists.
    const fieldErrors = Array.isArray(data?.errors) ? data.errors : [];
    const fieldMessage = fieldErrors
      .map((item) => (item?.field ? `${item.field}: ${item.message || 'invalid'}` : item?.message))
      .filter(Boolean)
      .join('; ');

    const error = new Error(fieldMessage || data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.requestId = res.headers.get('x-request-id') || requestId;
    error.code = data?.code;
    error.details = data?.details;
    error.fieldErrors = fieldErrors;
    error.userRole = data?.userRole;
    error.requiredRoles = data?.requiredRoles;
    throw error;
  }
  return data;
};

const persistResponseToken = (res) => {
  const nextToken = res.headers.get('X-New-Token');
  if (!nextToken) return;
  const session = readAuthSession();
  writeAuthSession({
    token: nextToken,
    refreshToken: session.refreshToken,
    authMode: session.authMode,
  });
};

const refreshAccessToken = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const session = readAuthSession();
    if (!session.refreshToken) {
      throw new Error('No refresh token available');
    }

    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: 'POST',
      headers: getDefaultHeaders(null, requestId),
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      credentials: 'include',
    });

    const parsed = await parseResponse(res, requestId);
    if (readAuthSession().refreshToken !== session.refreshToken) {
      throw new Error('Session changed during token refresh');
    }
    const nextToken = parsed?.data?.token;
    if (!nextToken) {
      throw new Error('Invalid refresh response');
    }

    writeAuthSession({
      token: nextToken,
      refreshToken: session.refreshToken,
      authMode: session.authMode,
    });
    return nextToken;
  })();

  try {
    return await refreshPromise;
  } catch (error) {
    clearAuthSession();
    clearApiCache();
    throw error;
  } finally {
    refreshPromise = null;
  }
};

const shouldRefresh = (error, path) => {
  if (!error || error.status !== 401) return false;
  if (path === '/api/auth/refresh-token' || path.includes('/api/auth/login')) return false;
  return ['TOKEN_EXPIRED', 'SESSION_INVALID', 'INVALID_TOKEN', 'TOKEN_INVALID'].includes(error.code);
};

const request = async ({ method, path, body, token, signal, onPolicy }) => {
  const execute = async (requestToken) => {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: getDefaultHeaders(requestToken, requestId),
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
      cache: 'no-store',
    });
    const parsed = await parseResponse(res, requestId);
    persistResponseToken(res);
    // Hand the server's own caching policy back to the caller. The backend declares a
    // per-route Cache-Control (backend/middlewares/cacheHeaders.js), so the client reuses
    // that TTL instead of maintaining a second, drifting copy of the same rules.
    onPolicy?.(res.headers.get('cache-control') || '');
    return parsed;
  };

  try {
    return await execute(token);
  } catch (error) {
    if (!shouldRefresh(error, path)) {
      throw error;
    }
    const nextToken = await refreshAccessToken();
    return execute(nextToken);
  }
};

export const apiClient = {
  // Three layers, cheapest first:
  //   1. sessionStorage — survives a reload/remount, within the server's own max-age.
  //   2. in-flight map  — collapses concurrent identical GETs into one request.
  //   3. the network.
  // `cache: false` opts a call out of layer 1 (used where data must always be live), and
  // `forceRefresh: true` additionally bypasses deduplication.
  async get(path, token, options = {}) {
    const { signal, forceRefresh = false, cache = true } = options || {};
    // Credentials are used only in memory, never in storage keys or logs.
    const key = JSON.stringify([API_BASE_URL, path, token || '', getStoredProjectId(), cacheGeneration]);
    const storageKey = cacheKey(path, token);
    const useStore = cache && !forceRefresh;

    if (useStore) {
      const hit = readCache(storageKey);
      if (hit !== undefined) return hit;
    }

    const deduplicate = !signal && !forceRefresh;
    if (deduplicate && inflight.has(key)) return inflight.get(key);

    // Captured before the request starts, so a cache clear that happens while it is in
    // flight makes the write below a no-op.
    const generation = cacheGeneration;
    let ttlMs = 0;
    const pending = request({
      method: 'GET', path, token, signal,
      onPolicy: (cacheControl) => { ttlMs = maxAgeMs(cacheControl); },
    });
    if (deduplicate) inflight.set(key, pending);
    try {
      const parsed = await pending;
      // Only store what the server said may be stored, and only for as long as it said.
      // `useStore` (not `cache`) is the gate: a forceRefresh caller deliberately bypassed
      // the read because it needs live data, so it must not repopulate the store either —
      // otherwise a poll that was in flight across a clear writes a fresh entry back and
      // the response outlives the mutation, or the sign-out, that invalidated it.
      if (useStore) writeCache(storageKey, parsed, ttlMs, generation);
      return parsed;
    } finally {
      if (inflight.get(key) === pending) inflight.delete(key);
    }
  },
  async post(path, body, token) {
    const parsed = await request({ method: 'POST', path, body, token });
    clearApiCache();
    return parsed;
  },
  async activity(path, body, token) {
    return request({ method: 'POST', path, body, token });
  },
  async put(path, body, token) {
    const parsed = await request({ method: 'PUT', path, body, token });
    clearApiCache();
    return parsed;
  },
  async patch(path, body, token) {
    const parsed = await request({ method: 'PATCH', path, body, token });
    clearApiCache();
    return parsed;
  },
  async delete(path, token) {
    const parsed = await request({ method: 'DELETE', path, token });
    clearApiCache();
    return parsed;
  },
  async upload(path, formData, token) {
    const requestId = createRequestId();
    const headers = {
      'x-request-id': requestId,
      'x-client-source': 'frontend',
    };
    try {
      const activeProjectId = getStoredProjectId();
      if (activeProjectId && activeProjectId.toLowerCase() !== 'all') {
        headers['x-project-id'] = activeProjectId;
      }
    } catch {
      // ignore storage access errors
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
      cache: 'no-store',
    });
    const parsed = await parseResponse(res, requestId);
    clearApiCache();
    return parsed;
  },
  // Authenticated file download (CSV/PDF); surfaces the server's JSON error message on failure.
  async download(path, token, filename) {
    const headers = getDefaultHeaders(token);
    delete headers['Content-Type'];
    const res = await fetch(`${API_BASE_URL}${path}`, { headers, credentials: 'include', cache: 'no-store' });
    if (!res.ok) {
      let message = `Download failed (${res.status})`;
      try { message = (await res.json())?.error || message; } catch { /* non-JSON error body */ }
      throw new Error(message);
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  getBaseUrl() {
    return API_BASE_URL;
  },
  clearCache: clearApiCache
};
