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

const BASE = '/api/portfolio-hierarchy';

export const portfolioHierarchyApi = {
  getBrands: (token) => apiClient.get(`${BASE}/brands`, token, { cache: false }),

  // Groups
  getGroups: (token, portfolioId) => apiClient.get(`${BASE}/portfolios/${portfolioId}/groups`, token, { cache: false }),
  getPortfolioTree: (token, portfolioId) => apiClient.get(`${BASE}/portfolios/${portfolioId}/stats`, token, { cache: false }),
  getGroup: (token, groupId) => apiClient.get(`${BASE}/groups/${groupId}`, token, { cache: false }),
  createGroup: (token, portfolioId, body) => apiClient.post(`${BASE}/portfolios/${portfolioId}/groups`, body, token),
  updateGroup: (token, groupId, body) => apiClient.patch(`${BASE}/groups/${groupId}`, body, token),
  archiveGroup: (token, groupId) => apiClient.post(`${BASE}/groups/${groupId}/archive`, {}, token),
  restoreGroup: (token, groupId) => apiClient.post(`${BASE}/groups/${groupId}/restore`, {}, token),
  trashGroup: (token, groupId) => apiClient.post(`${BASE}/groups/${groupId}/trash`, {}, token),
  restoreGroupFromTrash: (token, groupId) => apiClient.post(`${BASE}/groups/${groupId}/restore-from-trash`, {}, token),

  // Categories
  getCategories: (token, groupId) => apiClient.get(`${BASE}/groups/${groupId}/categories`, token, { cache: false }),
  getCategory: (token, categoryId) => apiClient.get(`${BASE}/categories/${categoryId}`, token, { cache: false }),
  getCategoryStats: (token, categoryId) => apiClient.get(`${BASE}/categories/${categoryId}/stats`, token, { cache: false }),
  createCategory: (token, groupId, body) => apiClient.post(`${BASE}/groups/${groupId}/categories`, body, token),
  updateCategory: (token, categoryId, body) => apiClient.patch(`${BASE}/categories/${categoryId}`, body, token),
  archiveCategory: (token, categoryId) => apiClient.post(`${BASE}/categories/${categoryId}/archive`, {}, token),
  restoreCategory: (token, categoryId) => apiClient.post(`${BASE}/categories/${categoryId}/restore`, {}, token),
  trashCategory: (token, categoryId) => apiClient.post(`${BASE}/categories/${categoryId}/trash`, {}, token),
  restoreCategoryFromTrash: (token, categoryId) => apiClient.post(`${BASE}/categories/${categoryId}/restore-from-trash`, {}, token),

  // Assets
  getAssets: (token, categoryId, params = {}) => apiClient.get(buildUrl(`${BASE}/categories/${categoryId}/assets`, params), token, { cache: false }),
  createAsset: (token, categoryId, body) => apiClient.post(`${BASE}/categories/${categoryId}/assets`, body, token),
  getAsset: (token, assetId) => apiClient.get(`${BASE}/assets/${assetId}`, token, { cache: false }),
  updateAsset: (token, assetId, body) => apiClient.patch(`${BASE}/assets/${assetId}`, body, token),
  changeAssetStatus: (token, assetId, status) => apiClient.post(`${BASE}/assets/${assetId}/status`, { status }, token),
  deleteAsset: (token, assetId) => apiClient.delete(`${BASE}/assets/${assetId}`, token),
  restoreAsset: (token, assetId) => apiClient.post(`${BASE}/assets/${assetId}/restore`, {}, token),
  getAssetVersions: (token, assetId) => apiClient.get(`${BASE}/assets/${assetId}/versions`, token, { cache: false }),
  restoreAssetVersion: (token, assetId, versionId) => apiClient.post(`${BASE}/assets/${assetId}/restore-version/${versionId}`, {}, token),
  getAssetHistory: (token, assetId, params = {}) => apiClient.get(buildUrl(`${BASE}/assets/${assetId}/history`, params), token, { cache: false }),

  getTasks: (token, categoryId, params = {}) => apiClient.get(buildUrl(`${BASE}/categories/${categoryId}/tasks`, params), token, { cache: false }),
  createTask: (token, categoryId, body) => apiClient.post(`${BASE}/categories/${categoryId}/tasks`, body, token),
  updateTask: (token, taskId, body) => apiClient.patch(`${BASE}/tasks/${taskId}`, body, token),
  archiveTask: (token, taskId) => apiClient.post(`${BASE}/tasks/${taskId}/archive`, {}, token),
  getCategoryActivity: (token, categoryId, params = {}) => apiClient.get(buildUrl(`${BASE}/categories/${categoryId}/activity`, params), token, { cache: false }),
  getCategoryHealth: (token, categoryId) => apiClient.get(`${BASE}/categories/${categoryId}/health`, token, { cache: false }),
  getFiles: (token, categoryId, params = {}) => apiClient.get(buildUrl(`${BASE}/categories/${categoryId}/files`, params), token, { cache: false }),
  uploadFile: (token, categoryId, formData) => apiClient.upload(`${BASE}/categories/${categoryId}/files`, formData, token),
  archiveFile: (token, fileId) => apiClient.post(`${BASE}/files/${fileId}/archive`, {}, token),
  getMetrics: (token, categoryId, params = {}) => apiClient.get(buildUrl(`${BASE}/categories/${categoryId}/metrics`, params), token, { cache: false }),
  addMetric: (token, categoryId, body) => apiClient.post(`${BASE}/categories/${categoryId}/metrics`, body, token),
};
