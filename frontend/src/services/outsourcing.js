import { apiClient } from './client';
import { clearCachedByPrefix, getCached, setCached } from '../utils/clientCache';

const CACHE_NS = 'outsourcing:';
const ttl = {
  fast: 30_000,
  medium: 60_000,
  slow: 120_000
};

const getOutsourcingPortalBaseUrl = () => {
  const raw = import.meta.env.VITE_OUTSOURCING_PORTAL_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return String(raw).replace(/\/$/, '');
};

const getTokenScope = (token) => (token ? token.slice(0, 24) : 'anon');

const readCache = async (token, key, fetcher, ttlMs = ttl.medium) => {
  const scopedKey = `${CACHE_NS}${key}:${getTokenScope(token)}`;
  const cached = getCached(scopedKey);
  if (cached) return cached;
  const fresh = await fetcher();
  setCached(scopedKey, fresh, ttlMs);
  return fresh;
};

const invalidateOutsourcingCache = () => clearCachedByPrefix(CACHE_NS);

export const outsourcingApi = {
  getDashboard: async (token) => readCache(token, 'dashboard', () => apiClient.get('/api/outsourcing/dashboard', token), ttl.medium),
  getMyProjects: async (token) => readCache(token, 'myProjects', () => apiClient.get('/api/my-projects', token), ttl.fast),
  getProjectPermissions: async (token) => readCache(token, 'projectPermissions', () => apiClient.get('/api/project-permissions', token), ttl.fast),
  getProjectRoles: async (token) => readCache(token, 'projectRoles', () => apiClient.get('/api/project-roles', token), ttl.fast),
  generateProjectAccessToken: async (token, projectCode, payload = {}) => {
    const res = await apiClient.post(`/api/project-access/${encodeURIComponent(projectCode)}`, payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  generateSsoToken: async (token, payload = {}) => {
    const res = await apiClient.post('/api/sso/generate-token', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  launchEfmbmms: async (token, payload = {}) =>
    apiClient.post('/api/integrations/efnbmms/identity/launch', payload, token),
  generateEecSsoToken: async (token, payload = {}) => {
    const requestId = `eec_${Date.now().toString(36)}`;
    const response = await fetch(`${getOutsourcingPortalBaseUrl()}/api/sso/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': requestId,
        'x-client-source': 'frontend',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || data?.success === false) {
      const error = new Error(data?.message || data?.error || 'Failed to create EEC SSO token');
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  },
  verifySsoToken: async (payload = {}) => apiClient.post('/api/sso/verify-token', payload),
  getNotifications: async (token) => readCache(token, 'notifications', () => apiClient.get('/api/outsourcing/notifications', token), ttl.fast),
  getPayments: async (token) => readCache(token, 'payments', () => apiClient.get('/api/outsourcing/payments', token), ttl.medium),
  getActivityFeed: async (token) => readCache(token, 'activity', () => apiClient.get('/api/outsourcing/activity-feed', token), ttl.fast),
  getMyWorkflow: async (token) => readCache(token, 'workflow', () => apiClient.get('/api/outsourcing/workflow/me', token), ttl.fast),
  getJobs: async (token) => readCache(token, 'jobs', () => apiClient.get('/api/outsourcing/jobs', token), ttl.fast),
  acceptJob: async (token, id) => {
    const res = await apiClient.put(`/api/outsourcing/jobs/${id}/accept`, {}, token);
    invalidateOutsourcingCache();
    return res;
  },
  rejectJob: async (token, id, rejectionReason) => {
    const res = await apiClient.put(`/api/outsourcing/jobs/${id}/reject`, { rejectionReason }, token);
    invalidateOutsourcingCache();
    return res;
  },
  updateJobStatus: async (token, id, status) => {
    const res = await apiClient.put(`/api/outsourcing/jobs/${id}/status`, { status }, token);
    invalidateOutsourcingCache();
    return res;
  },
  getContracts: async (token) => readCache(token, 'contracts', () => apiClient.get('/api/outsourcing/contracts', token), ttl.medium),
  getContractHistory: async (token, contractId) => readCache(token, `contract-history:${contractId || 'all'}`, () => apiClient.get(`/api/outsourcing/contracts/${contractId}/history`, token), ttl.fast),
  updateContractTerms: async (token, contractId, payload) => {
    const res = await apiClient.put(`/api/outsourcing/contracts/${contractId}/terms`, payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  getTimeLogs: async (token) => readCache(token, 'timeLogs', () => apiClient.get('/api/outsourcing/time-logs', token), ttl.fast),
  getUsers: async (token) => readCache(token, 'users', () => apiClient.get('/api/outsourcing/users', token), ttl.slow),
  getMyProfile: async (token) => readCache(token, 'profile', () => apiClient.get('/api/outsourcing/profile', token), ttl.medium),
  getMyWorkspace: async (token) => readCache(token, 'workspace', () => apiClient.get('/api/outsourcing/workspace/me', token), ttl.fast),
  updateMyProfile: async (token, payload) => {
    const res = await apiClient.put('/api/outsourcing/profile', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  uploadProfileDocument: async (token, file, docType) => {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const res = await fetch(`${API_BASE}/api/outsourcing/profile/document`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
      credentials: 'include',
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Upload failed');
    invalidateOutsourcingCache();
    return json;
  },
  createUser: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/users', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  createJob: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/jobs', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  assignJob: async (token, id, freelancerId) => {
    const res = await apiClient.put(`/api/outsourcing/jobs/${id}/assign`, { freelancerId }, token);
    invalidateOutsourcingCache();
    return res;
  },
  createContract: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/contracts', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  validateContractByLaw: async (token, contractId, approved = true) => {
    const res = await apiClient.put(`/api/outsourcing/contracts/${contractId}/law-validate`, { approved }, token);
    invalidateOutsourcingCache();
    return res;
  },
  createMilestone: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/milestones', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  submitMilestone: async (token, milestoneId) => {
    const res = await apiClient.put(`/api/outsourcing/milestones/${milestoneId}/submit`, {}, token);
    invalidateOutsourcingCache();
    return res;
  },
  approveMilestone: async (token, milestoneId, approved = true) => {
    const res = await apiClient.put(`/api/outsourcing/milestones/${milestoneId}/approve`, { approved }, token);
    invalidateOutsourcingCache();
    return res;
  },
  createMilestonePayment: async (token, milestoneId) => {
    const res = await apiClient.post('/api/outsourcing/payments/milestone', { milestoneId }, token);
    invalidateOutsourcingCache();
    return res;
  },
  releaseMilestonePayment: async (token, paymentId) => {
    const res = await apiClient.put(`/api/outsourcing/payments/milestone/${paymentId}/release`, {}, token);
    invalidateOutsourcingCache();
    return res;
  },
  completeFreelancerLifecycle: async (token, freelancerEntityId) => {
    const res = await apiClient.put(`/api/outsourcing/freelancers/${freelancerEntityId}/complete`, {}, token);
    invalidateOutsourcingCache();
    return res;
  },
  logTime: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/time-logs', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  updateTimeLog: async (token, id, payload) => {
    const res = await apiClient.put(`/api/outsourcing/time-logs/${id}`, payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  verifyTimeLog: async (token, id, status) => {
    const res = await apiClient.put(`/api/outsourcing/time-logs/${id}/verify`, { status }, token);
    invalidateOutsourcingCache();
    return res;
  },
  requestTimeLogRevision: async (token, id, note) => {
    const res = await apiClient.put(`/api/outsourcing/time-logs/${id}/revision`, { note }, token);
    invalidateOutsourcingCache();
    return res;
  },
  getMySessions: async (token) => readCache(token, 'sessions', () => apiClient.get('/api/outsourcing/sessions/me', token), ttl.fast),
  checkIn: async (token, payload = {}) => {
    const res = await apiClient.post('/api/outsourcing/sessions/check-in', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  checkOut: async (token, payload = {}) => {
    const res = await apiClient.post('/api/outsourcing/sessions/check-out', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  pauseSession: async (token, payload = {}) => {
    const res = await apiClient.post('/api/outsourcing/sessions/pause', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  resumeSession: async (token, payload = {}) => {
    const res = await apiClient.post('/api/outsourcing/sessions/resume', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  stopSession: async (token, payload = {}) => {
    const res = await apiClient.post('/api/outsourcing/sessions/stop', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  getMyAnalytics: async (token) => readCache(token, 'analytics', () => apiClient.get('/api/outsourcing/analytics/me', token), ttl.fast),
  uploadFile: async (token, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/outsourcing/files/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData,
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok || data?.success === false) {
      throw new Error(data?.error || 'Upload failed');
    }
    invalidateOutsourcingCache();
    return data;
  },
  createSupportTicket: async (token, payload) => {
    const res = await apiClient.post('/api/outsourcing/support/tickets', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  getMyTickets: async (token) => readCache(token, 'myTickets', () => apiClient.get('/api/outsourcing/support/tickets', token), ttl.fast),
  getAllTickets: async (token, params = '') => apiClient.get(`/api/outsourcing/support/tickets/all${params ? `?${params}` : ''}`, token),
  updateTicket: async (token, id, payload) => {
    const res = await apiClient.put(`/api/outsourcing/support/tickets/${id}`, payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  updatePreferences: async (token, payload) => {
    const res = await apiClient.put('/api/outsourcing/preferences', payload, token);
    invalidateOutsourcingCache();
    return res;
  },
  clearClientCache: invalidateOutsourcingCache
};
