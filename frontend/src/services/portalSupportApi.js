import { apiClient } from './client';

const BASE = '/api/portal-support';

export const portalSupportApi = {
  // User — submit ticket
  createTicket: (token, body) => apiClient.post(`${BASE}/tickets`, body, token),

  // User — view own tickets
  getMyTickets: (token) => apiClient.get(`${BASE}/tickets/my`, token),

  // User / Admin — single ticket
  getTicket: (token, id) => apiClient.get(`${BASE}/tickets/${id}`, token),

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
