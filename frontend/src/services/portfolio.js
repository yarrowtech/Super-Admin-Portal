import { apiClient } from './client';

const buildUrl = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, value);
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
};

export const portfolioApi = {
  list: (token, params = {}) => apiClient.get(buildUrl('/api/portfolios', params), token, { cache: false }),
  getProjects: (token) => apiClient.get('/api/portfolios/projects', token, { cache: false }),
  getById: (token, id) => apiClient.get(`/api/portfolios/${id}`, token, { cache: false }),
  getOverview: (token, id) => apiClient.get(`/api/portfolios/${id}/overview`, token, { cache: false }),

  create: (token, body) => apiClient.post('/api/portfolios', body, token),
  update: (token, id, body) => apiClient.put(`/api/portfolios/${id}`, body, token),
  remove: (token, id) => apiClient.delete(`/api/portfolios/${id}`, token),
  uploadCoverImage: (token, id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(`/api/portfolios/${id}/cover-image`, formData, token);
  },
  removeCoverImage: (token, id) => apiClient.delete(`/api/portfolios/${id}/cover-image`, token),

  addSection: (token, id, body) => apiClient.post(`/api/portfolios/${id}/sections`, body, token),
  updateSection: (token, id, sectionId, body) =>
    apiClient.put(`/api/portfolios/${id}/sections/${sectionId}`, body, token),
  removeSection: (token, id, sectionId) =>
    apiClient.delete(`/api/portfolios/${id}/sections/${sectionId}`, token),

  addItem: (token, id, sectionId, body) =>
    apiClient.post(`/api/portfolios/${id}/sections/${sectionId}/items`, body, token),
  updateItem: (token, id, sectionId, itemId, body) =>
    apiClient.put(`/api/portfolios/${id}/sections/${sectionId}/items/${itemId}`, body, token),
  removeItem: (token, id, sectionId, itemId) =>
    apiClient.delete(`/api/portfolios/${id}/sections/${sectionId}/items/${itemId}`, token),
  uploadItemImage: (token, id, sectionId, itemId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.upload(`/api/portfolios/${id}/sections/${sectionId}/items/${itemId}/image`, formData, token);
  },
  removeItemImage: (token, id, sectionId, itemId) =>
    apiClient.delete(`/api/portfolios/${id}/sections/${sectionId}/items/${itemId}/image`, token),

  getPlaybookTemplates: (token) => apiClient.get('/api/portfolios/playbook-templates', token, { cache: false }),
  syncFromMarketingPlan: (token, id) => apiClient.post(`/api/portfolios/${id}/playbook/sync-marketing-plan`, {}, token),
  addPlaybookSlideFromTemplate: (token, id, key) =>
    apiClient.post(`/api/portfolios/${id}/playbook/slides/from-template`, { key }, token),
  addPlaybookSlide: (token, id, body) => apiClient.post(`/api/portfolios/${id}/playbook/slides`, body, token),
  updatePlaybookSlide: (token, id, slideId, body) =>
    apiClient.put(`/api/portfolios/${id}/playbook/slides/${slideId}`, body, token),
  removePlaybookSlide: (token, id, slideId) =>
    apiClient.delete(`/api/portfolios/${id}/playbook/slides/${slideId}`, token),

  addPlaybookBlock: (token, id, slideId, body) =>
    apiClient.post(`/api/portfolios/${id}/playbook/slides/${slideId}/blocks`, body, token),
  updatePlaybookBlock: (token, id, slideId, blockId, body) =>
    apiClient.put(`/api/portfolios/${id}/playbook/slides/${slideId}/blocks/${blockId}`, body, token),
  removePlaybookBlock: (token, id, slideId, blockId) =>
    apiClient.delete(`/api/portfolios/${id}/playbook/slides/${slideId}/blocks/${blockId}`, token),
};
