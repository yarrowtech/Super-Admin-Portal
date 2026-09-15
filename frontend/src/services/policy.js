import { apiClient } from './client';

// Policy APIs are central and may be hosted separately from a project's own
// operational-data API. Existing project service clients remain unchanged.
const POLICY_API_BASE_URL = String(import.meta.env.VITE_POLICY_API_URL || apiClient.getBaseUrl()).replace(/\/$/, '');

const query = (params = {}) => {
  const value = new URLSearchParams();
  Object.entries(params).forEach(([key, item]) => { if (item !== undefined && item !== null && item !== '') value.set(key, item); });
  return value.toString() ? `?${value}` : '';
};

// The only frontend entry point for the central policy API. Acceptance is
// always resolved and validated by the server for the authenticated user.
export const policyService = {
  projects: (token, params) => request(`/api/v1/projects${query(params)}`, token),
  project: (token, projectId) => request(`/api/v1/projects/${encodeURIComponent(projectId)}`, token),
  list: (token, params) => request(`/api/v1/policies${query(params)}`, token),
  get: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}`, token),
  create: (token, payload) => request('/api/v1/policies', token, { method: 'POST', body: payload }),
  update: (token, policyId, payload) => request(`/api/v1/policies/${encodeURIComponent(policyId)}`, token, { method: 'PATCH', body: payload }),
  createVersion: (token, policyId, payload) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/versions`, token, { method: 'POST', body: payload }),
  setAssignments: (token, policyId, projectIds) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/projects`, token, { method: 'PUT', body: { projectIds } }),
  requirements: (token, projectId) => request(`/api/v1/projects/${encodeURIComponent(projectId)}/policy-requirements`, token),
  accept: (token, policyId, projectId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/accept`, token, { method: 'POST', body: { projectId } }),
};

async function request(path, token, options = {}) {
  const response = await fetch(`${POLICY_API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  const error = new Error(data?.error || data?.message || `Policy API request failed (${response.status})`);
  error.status = response.status;
  error.code = data?.code;
  throw error;
}
