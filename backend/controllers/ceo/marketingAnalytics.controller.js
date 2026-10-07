'use strict';
// CEO Marketing Analytics endpoints.
//
// Thin: parses and bounds query input, delegates to the service, and translates integration
// failures into states the dashboard can render. It deliberately distinguishes three cases
// the UI shows differently — not configured, unreachable, and empty — because collapsing
// them into one 500 would leave an operator guessing which of the three they have.
const service = require('../../services/marketingAnalytics.service');
const { MarketingPlatformError, NOT_CONFIGURED } = require('../../integrations/marketingPlatform/client');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Only known keys are read, and each is length-bounded, so a hostile query string cannot
// become an unbounded cache key or a huge upstream request.
const readFilters = (query = {}) => {
  const take = (key, max = 120) => {
    const value = query[key];
    if (value === undefined || value === null) return undefined;
    const str = String(Array.isArray(value) ? value[0] : value).trim().slice(0, max);
    return str || undefined;
  };
  const dateOf = (key) => {
    const value = take(key, 10);
    return value && ISO_DATE.test(value) ? value : undefined;
  };
  return {
    projectId: take('projectId', 80),
    startDate: dateOf('startDate'),
    endDate: dateOf('endDate'),
    channel: take('channel', 60),
    state: take('state', 80),
    city: take('city', 80),
    campaign: take('campaign', 200),
    status: take('status', 60),
  };
};

// One shape for every integration failure, so the frontend has a single branch to handle.
const sendIntegrationError = (res, err) => {
  const notConfigured = err?.cause === NOT_CONFIGURED;
  return res.status(err.statusCode || 502).json({
    success: false,
    error: err.message || 'The external marketing platform could not be reached',
    code: notConfigured ? 'MARKETING_PLATFORM_NOT_CONFIGURED' : 'MARKETING_PLATFORM_UNAVAILABLE',
    // Lets the UI offer Retry only where retrying could actually help.
    retryable: notConfigured ? false : err.retryable !== false,
  });
};

const handle = (work) => async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await work(req) });
  } catch (err) {
    if (err instanceof MarketingPlatformError) return sendIntegrationError(res, err);
    req.log?.error?.({ err }, 'Marketing analytics request failed');
    return res.status(500).json({ success: false, error: 'Failed to load marketing analytics' });
  }
};

// The dashboard's single call: KPIs, map, channels, states, campaigns, trend, facets and
// the first page of contacts in one response.
exports.getMarketingAnalytics = handle(async (req) => service.getAnalytics(readFilters(req.query), {
  includeContacts: String(req.query.includeContacts ?? 'true') !== 'false',
  page: req.query.page,
  limit: req.query.limit,
  search: req.query.search,
}));

// Contacts only — what the table calls when paging or searching, so a page change does not
// recompute every chart.
exports.getMarketingContacts = handle(async (req) => {
  const data = await service.getAnalytics(readFilters(req.query), {
    includeContacts: true, page: req.query.page, limit: req.query.limit, search: req.query.search,
  });
  return data.contacts;
});

// One contact in full. The only endpoint that returns unmasked PII (§15).
exports.getMarketingContact = handle(async (req) => {
  const contact = await service.getContact(req.params.contactId, readFilters(req.query));
  if (!contact) {
    const err = new Error('Contact not found');
    err.statusCode = 404;
    throw err;
  }
  return contact;
});

// Projects for the selector, read from OUR project database — the master source. The
// marketing platform supplies activity, not the list of projects, so this endpoint works
// (and the selector is usable) even with no platform configured.
exports.getMarketingProjects = handle(async (req) => service.getProjects({
  search: req.query?.search,
  includeInactive: String(req.query?.includeInactive || '') === 'true',
}));

// Whether the integration is set up, so the page can explain itself before any data call.
// Returns no secret — only the presence of one.
exports.getMarketingStatus = (req, res) =>
  res.status(200).json({ success: true, data: service.describe() });
