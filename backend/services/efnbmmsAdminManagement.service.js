const env = require('../config/env');
const logger = require('../utils/logger');

const stripTrailingSlash = (value) => String(value || '').replace(/\/$/, '');

const getBaseUrl = () =>
  stripTrailingSlash(
    env.EFNBMMS_ADMIN_MANAGEMENT_API_URL ||
    env.EFNBMMS_ADMIN_MANAGEMENT_API_URL ||
      env.EFMBMMS_ADMIN_MANAGEMENT_API_URL ||
      ''
  );

const getServiceToken = () =>
  String(
    env.EFNBMMS_API_TOKEN ||
    env.EFMBMMS_API_TOKEN ||
      env.SUPER_ADMIN_PORTAL_SERVICE_TOKEN ||
      ''
  ).trim();

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
  if (!response) return null;
  if (response.status === 204) return null;

  const raw = await response.text().catch(() => '');
  if (!raw) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(raw);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to parse EFNBMMS JSON response');
    }
  }

  return raw;
};

const request = async (method, path = '', { body, headers = {}, requestId } = {}) => {
  const baseUrl = getBaseUrl();
  const token = getServiceToken();
  if (!baseUrl || !token) {
    const error = new Error('EFNBMMS admin-management integration is not configured');
    error.status = 404;
    throw error;
  }

  const targetUrl = buildTargetUrl(path);
  if (!targetUrl) {
    const error = new Error('EFNBMMS admin-management URL is missing');
    error.status = 404;
    throw error;
  }

  const finalRequestId = requestId || createRequestId();
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

  const response = await fetch(targetUrl, fetchOptions);
  const data = await parseResponseBody(response);

  return {
    status: response.status,
    ok: response.ok,
    headers: response.headers,
    data,
  };
};

module.exports = {
  getBaseUrl,
  getServiceToken,
  buildTargetUrl,
  request,
};
