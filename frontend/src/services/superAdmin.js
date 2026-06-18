import { apiClient } from './client';

const PRIMARY_BASE =
  import.meta.env.VITE_EFNBMMS_ADMIN_MANAGEMENT_PROXY_BASE ||
  '/api/integrations/efnbmms/admin-management';
const LEGACY_BASE = import.meta.env.VITE_SUPER_ADMIN_API_BASE || '/api/super-admin';

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

const withFallback = async (primary, fallback) => {
  try {
    return await primary();
  } catch (error) {
    if (error?.status === 404 && fallback) {
      return fallback();
    }
    throw error;
  }
};

const get = (path, token, options) =>
  withFallback(
    () => apiClient.get(`${PRIMARY_BASE}${path}`, token, options),
    () => apiClient.get(`${LEGACY_BASE}${path}`, token, options)
  );

const post = (path, body, token) =>
  withFallback(
    () => apiClient.post(`${PRIMARY_BASE}${path}`, body, token),
    () => apiClient.post(`${LEGACY_BASE}${path}`, body, token)
  );

const put = (path, body, token) =>
  withFallback(
    () => apiClient.put(`${PRIMARY_BASE}${path}`, body, token),
    () => apiClient.put(`${LEGACY_BASE}${path}`, body, token)
  );

const patch = (path, body, token) =>
  withFallback(
    () => apiClient.patch(`${PRIMARY_BASE}${path}`, body, token),
    () => apiClient.patch(`${LEGACY_BASE}${path}`, body, token)
  );

const del = (path, token) =>
  withFallback(
    () => apiClient.delete(`${PRIMARY_BASE}${path}`, token),
    () => apiClient.delete(`${LEGACY_BASE}${path}`, token)
  );

const launchEfmbmms = (token, payload = {}) =>
  apiClient.post('/api/integrations/efnbmms/identity/launch', payload, token);

export const superAdminApi = {
  getOverview: (token, params = {}) => get(`/overview${buildQueryString(params)}`, token),
  getMetrics: (token, params = {}) => get(`/metrics${buildQueryString(params)}`, token),
  getUsers: (token, params = {}) => get(`/users${buildQueryString(params)}`, token),
  getUser: (token, userId) => get(`/users/${userId}`, token),
  updateUser: (token, userId, payload) => patch(`/users/${userId}`, payload, token),
  syncUser: (token, userId) => post(`/users/${userId}/sync`, {}, token),
  getSessions: (token, params = {}) => get(`/sessions${buildQueryString(params)}`, token),
  getUserSessions: (token, userId) => get(`/sessions/${userId}`, token),
  revokeSession: (token, payload = {}) => post('/sessions/revoke', payload, token),
  revokeAllSessions: (token, payload = {}) => post('/sessions/revoke-all', payload, token),
  getActiveSessionCount: (token) => get('/sessions/active-count', token),
  getAudit: (token, params = {}) => get(`/audit${buildQueryString(params)}`, token),
  getSecurityEvents: (token, params = {}) => get(`/security/events${buildQueryString(params)}`, token),
  getReplayAttempts: (token, params = {}) => get(`/security/replay-attempts${buildQueryString(params)}`, token),
  getFailedLogins: (token, params = {}) => get(`/security/failed-logins${buildQueryString(params)}`, token),
  getActiveSessions: (token, params = {}) => get(`/security/active-sessions${buildQueryString(params)}`, token),
  getHealth: (token) => get('/health', token),
  getDatabaseHealth: (token) => get('/health/database', token),
  getSsoHealth: (token) => get('/health/sso', token),
  getPermissionsHealth: (token) => get('/health/permissions', token),
  getSessionsHealth: (token) => get('/health/sessions', token),
  launchEfmbmms,
  del,
};
