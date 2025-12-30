const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getDefaultHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (res) => {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('API Error Response:', {
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      headers: Object.fromEntries(res.headers.entries()),
      data: data
    });
    const error = new Error(data?.error || data?.message || `HTTP ${res.status}: ${res.statusText}`);
    error.status = res.status;
    error.code = data?.code;
    error.details = data?.details;
    error.userRole = data?.userRole;
    error.requiredRoles = data?.requiredRoles;
    throw error;
  }
  return data;
};

export const apiClient = {
  async get(path, token) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: getDefaultHeaders(token),
      credentials: 'include',
    });
    return parseResponse(res);
  },
  async post(path, body, token) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: getDefaultHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return parseResponse(res);
  },
  async put(path, body, token) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: getDefaultHeaders(token),
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return parseResponse(res);
  },
  async delete(path, token) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getDefaultHeaders(token),
      credentials: 'include',
    });
    return parseResponse(res);
  },
};
