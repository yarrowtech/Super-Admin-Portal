// Provider adapter for the YarrowTech Projects resource.
//
// ============================== READ THIS FIRST ==============================
// The provider contract below is ASSUMED, not verified. It was reconstructed
// from a screenshot of the provider's own Projects Overview page, not from
// provider documentation. Nothing else in this repository calls an
// authenticated provider endpoint; see yarrowtechApi.service.js, where every
// operation past the public /health probe is refused as unverified.
//
// Until ASSUMED_CONTRACT below is replaced with the real contract, this module
// stays inert: `configured()` returns false and `listProjects()` is never
// called by the controller, so the Projects tab renders its unconfigured
// state. It never invents project rows.
//
// To go live, correct these four things and set SRS_PROJECTS_CONTRACT=verified:
//   1. ASSUMED_CONTRACT.path / .method   - the real projects endpoint
//   2. authHeaders()                     - the real auth + signing scheme
//   3. FIELD_MAP                         - the real response field names
//   4. extractList()                     - where the array sits in the payload
// Mapping failures throw instead of silently yielding blank rows.
// =============================================================================

const config = require('../config/yarrowtech');

const ASSUMED_CONTRACT = {
  path: '/v1/projects',
  method: 'GET',
  // Query parameter names the provider is assumed to accept.
  params: { search: 'search', status: 'status', page: 'page', limit: 'limit' },
};

// Assumed response field names -> our canonical field names.
const FIELD_MAP = {
  id: ['projectId', 'project_id', 'id', 'code'],
  name: ['name', 'projectName', 'title'],
  client: ['client', 'clientName', 'customer'],
  status: ['status', 'state'],
  progress: ['progress', 'progressPercent', 'completion'],
  delivery: ['deliveryDate', 'delivery_date', 'dueDate', 'delivery'],
};

// ASSUMED. Extra fields the detail screen shows on top of the list fields.
const DETAIL_FIELD_MAP = {
  manager: ['manager', 'managerEmail', 'projectManager'],
  techLead: ['techLead', 'techLeadEmail', 'tech_lead'],
  created: ['createdAt', 'created_at', 'created'],
  contractValue: ['contractValue', 'contract_value', 'contractAmount'],
  paidAmount: ['paidAmount', 'paid_amount', 'paid'],
  currency: ['currency', 'currencyCode'],
  notes: ['notes', 'projectNotes', 'description'],
};
const CLIENT_FIELD_MAP = {
  name: ['name', 'clientName', 'fullName'],
  email: ['email', 'clientEmail'],
  phone: ['phone', 'phoneNumber', 'mobile'],
  company: ['company', 'companyName', 'organisation', 'organization'],
  status: ['status', 'clientStatus', 'state'],
  id: ['id', 'clientId', 'client_id', '_id'],
};
const REQUIREMENTS_FIELD_MAP = {
  approved: ['approved', 'isApproved'],
  approvedBy: ['approvedBy', 'approved_by'],
  approvedAt: ['approvedAt', 'approved_at', 'approvedOn'],
};

// Status vocabulary observed on the provider's own overview screen.
const STATUSES = ['pending', 'ongoing', 'completed'];

const contractVerified = () => String(process.env.SRS_PROJECTS_CONTRACT || '').trim().toLowerCase() === 'verified';

const configured = () => {
  const { baseUrl, credentialsConfigured } = config.publicConfiguration();
  return Boolean(baseUrl && credentialsConfigured && contractVerified());
};

const unconfiguredReason = () => {
  const { baseUrl, missingConfiguration } = config.publicConfiguration();
  if (!baseUrl) return 'SRS_API_BASE_URL is not a valid HTTPS URL.';
  if (missingConfiguration.length) return `Provider credentials missing: ${missingConfiguration.join(', ')}.`;
  return 'The provider projects contract is unverified. Confirm the endpoint, authentication and response format with the provider, correct yarrowtechProjects.adapter.js, then set SRS_PROJECTS_CONTRACT=verified.';
};

