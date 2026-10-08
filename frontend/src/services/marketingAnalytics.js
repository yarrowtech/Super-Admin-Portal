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

  // ── Spreadsheet import (CSV / XLSX / XLS) ─────────────────────────────────
  // Parsing happens on the server: the xlsx reader is ~400 KB, and shipping it to the
  // browser to read a file the server must validate anyway would be paying twice.

  // Non-destructive. Reads the file, detects the School/Email/Location columns, validates
  // every row and resolves locations — writes nothing — so the user can re-map columns and
  // re-analyse as often as they like before committing.
  analyzeImport: (token, file, mapping) => {
    const form = new FormData();
    form.append('file', file);
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    return apiClient.upload(`${BASE}/import/analyze`, form, token);
  },

  // Commits into the given project. The project is required server-side: an import with no
  // project would show up under every project's analytics.
  commitImport: (token, file, mapping, projectId) => {
    const form = new FormData();
    form.append('file', file);
    if (mapping) form.append('mapping', JSON.stringify(mapping));
    form.append('projectId', projectId);
    return apiClient.upload(`${BASE}/import`, form, token);
  },

  // Aggregated imported points for the map: one entry per city, counts only. Carries no
  // contact details, which is what makes it safe to render in a marker.
  getImportedPoints: (token, projectId) =>
    apiClient.get(`${BASE}/import/points?projectId=${encodeURIComponent(projectId)}`, token, { cache: false }),

  // The records behind one marker — the authorised detail view, fetched only on an explicit
  // click. This is the one imported-data response that carries contact details, which is
  // exactly why it is separate from the map payload.
  getLocationRecords: (token, projectId, city, { page = 1, limit = 25 } = {}) =>
    apiClient.get(
      `${BASE}/import/records${toQuery({ projectId }, { city, page, limit })}`,
      token, { cache: false }
    ),

  // Records with no resolvable location, so an unmapped count is inspectable rather than
  // just a number the user has to trust.
  getUnmappedRecords: (token, projectId, { page = 1, limit = 25 } = {}) =>
    apiClient.get(`${BASE}/import/unmapped${toQuery({ projectId }, { page, limit })}`, token, { cache: false }),
};

export default marketingAnalyticsApi;
