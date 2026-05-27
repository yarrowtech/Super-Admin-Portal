// frontend/src/api/legalDocument.js
import { apiClient } from './client';

const P = '/api/legal';

// ── LAW PORTAL ────────────────────────────────────────────────────────────────

/** Create a new legal document (LAW) */
export const createLegalDocument = (token, payload) =>
  apiClient.post(`${P}/create`, payload, token);

/** Get current user's documents */
export const getMyDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/my/documents${q ? `?${q}` : ''}`, token);
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
  return apiClient.get(`${P}/registry/approved${q ? `?${q}` : ''}`, token);
};

/** Get all documents (admin oversight) */
export const getAllDocuments = (token, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return apiClient.get(`${P}/registry/all${q ? `?${q}` : ''}`, token);
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
