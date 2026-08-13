import { apiClient } from './client';

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized === '') return;
    search.set(key, String(normalized));
  });
  return search.toString();
};

export const profileApi = {
  getMyProfile: (token) => apiClient.get('/api/profile/me', token),
  updateMyProfile: (token, payload) => apiClient.patch('/api/profile/update', payload, token),
  patchMyProfile: (token, payload) => apiClient.patch('/api/profile/update', payload, token),
  uploadResume: async (token, file) => {
    const form = new FormData();
    form.append('resume', file);
    const response = await fetch(`${apiClient.getBaseUrl()}/api/profile/upload-resume`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || 'Failed to upload resume');
    }
    return response.json();
  },
  uploadAvatar: async (token, file) => {
    const form = new FormData();
    form.append('avatar', file);
    const response = await fetch(`${apiClient.getBaseUrl()}/api/profile/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || 'Failed to upload avatar');
    }
    return response.json();
  },
  uploadProfileDocument: async (token, file, docType) => {
    const form = new FormData();
    form.append('file', file);
    form.append('docType', docType);
    const response = await fetch(`${apiClient.getBaseUrl()}/api/profile/document`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      throw new Error(err?.error || 'Failed to upload document');
    }
    return response.json();
  },

  getHrProfiles: (token, params = {}) => {
    const query = toQuery(params);
    return apiClient.get(`/api/hr/users${query ? `?${query}` : ''}`, token);
  },
  getHrProfileById: (token, id) => apiClient.get(`/api/hr/user/${id}`, token),
  addHrInternalNote: (token, id, note) =>
    apiClient.post(`/api/hr/note/${id}`, { note }, token),
};

