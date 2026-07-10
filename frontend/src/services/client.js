import { createLogger } from '../utils/logger';
import { clearAuthSession, readAuthSession, writeAuthSession } from '../lib/authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const httpLogger = createLogger({ module: 'http-client' });
const CACHE_PREFIX = 'sap_http_cache_v1:';
const DEFAULT_TTL_MS = 30 * 1000;
const inflight = new Map();
let refreshPromise = null;

const now = () => Date.now();

const getStoredProjectId = () => {
  try {
    return localStorage.getItem('activeProjectId') || '';
  } catch {
    return '';
  }
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

// Endpoint-aware TTL strategy:
//   settings/config/roles   → 30 min (rarely change)
//   permissions/workflows   → 30 min
//   reports/analytics       → 10 min
//   dashboard/kpi           → 60 s  (live data)
//   profile/auth            → 5 min
//   notifications/chat      → 15 s  (near-live)
//   default                 → 30 s
const getTtlForPath = (path) => {
  const p = String(path || '').toLowerCase();
  if (/\/(settings|config|workflow|permissions|roles)/.test(p)) return 30 * 60_000;
  if (/\/(reports|analytics|stats|metrics)/.test(p))            return 10 * 60_000;
  if (/\/(dashboard|kpi)/.test(p))                              return 60_000;
  if (/\/(profile|auth|me|session)/.test(p))                    return 5 * 60_000;
  if (/\/(notifications|chat)/.test(p))                         return 15_000;
  return DEFAULT_TTL_MS;
};

const buildCacheKey = (method, path, token, projectId = getStoredProjectId()) => {
  const tokenPart = token ? token.slice(0, 24) : 'anon';
  const projectPart = projectId || 'all';
  return `${CACHE_PREFIX}${method}:${projectPart}:${path}:${tokenPart}`;
};

const readCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Number(parsed.expiresAt || 0) < now()) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
};

const writeCache = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        value,
        expiresAt: now() + Math.max(1000, Number(ttlMs) || DEFAULT_TTL_MS)
      })
    );
  } catch {
    // ignore storage errors
  }
};

const clearApiCache = () => {
  try {
    inflight.clear();
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
};

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
    httpLogger.error({
      requestId,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      data,
    }, 'API request failed');
    const error = new Error(data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.code = data?.code;
    error.details = data?.details;
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

const request = async ({ method, path, body, token, cache = false, cacheKey, ttlMs }) => {
  const execute = async (requestToken) => {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: getDefaultHeaders(requestToken, requestId),
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
    const parsed = await parseResponse(res, requestId);
    persistResponseToken(res);
    if (cache && cacheKey) {
      writeCache(cacheKey, parsed, ttlMs);
    }
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
  async get(path, token, options = {}) {
    const {
      cache = true,
      ttlMs,
      forceRefresh = false
    } = options || {};
    const cacheKey = buildCacheKey('GET', path, token);
    const effectiveTtl = ttlMs ?? getTtlForPath(path);

    if (cache && !forceRefresh) {
      const cached = readCache(cacheKey);
      if (cached) return cached;
    }

    if (cache && inflight.has(cacheKey)) {
      return inflight.get(cacheKey);
    }

    const requestPromise = request({
      method: 'GET',
      path,
      token,
      cache,
      cacheKey,
      ttlMs: effectiveTtl,
    });

    if (cache) inflight.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (cache) inflight.delete(cacheKey);
    }
  },
  async post(path, body, token) {
    const parsed = await request({ method: 'POST', path, body, token });
    clearApiCache();
    return parsed;
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
    });
    const parsed = await parseResponse(res, requestId);
    clearApiCache();
    return parsed;
  },
  getBaseUrl() {
    return API_BASE_URL;
  },
  clearCache: clearApiCache
};
