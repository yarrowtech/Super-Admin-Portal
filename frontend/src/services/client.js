import { createRequestId } from '../utils/logger';
import { clearAuthSession, readAuthSession, writeAuthSession, subscribeAuthSession } from '../lib/authSession';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
// TanStack Query owns response freshness; share only concurrent GETs here.
const inflight = new Map();
let refreshPromise = null;
let cacheGeneration = 0;
const getStoredProjectId = () => {
  try { return localStorage.getItem('activeProjectId') || ''; } catch { return ''; }
};
const clearApiCache = () => {
  cacheGeneration += 1;
  inflight.clear();
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith('sap_http_cache_v1:')) sessionStorage.removeItem(key);
    }
  } catch { /* Storage may be unavailable. */ }
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

const request = async ({ method, path, body, token, signal }) => {
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
    const { signal, forceRefresh = false } = options || {};
    // Credentials are used only in memory, never in storage keys or logs.
    const key = JSON.stringify([API_BASE_URL, path, token || '', getStoredProjectId(), cacheGeneration]);
    const deduplicate = !signal && !forceRefresh;
    if (deduplicate && inflight.has(key)) return inflight.get(key);
    const pending = request({ method: 'GET', path, token, signal });
    if (deduplicate) inflight.set(key, pending);
    try {
      return await pending;
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
  getBaseUrl() {
    return API_BASE_URL;
  },
  clearCache: clearApiCache
};
