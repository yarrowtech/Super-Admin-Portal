'use strict';
// HTTP client for the external marketing platform.
//
// Every credential lives here, read from the environment and never returned to a caller.
// Nothing in this file is reachable from the browser: the CEO frontend calls our own
// /api/ceo/marketing-analytics, which calls this, so the platform token never leaves the
// server. `isConfigured()` is the switch the rest of the stack reads — with no base URL or
// token set, the API answers with a "not configured" state rather than inventing data.
const BASE_URL = process.env.MARKETING_PLATFORM_BASE_URL || '';
const API_KEY = process.env.MARKETING_PLATFORM_API_KEY || '';
const API_TOKEN = process.env.MARKETING_PLATFORM_TOKEN || '';
const TIMEOUT_MS = Number(process.env.MARKETING_PLATFORM_TIMEOUT_MS || 12000);

const isConfigured = () => Boolean(BASE_URL && (API_KEY || API_TOKEN));

// What the platform is reachable as, for diagnostics. Deliberately returns no secret —
// only whether one is present, so an operator can tell configuration from connectivity.
const describe = () => ({
  configured: isConfigured(),
  baseUrl: BASE_URL ? BASE_URL.replace(/\/+$/, '') : null,
  credential: API_TOKEN ? 'bearer-token' : API_KEY ? 'api-key' : null,
});

class MarketingPlatformError extends Error {
  constructor(message, { statusCode = 502, cause = null, retryable = true } = {}) {
    super(message);
    this.name = 'MarketingPlatformError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.cause = cause;
  }
}

const NOT_CONFIGURED = 'MARKETING_PLATFORM_NOT_CONFIGURED';

// One GET against the platform. Errors are normalised so the controller can distinguish
// "not set up" from "set up but unreachable" from "rejected our credentials" — three very
// different operator problems that a single 502 would flatten.
async function request(path, params = {}) {
  if (!isConfigured()) {
    throw new MarketingPlatformError('The external marketing platform is not configured', {
      statusCode: 503, retryable: false, cause: NOT_CONFIGURED,
    });
  }

  const url = new URL(String(path).replace(/^\/+/, ''), `${BASE_URL.replace(/\/+$/, '')}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const headers = { Accept: 'application/json' };
  if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;
  else headers['X-API-Key'] = API_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (res.status === 401 || res.status === 403) {
      // Credentials are wrong or expired; retrying will not help until they are changed.
      throw new MarketingPlatformError('The marketing platform rejected our credentials', {
        statusCode: 502, retryable: false,
      });
    }
    if (res.status === 429) {
      throw new MarketingPlatformError('The marketing platform is rate limiting requests', { statusCode: 503 });
    }
    if (!res.ok) {
      throw new MarketingPlatformError(`The marketing platform returned ${res.status}`, { statusCode: 502 });
    }
    return await res.json();
  } catch (err) {
    if (err instanceof MarketingPlatformError) throw err;
    if (err.name === 'AbortError') {
      throw new MarketingPlatformError('The marketing platform did not respond in time', { statusCode: 504 });
    }
    throw new MarketingPlatformError('The marketing platform could not be reached', { statusCode: 502, cause: err.message });
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { request, isConfigured, describe, MarketingPlatformError, NOT_CONFIGURED };
