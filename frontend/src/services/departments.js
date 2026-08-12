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
  getProjectOverviewProjects: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/project-overview/projects', params), token, options),
  getProjectOverviewDetail: (token, projectId, params = {}, options = {}) => apiClient.get(buildUrl(`/api/dept/project-overview/projects/${projectId}/overview`, params), token, options),
  getMediaDashboard: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/dashboard', params), token),
  getMediaHeadDashboard: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/dashboard', params), token, options),
  getMediaHeadProjects: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/projects', params), token, options),
  getMediaHeadSalesSummary: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/sales-summary', params), token, options),
  getMediaHeadMarketingSummary: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/marketing-summary', params), token, options),
  getMediaHeadApprovals: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/approvals', params), token, options),
  getMediaHeadActivity: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/activity', params), token, options),
  getMediaHeadAttention: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/attention', params), token, options),
  getMediaHeadRevenue: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/revenue', params), token, options),
  getMediaHeadTeam: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/team', params), token, options),
  getMediaHeadDeadlines: (token, params = {}, options = {}) => apiClient.get(buildUrl('/api/dept/media/head/deadlines', params), token, options),
  getMediaHeadProjectDetail: (token, projectId, options = {}) => apiClient.get(`/api/dept/media/head/projects/${projectId}`, token, options),
  getMediaProjects: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/projects', params), token),
  uploadMediaProjectLogo: (token, projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(`/api/dept/media/projects/${projectId}/logo`, formData, token);
  },
  updateMediaProjectThemeColor: (token, projectId, themeColor) =>
    apiClient.patch(`/api/dept/media/projects/${projectId}/theme-color`, { themeColor }, token),
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
  getMediaMarketingPlan: (token, projectId, options = {}) => apiClient.get(`/api/dept/media/marketing-plans/project/${projectId}`, token, options),
  saveMediaMarketingPlan: (token, projectId, body) => apiClient.put(`/api/dept/media/marketing-plans/project/${projectId}`, body, token),
  getMediaContent: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/content', params), token),
  getMediaContentItem: (token, id) => apiClient.get(`/api/dept/media/content/${id}`, token),
  createMediaContent: (token, body) => apiClient.post('/api/dept/media/content', body, token),
  updateMediaContent: (token, id, body) => apiClient.put(`/api/dept/media/content/${id}`, body, token),
  deleteMediaContent: (token, id) => apiClient.delete(`/api/dept/media/content/${id}`, token),
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

  getMediaAdvertisements: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/advertisements', params), token),
  createMediaAdvertisement: (token, body) => apiClient.post('/api/dept/media/advertisements', body, token),
  updateMediaAdvertisement: (token, id, body) => apiClient.put(`/api/dept/media/advertisements/${id}`, body, token),
  deleteMediaAdvertisement: (token, id) => apiClient.delete(`/api/dept/media/advertisements/${id}`, token),
  requestMediaAdvertisementApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/advertisements/${id}/approval-request`, body, token),

  getMediaSeoItems: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/seo', params), token),
  createMediaSeoItem: (token, body) => apiClient.post('/api/dept/media/seo', body, token),
  updateMediaSeoItem: (token, id, body) => apiClient.put(`/api/dept/media/seo/${id}`, body, token),
  deleteMediaSeoItem: (token, id) => apiClient.delete(`/api/dept/media/seo/${id}`, token),
  requestMediaSeoApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/seo/${id}/approval-request`, body, token),

  getMediaWebsiteItems: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/website', params), token),
  createMediaWebsiteItem: (token, body) => apiClient.post('/api/dept/media/website', body, token),
  updateMediaWebsiteItem: (token, id, body) => apiClient.put(`/api/dept/media/website/${id}`, body, token),
  deleteMediaWebsiteItem: (token, id) => apiClient.delete(`/api/dept/media/website/${id}`, token),
  requestMediaWebsiteApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/website/${id}/approval-request`, body, token),

  getMediaTestimonials: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/testimonials', params), token),
  createMediaTestimonial: (token, body) => apiClient.post('/api/dept/media/testimonials', body, token),
  updateMediaTestimonial: (token, id, body) => apiClient.put(`/api/dept/media/testimonials/${id}`, body, token),
  deleteMediaTestimonial: (token, id) => apiClient.delete(`/api/dept/media/testimonials/${id}`, token),
  requestMediaTestimonialApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/testimonials/${id}/approval-request`, body, token),

  getMediaCaseStudies: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/case-studies', params), token),
  createMediaCaseStudy: (token, body) => apiClient.post('/api/dept/media/case-studies', body, token),
  updateMediaCaseStudy: (token, id, body) => apiClient.put(`/api/dept/media/case-studies/${id}`, body, token),
  deleteMediaCaseStudy: (token, id) => apiClient.delete(`/api/dept/media/case-studies/${id}`, token),
  requestMediaCaseStudyApproval: (token, id, body = {}) => apiClient.post(`/api/dept/media/case-studies/${id}/approval-request`, body, token),

  uploadMediaFile: (token, file, { section, projectId } = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (section) formData.append('section', section);
    if (projectId) formData.append('projectId', projectId);
    return apiClient.upload(buildUrl('/api/dept/media/upload', projectId ? { projectId } : {}), formData, token);
  },
  getMediaApprovals: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/approvals', params), token),
  decideMediaApproval: (token, workflowId, body) => apiClient.patch(`/api/dept/media/approvals/${workflowId}/decision`, body, token),
  getMediaActivity: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/activity', params), token),
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
  createMediaCalendarEvent: (token, body, params = {}) => apiClient.post(buildUrl('/api/dept/media/calendar/events', params), body, token),
  updateMediaCalendarEvent: (token, eventId, body, params = {}) =>
    apiClient.put(buildUrl(`/api/dept/media/calendar/events/${eventId}`, params), body, token),
  deleteMediaCalendarEvent: (token, eventId, params = {}) =>
    apiClient.delete(buildUrl(`/api/dept/media/calendar/events/${eventId}`, params), token),
  getMediaWeeklyPlans: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/weekly-plans', params), token),
  createMediaWeeklyPlan: (token, body, params = {}) => apiClient.post(buildUrl('/api/dept/media/weekly-plans', params), body, token),
  deleteMediaWeeklyPlan: (token, planId, params = {}) =>
    apiClient.delete(buildUrl(`/api/dept/media/weekly-plans/${planId}`, params), token),
  addMediaWeeklyPlanObjective: (token, planId, text, params = {}) =>
    apiClient.post(buildUrl(`/api/dept/media/weekly-plans/${planId}/objectives`, params), { text }, token),
  updateMediaWeeklyPlanObjective: (token, planId, objectiveId, status, params = {}) =>
    apiClient.patch(buildUrl(`/api/dept/media/weekly-plans/${planId}/objectives/${objectiveId}`, params), { status }, token),
  updateMediaWeeklyPlanObjectiveText: (token, planId, objectiveId, text, params = {}) =>
    apiClient.patch(buildUrl(`/api/dept/media/weekly-plans/${planId}/objectives/${objectiveId}`, params), { text }, token),
  deleteMediaWeeklyPlanObjective: (token, planId, objectiveId, params = {}) =>
    apiClient.delete(buildUrl(`/api/dept/media/weekly-plans/${planId}/objectives/${objectiveId}`, params), token),
  getMediaChecklists: (token, params = {}) => apiClient.get(buildUrl('/api/dept/media/checklists', params), token),
  addMediaChecklistItem: (token, checklistType, label, params = {}) =>
    apiClient.post(buildUrl(`/api/dept/media/checklists/${encodeURIComponent(checklistType)}/items`, params), { label }, token),
  toggleMediaChecklistItem: (token, checklistType, itemId, params = {}) =>
    apiClient.patch(buildUrl(`/api/dept/media/checklists/${encodeURIComponent(checklistType)}/items/${itemId}/toggle`, params), {}, token),
  getSalesDashboard: (token) => apiClient.get('/api/dept/sales/dashboard', token),
  getSalesQueries: (token, params = {}) => apiClient.get(buildUrl('/api/dept/sales/queries', params), token, { cache: false }),
  createSalesQuery: (token, formData) => apiClient.upload('/api/dept/sales/queries', formData, token),
  updateSalesQuery: (token, id, body) => apiClient.put(`/api/dept/sales/queries/${id}`, body, token),
  deleteSalesQuery: (token, id) => apiClient.delete(`/api/dept/sales/queries/${id}`, token),
  getSalesQuestions: (token, params = {}) => apiClient.get(buildUrl('/api/dept/sales/questions', params), token),
  createSalesQuestion: (token, body) => apiClient.post('/api/dept/sales/questions', body, token),
  updateSalesQuestion: (token, id, body) => apiClient.put(`/api/dept/sales/questions/${id}`, body, token),
  deleteSalesQuestion: (token, id) => apiClient.delete(`/api/dept/sales/questions/${id}`, token),
  getResearchDashboard: (token) => apiClient.get('/api/dept/research/dashboard', token),
};
