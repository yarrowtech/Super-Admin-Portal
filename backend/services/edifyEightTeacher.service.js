const env = require('../config/env');
const logger = require('../utils/logger');

const stripTrailingSlash = (value) => String(value || '').trim().replace(/\/$/, '');

const getBaseUrl = () => {
  const directTeacherUrl = stripTrailingSlash(env.EDIFYEIGHT_TEACHER_API_URL);
  if (directTeacherUrl) return directTeacherUrl;

  const apiUrl = stripTrailingSlash(env.EDIFYEIGHT_API_URL);
  if (apiUrl) return `${apiUrl}/api/internal/teachers`;

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
      logger.warn({ err: error }, 'Failed to parse EdifyEight teacher JSON response');
    }
  }

  return raw;
};

const request = async (method, path = '', { body, headers = {}, requestId } = {}) => {
  const baseUrl = getBaseUrl();
  const token = getServiceToken();

  if (!baseUrl || !token) {
    const error = new Error('EdifyEight teacher integration is not configured');
    error.status = 404;
    error.code = 'EDIFYEIGHT_INTEGRATION_NOT_CONFIGURED';
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

  if (body !== undefined && body !== null && !['GET', 'HEAD'].includes(method)) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!fetchHeaders['Content-Type']) {
      fetchHeaders['Content-Type'] = 'application/json';
    }
  }

  logger.info({ method, targetUrl, requestId: finalRequestId }, 'Calling EdifyEight teacher API');
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

const getAllTeachers = async (query = {}, requestId) =>
  assertOk(await request('GET', withQuery('', query), { requestId }), 'Failed to fetch EdifyEight teachers');

const getTeacherById = async (id, requestId) =>
  assertOk(await request('GET', encodeURIComponent(id), { requestId }), 'Failed to fetch EdifyEight teacher');

const createTeacher = async (data, requestId) =>
  assertOk(await request('POST', '', { body: data, requestId }), 'Failed to create EdifyEight teacher');

const updateTeacher = async (id, data, requestId) =>
  assertOk(await request('PUT', encodeURIComponent(id), { body: data, requestId }), 'Failed to update EdifyEight teacher');

const deleteTeacher = async (id, requestId) =>
  assertOk(await request('DELETE', encodeURIComponent(id), { requestId }), 'Failed to delete EdifyEight teacher');

const getTeacherStats = async (requestId) =>
  assertOk(await request('GET', 'stats', { requestId }), 'Failed to fetch EdifyEight teacher stats');

module.exports = {
  getBaseUrl,
  getServiceToken,
  buildTargetUrl,
  request,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherStats,
};
