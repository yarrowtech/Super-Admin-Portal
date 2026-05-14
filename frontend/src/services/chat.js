import { apiClient } from './client';

export const chatApi = {
  getConversations: (token, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/api/chat/conversations${query ? `?${query}` : ''}`, token, { cache: false });
  },
  getMessages: (token, conversationId, params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        searchParams.set(key, String(value));
      }
    });
    const query = searchParams.toString();
    return apiClient.get(`/api/chat/messages/${conversationId}${query ? `?${query}` : ''}`, token, { cache: false });
  },
  sendMessage: (token, body) => apiClient.post('/api/chat/send', body, token),
  markRead: (token, conversationId, messageIds) => apiClient.post('/api/chat/read', { conversationId, messageIds }, token),
  sendAnnouncement: (token, body) => apiClient.post('/api/chat/announcement', body, token),
};

