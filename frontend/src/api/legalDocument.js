// frontend/src/api/legalDocument.js
import { apiClient } from './client';

const P = '/api/legal';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getLegalResponseData = (response) => (
  response?.data?.data ?? response?.data ?? response
);

export const getLegalListItems = (response) => {
  const data = getLegalResponseData(response);
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.items) ? data.items : [];
};

// ── LAW PORTAL ────────────────────────────────────────────────────────────────

/** Create a new legal document (LAW) */
export const createLegalDocument = (token, payload) => {
  const hasFiles = payload?.attachment instanceof File ||
    payload?.sourceFile instanceof File ||
    (Array.isArray(payload?.supportingAttachments) && payload.supportingAttachments.some((file) => file instanceof File));
  if (hasFiles) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (key === 'attachment') formData.append('attachment', value);
      else if (key === 'sourceFile') formData.append('sourceFile', value);
      else if (key === 'supportingAttachments') {
        value.forEach((file) => {
          if (file instanceof File) formData.append('attachments', file);
        });
      }
      else if (Array.isArray(value)) formData.append(key, JSON.stringify(value));
      else formData.append(key, value);
    });
    return apiClient.upload(`${P}/create`, formData, token);
  }
  return apiClient.post(`${P}/create`, payload, token);
};

/** Get current user's documents */
export const getMyDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/my/documents${q ? `?${q}` : ''}`, token, { cache: false, forceRefresh: true });
};

/** Get every document tagged to a project, regardless of author (requires projectId) */
export const getProjectDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/project/documents${q ? `?${q}` : ''}`, token, { cache: false, forceRefresh: true });
};

/** Get a single document by ID */
export const getLegalDocumentById = (token, id) =>
  apiClient.get(`${P}/${id}`, token);

/** Auto-save document content (no version bump) */
export const autoSaveDocument = (token, id, content) =>
  apiClient.put(`${P}/${id}/auto-save`, { content }, token);

/** Manual save-draft (bumps minor version, creates snapshot) */
export const saveDraft = (token, id, payload) =>
  apiClient.put(`${P}/${id}/save-draft`, payload, token);

/** Submit document to CEO for approval */
export const submitDocument = (token, id, payload = {}) =>
  apiClient.post(`${P}/${id}/submit`, payload, token);

// ── CEO PORTAL ────────────────────────────────────────────────────────────────

/** Get all pending documents (CEO) */
export const getPendingDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/queue/pending${q ? `?${q}` : ''}`, token);
};

/** Approve a document (CEO) */
export const approveDocument = (token, id, remarks = '') =>
  apiClient.post(`${P}/${id}/approve`, { remarks }, token);

/** Reject a document (CEO) — remarks required */
export const rejectDocument = (token, id, remarks) =>
  apiClient.post(`${P}/${id}/reject`, { remarks }, token);

// ── ADMIN / LSW PORTAL ────────────────────────────────────────────────────────

/** Get all approved/published documents */
export const getApprovedDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/registry/approved${q ? `?${q}` : ''}`, token, { cache: false, forceRefresh: true });
};

/** Get all documents (admin oversight) */
export const getAllDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/registry/all${q ? `?${q}` : ''}`, token, { cache: false, forceRefresh: true });
};

/** Delete a document (admin only, must not be approved/locked) */
export const deleteLegalDocument = (token, id) =>
  apiClient.delete(`${P}/${id}`, token);

// ── VERSION CONTROL ───────────────────────────────────────────────────────────

/** Get version history for a document */
export const getDocumentVersions = (token, id) =>
  apiClient.get(`${P}/${id}/versions`, token);

/** Get a single version by its ID */
export const getVersionById = (token, versionId) =>
  apiClient.get(`${P}/version/${versionId}`, token);

/** Restore document to a previous version */
export const restoreVersion = (token, docId, versionId) =>
  apiClient.post(`${P}/${docId}/restore/${versionId}`, {}, token);

/** Download the generated PDF for a legal document */
export const getLegalDocumentPdf = async (token, id) => {
  const res = await fetch(`${API_BASE_URL}${P}/${id}/pdf`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);

  return {
    blob,
    filename: match?.[1] || `legal-document-${id}.pdf`,
  };
};