const fail = (status, message, code) => {
  const error = new Error(message);
  error.statusCode = status;
  if (code) error.code = code;
  throw error;
};

// ASSUMED. The provider's signing scheme is undocumented here; SRS_SIGNING_SECRET
// is deliberately left unused rather than signed with a guessed algorithm.
const authHeaders = () => {
  const { apiKey, clientId } = config.getConfiguration();
  return { Accept: 'application/json', 'X-API-Key': apiKey, 'X-Client-Id': clientId };
};

const pick = (row, names) => {
  for (const name of names) if (row[name] !== undefined && row[name] !== null) return row[name];
  return undefined;
};

// Accepts 0-1 or 0-100 and normalises to an integer percentage.
const toPercent = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  if (number > 0 && number <= 1) return Math.round(number * 100);
  return Math.min(100, Math.round(number));
};

const toStatus = (value) => {
  const text = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (STATUSES.includes(text)) return text;
  if (['in_progress', 'active', 'running'].includes(text)) return 'ongoing';
  if (['done', 'delivered', 'closed'].includes(text)) return 'completed';
  if (['new', 'queued', 'not_started'].includes(text)) return 'pending';
  return 'pending';
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const mapProject = (row, index) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    fail(502, `Provider returned an unexpected project entry at index ${index}.`, 'YARROWTECH_PROJECT_SHAPE');
  }
  const id = pick(row, FIELD_MAP.id);
  const name = pick(row, FIELD_MAP.name);
  // A row we cannot identify or name is a mapping error, not an empty row.
  if (id === undefined || name === undefined) {
    fail(502, `Provider project at index ${index} has no recognised id or name field. Correct FIELD_MAP in yarrowtechProjects.adapter.js.`, 'YARROWTECH_PROJECT_MAPPING');
  }
  return {
    id: String(id),
    name: String(name),
    client: pick(row, FIELD_MAP.client) === undefined ? '' : String(pick(row, FIELD_MAP.client)),
    status: toStatus(pick(row, FIELD_MAP.status)),
    progress: toPercent(pick(row, FIELD_MAP.progress)),
    delivery: toDate(pick(row, FIELD_MAP.delivery)),
  };
};

const toMoney = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

const mapAll = (source, map) => Object.fromEntries(
  Object.entries(map).map(([key, names]) => [key, pick(source || {}, names)]),
);

// Builds on mapProject, so a detail payload we cannot identify fails the same way.
const mapProjectDetail = (payload) => {
  const row = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
  const base = mapProject(row, 0);
  const extra = mapAll(row, DETAIL_FIELD_MAP);
  const clientSource = row.clientDetails || row.client_details ||
    (row.client && typeof row.client === 'object' ? row.client : null);
  const client = mapAll(clientSource, CLIENT_FIELD_MAP);
  const requirementsSource = row.requirements || row.srs || null;
  const requirements = mapAll(requirementsSource, REQUIREMENTS_FIELD_MAP);
  const contractValue = toMoney(extra.contractValue);
  const paidAmount = toMoney(extra.paidAmount);
  return {
    ...base,
    manager: extra.manager === undefined ? '' : String(extra.manager),
    techLead: extra.techLead === undefined ? '' : String(extra.techLead),
    created: toDate(extra.created),
    notes: extra.notes === undefined || extra.notes === null ? '' : String(extra.notes),
    currency: extra.currency === undefined ? 'INR' : String(extra.currency),
    payment: {
      contractValue,
      paid: paidAmount,
      // Derived here so the UI never shows a due figure that disagrees with the total.
      due: Math.max(0, contractValue - paidAmount),
      percentPaid: contractValue > 0 ? Math.min(100, Math.round((paidAmount / contractValue) * 100)) : 0,
      count: Array.isArray(row.payments) ? row.payments.length : Number(row.paymentCount) || 0,
    },
    client: {
      name: client.name === undefined ? String(base.client || '') : String(client.name),
      email: client.email === undefined ? '' : String(client.email),
      phone: client.phone === undefined ? '' : String(client.phone),
      company: client.company === undefined ? '' : String(client.company),
      status: client.status === undefined ? '' : String(client.status),
      id: client.id === undefined ? '' : String(client.id),
    },
    requirements: {
      approved: requirements.approved === true,
      approvedBy: requirements.approvedBy === undefined ? '' : String(requirements.approvedBy),
      approvedAt: toDate(requirements.approvedAt),
    },
  };
};

