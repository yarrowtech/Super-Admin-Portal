import { apiClient } from './client';

export const projectAccessApi = {
  getMyProjects: async (token) => apiClient.get('/api/my-projects', token),
  getProjectPermissions: async (token) => apiClient.get('/api/project-permissions', token),
  getProjectRoles: async (token) => apiClient.get('/api/project-roles', token),
  generateProjectAccessToken: async (token, projectCode, payload = {}) =>
    apiClient.post(`/api/project-access/${encodeURIComponent(projectCode)}`, payload, token),
  generateSsoToken: async (token, payload = {}) => apiClient.post('/api/sso/generate-token', payload, token),
  verifySsoToken: async (payload = {}) => apiClient.post('/api/sso/verify-token', payload),
};
