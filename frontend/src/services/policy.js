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
  efnbmmsContext: (token) => request('/api/v1/efnbmms/context', token),
  projects: (token, params) => request(`/api/v1/projects${query(params)}`, token),
  project: (token, projectId) => request(`/api/v1/projects/${encodeURIComponent(projectId)}`, token),
  list: (token, params) => request(`/api/v1/policies${query(params)}`, token),
  get: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}`, token),
  create: (token, payload) => request('/api/v1/policies', token, { method: 'POST', body: payload }),
  update: (token, policyId, payload) => request(`/api/v1/policies/${encodeURIComponent(policyId)}`, token, { method: 'PATCH', body: payload }),
  remove: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}`, token, { method: 'DELETE' }),
  versions: (token, policyId, params) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/versions${query(params)}`, token),
  createVersion: (token, policyId, payload) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/versions`, token, { method: 'POST', body: payload }),
  updateVersion: (token, policyId, versionId, payload) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/versions/${encodeURIComponent(versionId)}`, token, { method: 'PATCH', body: payload }),
  replaceSections: (token, policyId, sections) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/sections`, token, { method: 'PUT', body: { sections } }),
  submitReview: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/submit-review`, token, { method: 'POST' }),
  approve: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/approve`, token, { method: 'POST' }),
  publish: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/publish`, token, { method: 'POST' }),
  setAssignments: (token, policyId, projectIds) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/projects`, token, { method: 'PUT', body: { projectIds } }),
  requirements: (token, projectId) => request(`/api/v1/projects/${encodeURIComponent(projectId)}/policy-requirements`, token),
  accept: (token, policyId, projectId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/accept`, token, { method: 'POST', body: { projectId } }),
  auditLog: (token, policyId) => request(`/api/v1/policies/${encodeURIComponent(policyId)}/audit-log`, token),
  apiClients: (token, params) => request(`/api/v1/api-clients${query(params)}`, token),
  createApiClient: (token, payload) => request('/api/v1/api-clients', token, { method: 'POST', body: payload }),
  updateApiClient: (token, clientId, payload) => request(`/api/v1/api-clients/${encodeURIComponent(clientId)}`, token, { method: 'PATCH', body: payload }),
  deleteApiClient: (token, clientId) => request(`/api/v1/api-clients/${encodeURIComponent(clientId)}`, token, { method: 'DELETE' }),
  revokeApiClient: (token, clientId) => request(`/api/v1/api-clients/${encodeURIComponent(clientId)}/revoke`, token, { method: 'POST' }),
  rotateApiClientSecret: (token, clientId) => request(`/api/v1/api-clients/${encodeURIComponent(clientId)}/rotate-secret`, token, { method: 'POST' }),
};

// The public consumer base URL — shown to admins so they know where to point
// a consumer app.
export const POLICY_CONSUMER_API_URL = String(import.meta.env.VITE_POLICY_CONSUMER_API_URL || `${POLICY_API_BASE_URL}/api/efnbmms/policy/v1`);

export const uploadPolicyDocuments = async (token, policyId, files) => {
  const form = new FormData();
  Array.from(files || []).forEach((file) => form.append('files', file));
  const response = await fetch(`${POLICY_API_BASE_URL}/api/v1/policies/${encodeURIComponent(policyId)}/documents`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const data = await response.json().catch(() => null);
  if (response.ok) return data;
  const error = new Error(data?.error || data?.message || `Policy document upload failed (${response.status})`);
  error.status = response.status;
  error.code = data?.code;
  throw error;
};

async function request(path, token, options = {}) {
  const response = await fetch(`${POLICY_API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    credentials: 'include',
    cache: 'no-store',
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
