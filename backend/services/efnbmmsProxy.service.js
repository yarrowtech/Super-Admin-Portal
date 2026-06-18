const env = require('../config/env');
const logger = require('../utils/logger');

const stripTrailingSlash = (value) => String(value || '').replace(/\/$/, '');

const getFirstConfiguredValue = (keys = []) => {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
};

const createRequestId = () => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
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
      logger.warn({ err: error }, 'Failed to parse EFNBMMS JSON response');
    }
  }

  return raw;
};

const createEfnbmmsProxyService = ({
  label,
  baseUrlKeys = [],
  tokenKeys = [],
}) => {
  const getBaseUrl = () => stripTrailingSlash(getFirstConfiguredValue(baseUrlKeys));
  const getServiceToken = () => getFirstConfiguredValue(tokenKeys);

  const buildTargetUrl = (path = '') => {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return '';
    const normalizedPath = String(path || '');
    if (!normalizedPath || normalizedPath === '/') return baseUrl;
    return `${baseUrl}${normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`}`;
  };

  const request = async (method, path = '', { body, headers = {}, requestId } = {}) => {
    const baseUrl = getBaseUrl();
    const token = getServiceToken();
    if (!baseUrl || !token) {
      const error = new Error(`${label} integration is not configured`);
      error.status = 404;
      error.code = 'EFNBMMS_INTEGRATION_NOT_CONFIGURED';
      throw error;
    }

    const targetUrl = buildTargetUrl(path);
    if (!targetUrl) {
      const error = new Error(`${label} URL is missing`);
      error.status = 404;
      error.code = 'EFNBMMS_INTEGRATION_URL_MISSING';
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

  return {
    getBaseUrl,
    getServiceToken,
    buildTargetUrl,
    request,
  };
};

module.exports = {
  createEfnbmmsProxyService,
};

