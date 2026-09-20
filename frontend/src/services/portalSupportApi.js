import { apiClient } from './client';

const BASE = '/api/portal-support';

export const portalSupportApi = {
  // User — submit ticket
  createTicket: (token, body) => apiClient.post(`${BASE}/tickets`, body, token),

  // User — view own tickets
  getMyTickets: (token, status = '') =>
    apiClient.get(`${BASE}/tickets/my${status ? `?status=${encodeURIComponent(status)}` : ''}`, token, { forceRefresh: true }),

  // User — count of tickets with staff activity not yet seen
  getUnreadCount: (token) => apiClient.get(`${BASE}/tickets/unread-count`, token, { forceRefresh: true }),

  // Owner / staff — add a message to the ticket thread
  addComment: (token, id, message) => apiClient.post(`${BASE}/tickets/${id}/comments`, { message }, token),

  // Owner — close or reopen own ticket ('close' | 'reopen')
  changeOwnStatus: (token, id, action) => apiClient.patch(`${BASE}/tickets/${id}/status`, { action }, token),

  // User / Admin — single ticket
  getTicket: (token, id) => apiClient.get(`${BASE}/tickets/${id}`, token, { forceRefresh: true }),

  // Admin / IT — all tickets with optional filters
  getAllTickets: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== '' && v != null)
    ).toString();
    return apiClient.get(`${BASE}/tickets/all${qs ? `?${qs}` : ''}`, token);
  },

  // Admin / IT — reply or update status
  updateTicket: (token, id, body) => apiClient.put(`${BASE}/tickets/${id}`, body, token),

  // Any user — save notification / privacy preferences
  updatePreferences: (token, body) => apiClient.patch(`${BASE}/preferences`, body, token),
};
