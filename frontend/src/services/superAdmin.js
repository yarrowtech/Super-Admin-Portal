import { apiClient } from './client';

export const superAdminApi = {
  getDashboard: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.from) q.append('from', params.from);
    if (params.to) q.append('to', params.to);
    const qs = q.toString();
    return apiClient.get(`/api/dept/super-admin/dashboard${qs ? `?${qs}` : ''}`, token);
  },
  getFeatureFlags: (token) => apiClient.get('/api/dept/super-admin/feature-flags', token),
  updateFeatureFlag: (token, id, payload) => apiClient.put(`/api/dept/super-admin/feature-flags/${id}`, payload, token),
  getPortalAccess: (token) => apiClient.get('/api/dept/super-admin/portal-access', token),
  updatePortalAccess: (token, id, payload) => apiClient.put(`/api/dept/super-admin/portal-access/${id}`, payload, token),
  getSystemHealth: (token) => apiClient.get('/api/dept/super-admin/system-health', token),
  getCompanyControls: (token) => apiClient.get('/api/dept/super-admin/company-controls', token),
  updateCompanyControl: (token, id, payload) => apiClient.put(`/api/dept/super-admin/company-controls/${id}`, payload, token),
  getProjectAllocations: (token) => apiClient.get('/api/dept/super-admin/project-allocations', token),
  updateProjectAllocations: (token, userId, payload) => apiClient.put(`/api/dept/super-admin/project-allocations/${userId}`, payload, token)
};