// ASSUMED. Handles a bare array or the common {data|items|results: []} envelopes.
const extractList = (payload) => {
  if (Array.isArray(payload)) return { rows: payload, total: payload.length };
  if (payload && typeof payload === 'object') {
    for (const key of ['data', 'items', 'results', 'projects']) {
      if (Array.isArray(payload[key])) {
        const total = Number(payload.total ?? payload.count ?? payload[key].length);
        return { rows: payload[key], total: Number.isFinite(total) ? total : payload[key].length };
      }
    }
  }
  fail(502, 'Provider response did not contain a projects array. Correct extractList in yarrowtechProjects.adapter.js.', 'YARROWTECH_PROJECT_ENVELOPE');
};

const request = async (path, { method = 'GET', body, query } = {}) => {
  const { baseUrl } = config.publicConfiguration();
  const url = new URL(baseUrl + path);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  let response;
  try {
    response = await fetch(url, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    const timedOut = ['TimeoutError', 'AbortError'].includes(error.name);
    fail(504, timedOut ? 'The provider timed out. Try again shortly.' : 'Could not reach the provider.', 'YARROWTECH_UNREACHABLE');
  }
  if (response.status === 401 || response.status === 403) {
    await response.body?.cancel();
    fail(502, 'The provider rejected our credentials. Verify the authentication and signing scheme.', 'YARROWTECH_AUTH_REJECTED');
  }
  if (response.status === 404) {
    await response.body?.cancel();
    fail(502, `The provider has no resource at ${path}. Correct ASSUMED_CONTRACT in yarrowtechProjects.adapter.js.`, 'YARROWTECH_ENDPOINT_UNKNOWN');
  }
  if (!response.ok) {
    await response.body?.cancel();
    fail(502, `The provider returned HTTP ${response.status}.`, 'YARROWTECH_HTTP_ERROR');
  }
  if (!(response.headers.get('content-type') || '').toLowerCase().includes('application/json')) {
    await response.body?.cancel();
    fail(502, 'The provider did not return JSON.', 'YARROWTECH_NOT_JSON');
  }
  try {
    return await response.json();
  } catch {
    fail(502, 'The provider returned invalid JSON.', 'YARROWTECH_BAD_JSON');
  }
};

const listProjects = async ({ search, status, page = 1, limit = 25 } = {}) => {
  if (!configured()) fail(409, unconfiguredReason(), 'YARROWTECH_PROJECTS_UNVERIFIED');
  const { params } = ASSUMED_CONTRACT;
  const payload = await request(ASSUMED_CONTRACT.path, {
    method: ASSUMED_CONTRACT.method,
    query: { [params.search]: search, [params.status]: status, [params.page]: page, [params.limit]: limit },
  });
  const { rows, total } = extractList(payload);
  return { items: rows.map(mapProject), total, page, limit };
};

const getProject = async (projectId) => {
  if (!configured()) fail(409, unconfiguredReason(), 'YARROWTECH_PROJECTS_UNVERIFIED');
  return mapProjectDetail(await request(`${ASSUMED_CONTRACT.path}/${encodeURIComponent(projectId)}`));
};

const updateProject = async (projectId, changes) => {
  if (!configured()) fail(409, unconfiguredReason(), 'YARROWTECH_PROJECTS_UNVERIFIED');
  return mapProjectDetail(await request(`${ASSUMED_CONTRACT.path}/${encodeURIComponent(projectId)}`, { method: 'PATCH', body: changes }));
};

module.exports = {
  configured, unconfiguredReason, listProjects, getProject, updateProject,
  STATUSES, ASSUMED_CONTRACT,
  // exported for tests
  _internal: { mapProject, mapProjectDetail, extractList, toPercent, toStatus, toMoney },
};
