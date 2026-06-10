import logger from '../utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const CACHE_PREFIX = 'sap_http_cache_v1:';
const DEFAULT_TTL_MS = 30 * 1000;
const inflight = new Map();

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
    logger.error({
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

export const apiClient = {
  async get(path, token, options = {}) {
    const {
      cache = true,
      ttlMs = DEFAULT_TTL_MS,
      forceRefresh = false
    } = options || {};
    const requestId = createRequestId();
    const cacheKey = buildCacheKey('GET', path, token);

    if (cache && !forceRefresh) {
      const cached = readCache(cacheKey);
      if (cached) return cached;
    }

    if (cache && inflight.has(cacheKey)) {
      return inflight.get(cacheKey);
    }

    const requestPromise = (async () => {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        headers: getDefaultHeaders(token, requestId),
        credentials: 'include',
      });
      const parsed = await parseResponse(res, requestId);
      if (cache) {
        writeCache(cacheKey, parsed, ttlMs);
      }
      return parsed;
    })();

    if (cache) inflight.set(cacheKey, requestPromise);
    try {
      return await requestPromise;
    } finally {
      if (cache) inflight.delete(cacheKey);
    }
  },
  async post(path, body, token) {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: getDefaultHeaders(token, requestId),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const parsed = await parseResponse(res, requestId);
    clearApiCache();
    return parsed;
  },
  async put(path, body, token) {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: getDefaultHeaders(token, requestId),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const parsed = await parseResponse(res, requestId);
    clearApiCache();
    return parsed;
  },
  async patch(path, body, token) {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers: getDefaultHeaders(token, requestId),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    const parsed = await parseResponse(res, requestId);
    clearApiCache();
    return parsed;
  },
  async delete(path, token) {
    const requestId = createRequestId();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getDefaultHeaders(token, requestId),
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
