import { apiClient } from './client';

const ttl = {
  fast: 30_000,
  medium: 60_000,
  slow: 120_000
};

const getOutsourcingPortalBaseUrl = () => {
  const raw = import.meta.env.VITE_OUTSOURCING_PORTAL_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  return String(raw).replace(/\/$/, '');
};

export const outsourcingApi = {
  getDashboard: async (token) => apiClient.get('/api/outsourcing/dashboard', token, { ttlMs: ttl.medium }),
  getEfnbmmsAdminManagement: async (token, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      query.append(key, String(value));
    });
    const qs = query.toString();
    return apiClient.get(`/api/outsourcing/efnbmms/admin-management${qs ? `?${qs}` : ''}`, token, { ttlMs: ttl.fast });
  },
  getEfnbmmsAdminManagementSummary: async (token) =>
    apiClient.get('/api/outsourcing/efnbmms/admin-management/summary', token, { ttlMs: ttl.fast }),
  getEfnbmmsAdminManagementDetail: async (token, adminId) =>
    apiClient.get(`/api/outsourcing/efnbmms/admin-management/${encodeURIComponent(adminId)}`, token, { ttlMs: ttl.fast }),
  getMyProjects: async (token) => apiClient.get('/api/my-projects', token, { ttlMs: ttl.fast }),
  getProjectPermissions: async (token) => apiClient.get('/api/project-permissions', token, { ttlMs: ttl.fast }),
  getProjectRoles: async (token) => apiClient.get('/api/project-roles', token, { ttlMs: ttl.fast }),
  generateProjectAccessToken: async (token, projectCode, payload = {}) =>
    apiClient.post(`/api/project-access/${encodeURIComponent(projectCode)}`, payload, token),
  generateSsoToken: async (token, payload = {}) => apiClient.post('/api/sso/generate-token', payload, token),
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
  getNotifications: async (token) => apiClient.get('/api/outsourcing/notifications', token, { ttlMs: ttl.fast }),
  getPayments: async (token) => apiClient.get('/api/outsourcing/payments', token, { ttlMs: ttl.medium }),
  getActivityFeed: async (token) => apiClient.get('/api/outsourcing/activity-feed', token, { ttlMs: ttl.fast }),
  getMyWorkflow: async (token) => apiClient.get('/api/outsourcing/workflow/me', token, { ttlMs: ttl.fast }),
  getJobs: async (token) => apiClient.get('/api/outsourcing/jobs', token, { ttlMs: ttl.fast }),
  acceptJob: async (token, id) => apiClient.put(`/api/outsourcing/jobs/${id}/accept`, {}, token),
  rejectJob: async (token, id, rejectionReason) => apiClient.put(`/api/outsourcing/jobs/${id}/reject`, { rejectionReason }, token),
  updateJobStatus: async (token, id, status) => apiClient.put(`/api/outsourcing/jobs/${id}/status`, { status }, token),
  getContracts: async (token) => apiClient.get('/api/outsourcing/contracts', token, { ttlMs: ttl.medium }),
  getContractHistory: async (token, contractId) =>
    apiClient.get(`/api/outsourcing/contracts/${contractId}/history`, token, { ttlMs: ttl.fast }),
  updateContractTerms: async (token, contractId, payload) =>
    apiClient.put(`/api/outsourcing/contracts/${contractId}/terms`, payload, token),
  getTimeLogs: async (token) => apiClient.get('/api/outsourcing/time-logs', token, { ttlMs: ttl.fast }),
  getUsers: async (token) => apiClient.get('/api/outsourcing/users', token, { ttlMs: ttl.slow }),
  getMyProfile: async (token) => apiClient.get('/api/outsourcing/profile', token, { ttlMs: ttl.medium }),
  getMyWorkspace: async (token) => apiClient.get('/api/outsourcing/workspace/me', token, { ttlMs: ttl.fast }),
  updateMyProfile: async (token, payload) => apiClient.put('/api/outsourcing/profile', payload, token),
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
    apiClient.clearCache();
    return json;
  },
  createUser: async (token, payload) => apiClient.post('/api/outsourcing/users', payload, token),
  createJob: async (token, payload) => apiClient.post('/api/outsourcing/jobs', payload, token),
  assignJob: async (token, id, freelancerId) => apiClient.put(`/api/outsourcing/jobs/${id}/assign`, { freelancerId }, token),
  createContract: async (token, payload) => apiClient.post('/api/outsourcing/contracts', payload, token),
  validateContractByLaw: async (token, contractId, approved = true) =>
    apiClient.put(`/api/outsourcing/contracts/${contractId}/law-validate`, { approved }, token),
  createMilestone: async (token, payload) => apiClient.post('/api/outsourcing/milestones', payload, token),
  submitMilestone: async (token, milestoneId) => apiClient.put(`/api/outsourcing/milestones/${milestoneId}/submit`, {}, token),
  approveMilestone: async (token, milestoneId, approved = true) =>
    apiClient.put(`/api/outsourcing/milestones/${milestoneId}/approve`, { approved }, token),
  createMilestonePayment: async (token, milestoneId) => apiClient.post('/api/outsourcing/payments/milestone', { milestoneId }, token),
  releaseMilestonePayment: async (token, paymentId) =>
    apiClient.put(`/api/outsourcing/payments/milestone/${paymentId}/release`, {}, token),
  completeFreelancerLifecycle: async (token, freelancerEntityId) =>
    apiClient.put(`/api/outsourcing/freelancers/${freelancerEntityId}/complete`, {}, token),
  logTime: async (token, payload) => apiClient.post('/api/outsourcing/time-logs', payload, token),
  updateTimeLog: async (token, id, payload) => apiClient.put(`/api/outsourcing/time-logs/${id}`, payload, token),
  verifyTimeLog: async (token, id, status) => apiClient.put(`/api/outsourcing/time-logs/${id}/verify`, { status }, token),
  requestTimeLogRevision: async (token, id, note) => apiClient.put(`/api/outsourcing/time-logs/${id}/revision`, { note }, token),
  getMySessions: async (token) => apiClient.get('/api/outsourcing/sessions/me', token, { ttlMs: ttl.fast }),
  checkIn: async (token, payload = {}) => apiClient.post('/api/outsourcing/sessions/check-in', payload, token),
  checkOut: async (token, payload = {}) => apiClient.post('/api/outsourcing/sessions/check-out', payload, token),
  pauseSession: async (token, payload = {}) => apiClient.post('/api/outsourcing/sessions/pause', payload, token),
  resumeSession: async (token, payload = {}) => apiClient.post('/api/outsourcing/sessions/resume', payload, token),
  stopSession: async (token, payload = {}) => apiClient.post('/api/outsourcing/sessions/stop', payload, token),
  getMyAnalytics: async (token) => apiClient.get('/api/outsourcing/analytics/me', token, { ttlMs: ttl.fast }),
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
    apiClient.clearCache();
    return data;
  },
  createSupportTicket: async (token, payload) => apiClient.post('/api/outsourcing/support/tickets', payload, token),
  getMyTickets: async (token) => apiClient.get('/api/outsourcing/support/tickets', token, { ttlMs: ttl.fast }),
  getAllTickets: async (token, params = '') => apiClient.get(`/api/outsourcing/support/tickets/all${params ? `?${params}` : ''}`, token),
  updateTicket: async (token, id, payload) => apiClient.put(`/api/outsourcing/support/tickets/${id}`, payload, token),
  updatePreferences: async (token, payload) => apiClient.put('/api/outsourcing/preferences', payload, token),
  clearClientCache: () => apiClient.clearCache()
};
