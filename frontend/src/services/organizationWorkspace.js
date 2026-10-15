import { apiClient } from './client';

export const organizationWorkspaceApi = {
  getRecords: (token, path, options) => apiClient.get(`/api/v1/${path}`, token, options),
  createRecord: (token, path, body) => apiClient.post(`/api/v1/${path}`, body, token),
  updateRecord: (token, path, body) => apiClient.patch(`/api/v1/${path}`, body, token),
  command: (token, path, body = {}) => apiClient.post(`/api/v1/${path}`, body, token),
  getOrganization: (token, organizationId = 'HOUSE_OF_MUSA') =>
    apiClient.get(`/api/v1/organizations/${encodeURIComponent(organizationId)}`, token),
  getProjectWorkspace: (token, projectId) =>
    apiClient.get(`/api/v1/projects/${encodeURIComponent(projectId)}/workspace`, token),
  getYarrowtechWorkspace: (token) => apiClient.get('/api/v1/yarrowtech/workspace', token),
  getIntegration: (token, integrationId) =>
    apiClient.get(`/api/v1/integrations/${encodeURIComponent(integrationId)}`, token),
};
