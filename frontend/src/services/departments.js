import { apiClient } from './client';

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || Number.isNaN(value)) return;
    query.append(key, value);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const departmentApi = {
  getMediaDashboard: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/dashboard', params), token),
  getMediaProjects: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/projects', params), token),
  getMediaAssets: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/assets', params), token),
  getMediaAsset: (token, id) => apiClient.get(`/api/dept/media/assets/${id}`, token),
  createMediaAsset: (token, body) => apiClient.post('/api/dept/media/assets', body, token),
  updateMediaAsset: (token, id, body) => apiClient.put(`/api/dept/media/assets/${id}`, body, token),
  deleteMediaAsset: (token, id) => apiClient.delete(`/api/dept/media/assets/${id}`, token),
  requestMediaApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/assets/${id}/approval-request`, body, token),
  getMediaCampaigns: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/campaigns', params), token),
  createMediaCampaign: (token, body) => apiClient.post('/api/dept/media/campaigns', body, token),
  getMediaContent: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/content', params), token),
  createMediaContent: (token, body) => apiClient.post('/api/dept/media/content', body, token),
  getMediaBrandAssets: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/brand-assets', params), token),
  getMediaApprovals: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/approvals', params), token),
  decideMediaApproval: (token, workflowId, body) => apiClient.patch(`/api/dept/media/approvals/${workflowId}/decision`, body, token),
  getMediaReportingSummary: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/reporting/summary', params), token),
  getMediaModuleData: (token, moduleKey, projectId, params = {}) =>
    apiClient.get(buildUrl(`/api/dept/media/${moduleKey}/project/${projectId}`, params), token),
  getSalesDashboard: (token) => apiClient.get('/api/dept/sales/dashboard', token),
  getResearchDashboard: (token) => apiClient.get('/api/dept/research/dashboard', token),
};
