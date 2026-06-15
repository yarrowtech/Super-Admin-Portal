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
  getMediaCampaigns: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/campaigns', params), token),
  getMediaContent: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/content', params), token),
  getMediaBrandAssets: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/brand-assets', params), token),
  getMediaApprovals: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/approvals', params), token),
  getMediaReportingSummary: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/reporting/summary', params), token),
  getMediaModuleData: (token, moduleKey, projectId, params = {}) =>
    apiClient.get(buildUrl(`/api/dept/media/${moduleKey}/project/${projectId}`, params), token),
  getSalesDashboard: (token) => apiClient.get('/api/dept/sales/dashboard', token),
  getResearchDashboard: (token) => apiClient.get('/api/dept/research/dashboard', token),
};
