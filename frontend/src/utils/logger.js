import pino from 'pino';

const APP_NAME = 'super-admin-frontend';
const ENV = import.meta.env.MODE || 'development';
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || (import.meta.env.PROD ? 'info' : 'debug');
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const isTest = ENV === 'test';
const isDevelopment = import.meta.env.DEV && !isTest;

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'api_key',
  'secret',
]);

const normalizeKey = (key) => String(key || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();

const sanitize = (value, depth = 0) => {
  if (value == null) return value;
  if (depth > 4) return '[MaxDepth]';
  if (value instanceof Error) return { message: value.message, name: value.name };
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => sanitize(item, depth + 1));
  return Object.entries(value).reduce((acc, [key, item]) => {
    acc[key] = SENSITIVE_KEYS.has(normalizeKey(key)) ? '[Redacted]' : sanitize(item, depth + 1);
    return acc;
  }, {});
};

const createRequestId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

const toApiPath = (input) => {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    const url = new URL(rawUrl, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return String(input || '');
  }
};

const isApiRequest = (input) => {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url;
    const url = new URL(rawUrl, window.location.origin);
    const apiBase = new URL(API_BASE_URL, window.location.origin);
    if (url.pathname.startsWith('/__dev')) return false;
    return url.pathname.startsWith('/api') || url.origin === apiBase.origin;
  } catch {
    return false;
  }
};

const sendToBackendTerminal = (event = {}) => {
  if (!isDevelopment || typeof fetch !== 'function') return;
  const body = JSON.stringify(sanitize({
    source: 'frontend',
    env: ENV,
    ...event,
  }));
  try {
    fetch(`${API_BASE_URL}/__dev/frontend-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(event.requestId ? { 'x-request-id': event.requestId } : {}),
      },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {});
  } catch {
    // Never let development logging affect application behavior.
  }
};

const emitFrontendEvent = (level, event = {}, message = 'Frontend event') => {
  sendToBackendTerminal({
    level,
    eventType: event.eventType || 'event',
    message,
    ...event,
  });
};

const logger = pino({
  name: APP_NAME,
  level: LOG_LEVEL,
  enabled: !isTest,
  base: {
    service: APP_NAME,
    env: ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'authorization',
      'cookie',
      'token',
      'refreshToken',
      'password',
      '*.authorization',
      '*.cookie',
      '*.token',
      '*.refreshToken',
      '*.password',
    ],
    remove: true,
  },
  browser: {
    asObject: true,
  },
});

const normalizeLogArgs = (arg1, arg2) => {
  if (typeof arg1 === 'string') return [{}, arg1];
  return [arg1 && typeof arg1 === 'object' ? arg1 : {}, arg2 || 'Frontend event'];
};

const createLogger = (bindings = {}) => {
  const child = logger.child(bindings);
  const wrap = (level) => (arg1, arg2) => {
    child[level](arg1, arg2);
    if (level === 'trace' || level === 'debug') return;
    const [payload, message] = normalizeLogArgs(arg1, arg2);
    emitFrontendEvent(level, {
      module: bindings.module || payload.module || 'frontend',
      action: payload.action || null,
      status: payload.status || null,
      requestId: payload.requestId || null,
      error: payload.err?.message || payload.error?.message || payload.error || null,
    }, message);
  };
  return {
    trace: wrap('trace'),
    debug: wrap('debug'),
    info: wrap('info'),
    warn: wrap('warn'),
    error: wrap('error'),
    fatal: wrap('fatal'),
    child: (childBindings = {}) => createLogger({ ...bindings, ...childBindings }),
  };
};

let fetchLoggingInstalled = false;

const installFrontendFetchLogging = () => {
  if (!isDevelopment || fetchLoggingInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  fetchLoggingInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isApiRequest(input)) {
      return nativeFetch(input, init);
    }

    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const headers = new Headers(init.headers || request?.headers || {});
    const requestId = headers.get('x-request-id') || createRequestId();
    headers.set('x-request-id', requestId);
    headers.set('x-client-source', headers.get('x-client-source') || 'frontend');
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    const path = toApiPath(input);
    const startedAt = performance.now();
    const nextInit = { ...init, headers };

    emitFrontendEvent('info', {
      eventType: 'api',
      direction: 'out',
      method,
      path,
      requestId,
      status: 'started',
    }, 'Frontend API request started');

    try {
      const response = await nativeFetch(input, nextInit);
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const failed = response.status >= 400;
      emitFrontendEvent(failed ? 'warn' : 'info', {
        eventType: 'api',
        direction: failed ? 'error' : 'in',
        method,
        path,
        requestId: response.headers.get('x-request-id') || requestId,
        status: failed ? 'failed' : 'success',
        statusCode: response.status,
        durationMs,
      }, failed ? 'Frontend API response failed' : 'Frontend API response completed');
      return response;
    } catch (error) {
      const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
      emitFrontendEvent('error', {
        eventType: 'api',
        direction: 'error',
        method,
        path,
        requestId,
        status: 'error',
        durationMs,
        error: error?.message || 'Network error',
      }, 'Frontend API request error');
      throw error;
    }
  };
};

export { createLogger, createRequestId, emitFrontendEvent, installFrontendFetchLogging };
export default logger;
