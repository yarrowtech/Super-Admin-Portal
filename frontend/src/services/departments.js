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
  getMediaCampaign: (token, id) => apiClient.get(`/api/dept/media/campaigns/${id}`, token),
  createMediaCampaign: (token, body) => apiClient.post('/api/dept/media/campaigns', body, token),
  updateMediaCampaign: (token, id, body) => apiClient.put(`/api/dept/media/campaigns/${id}`, body, token),
  advanceMediaCampaignStage: (token, id, status) => apiClient.patch(`/api/dept/media/campaigns/${id}/stage`, { status }, token),
  deleteMediaCampaign: (token, id) => apiClient.delete(`/api/dept/media/campaigns/${id}`, token),
  getMediaCampaignTasks: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/campaigns/tasks', params), token),
  updateMediaCampaignTaskStatus: (token, campaignId, taskId, status) =>
    apiClient.patch(`/api/dept/media/campaigns/${campaignId}/tasks/${taskId}/status`, { status }, token),
  getMediaContent: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/content', params), token),
  createMediaContent: (token, body) => apiClient.post('/api/dept/media/content', body, token),
  requestMediaContentApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/content/${id}/approval-request`, body, token),
  getMediaBrandAssets: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/brand-assets', params), token),
  createMediaBrandAsset: (token, body) => apiClient.post('/api/dept/media/brand-assets', body, token),
  updateMediaBrandAsset: (token, id, body) => apiClient.put(`/api/dept/media/brand-assets/${id}`, body, token),
  deleteMediaBrandAsset: (token, id) => apiClient.delete(`/api/dept/media/brand-assets/${id}`, token),
  requestMediaBrandApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/brand-assets/${id}/approval-request`, body, token),

  getMediaDesignItems: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/design', params), token),
  createMediaDesignItem: (token, body) => apiClient.post('/api/dept/media/design', body, token),
  updateMediaDesignItem: (token, id, body) => apiClient.put(`/api/dept/media/design/${id}`, body, token),
  deleteMediaDesignItem: (token, id) => apiClient.delete(`/api/dept/media/design/${id}`, token),
  requestMediaDesignApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/design/${id}/approval-request`, body, token),

  getMediaVideoItems: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/video', params), token),
  createMediaVideoItem: (token, body) => apiClient.post('/api/dept/media/video', body, token),
  updateMediaVideoItem: (token, id, body) => apiClient.put(`/api/dept/media/video/${id}`, body, token),
  deleteMediaVideoItem: (token, id) => apiClient.delete(`/api/dept/media/video/${id}`, token),
  requestMediaVideoApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/video/${id}/approval-request`, body, token),

  getMediaSocialPosts: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/social', params), token),
  createMediaSocialPost: (token, body) => apiClient.post('/api/dept/media/social', body, token),
  updateMediaSocialPost: (token, id, body) => apiClient.put(`/api/dept/media/social/${id}`, body, token),
  deleteMediaSocialPost: (token, id) => apiClient.delete(`/api/dept/media/social/${id}`, token),
  requestMediaSocialApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/social/${id}/approval-request`, body, token),

  uploadMediaFile: (token, file, { section, projectId } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (section) formData.append('section', section);
    if (projectId) formData.append('projectId', projectId);
    return apiClient.upload(buildUrl('/api/dept/media/upload', projectId ? { projectId } : {}), formData, token);
  },
  getMediaApprovals: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/approvals', params), token),
  decideMediaApproval: (token, workflowId, body) => apiClient.patch(`/api/dept/media/approvals/${workflowId}/decision`, body, token),
  getMediaReportingSummary: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/reporting/summary', params), token),
  getMediaReports: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/reports', params), token),
  generateMediaReport: (token, periodType, params = {}) => apiClient.post(buildUrl('/api/dept/media/reports/generate', params), { periodType }, token),
  getMediaModuleData: (token, moduleKey, projectId, params = {}) =>
    apiClient.get(buildUrl(`/api/dept/media/${moduleKey}/project/${projectId}`, params), token),
  getMediaBudgetAllocation: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/budget', params), token),
  updateMediaBudgetAllocation: (token, body, params = {}) => apiClient.put(buildUrl('/api/dept/media/budget', params), body, token),
  getMediaBudgetSummary: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/budget/summary', params), token),
  getMediaExpenses: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/budget/expenses', params), token),
  createMediaExpense: (token, body, params = {}) => apiClient.post(buildUrl('/api/dept/media/budget/expenses', params), body, token),
  getMediaKpiSnapshot: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/kpi', params), token),
  updateMediaKpiSnapshot: (token, body, params = {}) => apiClient.put(buildUrl('/api/dept/media/kpi', params), body, token),
  getMediaMarketingFunnel: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/kpi/funnel', params), token),
  getMediaKpiTrend: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/kpi/trend', params), token),
  getMediaCalendar: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/calendar', params), token),
  getMediaWeeklyPlans: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/weekly-plans', params), token),
  createMediaWeeklyPlan: (token, body, params = {}) => apiClient.post(buildUrl('/api/dept/media/weekly-plans', params), body, token),
  updateMediaWeeklyPlanObjective: (token, planId, objectiveId, status, params = {}) =>
    apiClient.patch(buildUrl(`/api/dept/media/weekly-plans/${planId}/objectives/${objectiveId}`, params), { status }, token),
  getMediaChecklists: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/checklists', params), token),
  addMediaChecklistItem: (token, checklistType, label, params = {}) =>
    apiClient.post(buildUrl(`/api/dept/media/checklists/${encodeURIComponent(checklistType)}/items`, params), { label }, token),
  toggleMediaChecklistItem: (token, checklistType, itemId, params = {}) =>
    apiClient.patch(buildUrl(`/api/dept/media/checklists/${encodeURIComponent(checklistType)}/items/${itemId}/toggle`, params), {}, token),
  getSalesDashboard: (token) => apiClient.get('/api/dept/sales/dashboard', token),
  getResearchDashboard: (token) => apiClient.get('/api/dept/research/dashboard', token),
};
