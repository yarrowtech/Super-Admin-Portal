import { apiClient } from './client';

export const dashboardWorkflowApi = {
  getMyWorkflow: (token) => apiClient.get('/api/dashboard/workflow/me', token),
  getAllWorkflows: (token) => apiClient.get('/api/dashboard/workflow/all', token),
};

