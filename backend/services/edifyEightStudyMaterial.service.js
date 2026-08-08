const env = require('../config/env');
const logger = require('../utils/logger');

const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/$/, '');

const getBaseUrl = () => {
  const directUrl = stripTrailingSlash(env.EDIFYEIGHT_STUDY_MATERIAL_API_URL);
  if (directUrl) return directUrl;

  const apiUrl = stripTrailingSlash(env.EDIFYEIGHT_API_URL);
  if (apiUrl) return `${apiUrl}/api/internal/study-materials`;

  return '';
};

const getServiceToken = () => String(env.EDIFYEIGHT_API_TOKEN || '').trim();

const createRequestId = () => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
};

const buildTargetUrl = (path = '') => {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return '';
  const normalizedPath = String(path || '');
  if (!normalizedPath || normalizedPath === '/') return baseUrl;
  return `${baseUrl}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
};

const parseResponseBody = async (response) => {
  if (!response || response.status === 204) return null;

  const raw = await response.text().catch(() => '');
  if (!raw) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse EdifyEight study material JSON response');
    }
  }

  return raw;
};

const createFormData = (data = {}, file) => {
  const form = new FormData();
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, String(value));
  });

  if (file?.buffer) {
    const blob = new Blob([file.buffer], { type: file.mimetype || 'application/pdf' });
    form.append('pdf', blob, file.originalname || 'study-material.pdf');
  }

  return form;
};

const request = async (method, path = '', { body, file, headers = {}, requestId } = {}) => {
  const baseUrl = getBaseUrl();
  const token = getServiceToken();

  if (!baseUrl || !token) {
    const error = new Error('EdifyEight study material integration is not configured');
    error.status = 404;
    error.code = 'EDIFYEIGHT_STUDY_MATERIAL_INTEGRATION_NOT_CONFIGURED';
    throw error;
  }

  const finalRequestId = requestId || createRequestId();
  const targetUrl = buildTargetUrl(path);
  const fetchHeaders = {
    Accept: 'application/json',
    'x-request-id': finalRequestId,
    'x-client-source': 'super-admin-portal',
    Authorization: `Bearer ${token}`,
    'x-service-token': token,
    ...headers,
  };

  const fetchOptions = {
    method,
    headers: fetchHeaders,
  };

  if (file) {
    fetchOptions.body = createFormData(body, file);
  } else if (body !== undefined && body !== null && !['GET', 'HEAD'].includes(method)) {
    fetchOptions.body = JSON.stringify(body);
    fetchHeaders['Content-Type'] = 'application/json';
  }

  logger.info({ method, targetUrl, requestId: finalRequestId }, 'Calling EdifyEight study material API');
  const response = await fetch(targetUrl, fetchOptions);
  const data = await parseResponseBody(response);

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
};

const assertOk = (upstream, fallbackMessage) => {
  if (upstream.ok) return upstream;
  const error = new Error(upstream.data?.error || upstream.data?.message || fallbackMessage);
  error.status = upstream.status || 502;
  error.upstream = upstream.data;
  throw error;
};

const withQuery = (path, query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
};

const getAllMaterials = async (query = {}, requestId) =>
  assertOk(await request('GET', withQuery('', query), { requestId }), 'Failed to fetch EdifyEight study materials');

const createMaterial = async (data, file, requestId) =>
  assertOk(await request('POST', '', { body: data, file, requestId }), 'Failed to create EdifyEight study material');

const updateMaterial = async (id, data, file, requestId) =>
  assertOk(await request('PUT', encodeURIComponent(id), { body: data, file, requestId }), 'Failed to update EdifyEight study material');

const deleteMaterial = async (id, requestId) =>
  assertOk(await request('DELETE', encodeURIComponent(id), { requestId }), 'Failed to delete EdifyEight study material');

const getMaterialStats = async (requestId) =>
  assertOk(await request('GET', 'stats', { requestId }), 'Failed to fetch EdifyEight study material stats');

const getMetadata = async (requestId) =>
  assertOk(await request('GET', 'metadata', { requestId }), 'Failed to fetch EdifyEight study material metadata');

module.exports = {
  getBaseUrl,
  getServiceToken,
  getAllMaterials,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getMaterialStats,
  getMetadata,
};
