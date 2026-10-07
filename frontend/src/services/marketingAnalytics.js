import { apiClient } from './client';

// Marketing Analytics reads from our own backend only. The external marketing platform's
// base URL and credentials live in the server environment and are never shipped to the
// browser, so there is deliberately no platform URL or token anywhere in this file.
const BASE = '/api/ceo/marketing-analytics';

// Only the filters the backend accepts are forwarded, and empty values are dropped so the
// querystring (and the server's cache key) stays stable between equivalent requests.
const FILTER_KEYS = ['projectId', 'startDate', 'endDate', 'channel', 'state', 'city', 'campaign', 'status'];

const toQuery = (filters = {}, extra = {}) => {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '' && value !== 'all') params.set(key, value);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export const marketingAnalyticsApi = {
  // One call returns KPIs, map points, channels, states, campaigns, trend, facets and the
  // first page of contacts — the whole dashboard in a single round trip.
  getAnalytics: (token, filters = {}, options = {}) =>
    apiClient.get(`${BASE}${toQuery(filters, options)}`, token, { cache: false }),

  // Contacts alone, for paging and search, so changing the page does not recompute charts.
  getContacts: (token, filters = {}, { page = 1, limit = 25, search = '' } = {}) =>
    apiClient.get(`${BASE}/contacts${toQuery(filters, { page, limit, search })}`, token, { cache: false }),

  // Full record for the detail drawer. The only response carrying unmasked contact
  // details, which is why it is fetched per record rather than with the table.
  getContact: (token, contactId, filters = {}) =>
    apiClient.get(`${BASE}/contacts/${encodeURIComponent(contactId)}${toQuery(filters)}`, token, { cache: false }),

  // Projects for the selector — always from the API, never hardcoded.
  getProjects: (token) => apiClient.get(`${BASE}/projects`, token, { cache: false }),

  // Whether the integration is configured, so the page can explain itself before it tries
  // to load data. Returns no secret, only whether one is present.
  getStatus: (token) => apiClient.get(`${BASE}/status`, token, { cache: false }),
};

export default marketingAnalyticsApi;
