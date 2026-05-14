import { apiClient } from './client';

export const departmentApi = {
  getMediaDashboard: (token) => apiClient.get('/api/dept/media/dashboard', token),
  getMediaCampaigns: (token) => apiClient.get('/api/dept/media/campaigns', token),
  getMediaContent: (token) => apiClient.get('/api/dept/media/content', token),
  getSalesDashboard: (token) => apiClient.get('/api/dept/sales/dashboard', token),
  getResearchDashboard: (token) => apiClient.get('/api/dept/research/dashboard', token),
};

