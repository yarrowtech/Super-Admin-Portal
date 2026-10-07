'use strict';
// Adapter between the external marketing platform's payloads and our internal shape.
//
// This file exists so a field rename upstream is a one-line change here instead of a
// frontend release. Nothing downstream — service, controller, React — may read a raw
// external field name; they read the normalised shape below.
//
// Every reader is tolerant on purpose: the brief is explicit that we must not assume the
// external API matches our structure, so each field is looked up under several plausible
// names and a missing value becomes null rather than a crash or a silent zero.
const INDIA_CITY_COORDS = require('./indiaCityCoords');

const str = (value, max = 300) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
};

// First present key wins, so upstream can rename a field without breaking us.
const pick = (row, keys) => {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => (acc == null ? acc : acc[part]), row);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

// Guard the empty cases before coercing: Number(null) and Number('') are both 0, which
// for a coordinate would silently place the record at 0°N 0°E instead of leaving it
// unplaced, and for a counter would read as a real zero rather than "not reported".
const num = (value) => {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const date = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// Channels arrive spelled many ways ("Email Marketing", "email", "EMAIL_MKT"). Collapsing
// them here is what makes the channel chart meaningful instead of a long tail of synonyms.
const CHANNEL_ALIASES = [
  [/e[-\s_]?mail/i, 'Email'],
  [/sms|text/i, 'SMS'],
  [/whats[-\s_]?app/i, 'WhatsApp'],
  [/social|facebook|instagram|linkedin|twitter|x\b/i, 'Social'],
  [/search|google|sem|ppc|adwords/i, 'Search'],
  [/display|banner|programmatic/i, 'Display'],
  [/digital|online|web/i, 'Digital'],
  [/tele|call|phone|voice/i, 'Telecalling'],
  [/print|news|magazine/i, 'Print'],
  [/event|expo|exhibition|roadshow/i, 'Events'],
  [/referr?al|word[-\s_]?of[-\s_]?mouth/i, 'Referral'],
];

const normalizeChannel = (value) => {
  const raw = str(value, 80);
  if (!raw) return 'Unattributed';
  for (const [pattern, label] of CHANNEL_ALIASES) if (pattern.test(raw)) return label;
  // Unknown but present: title-case it so it still reads correctly in the UI.
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

// Lead status vocabularies differ per platform; ours is the small set the UI renders.
const STATUS_ALIASES = [
  [/convert|won|closed[-\s_]?won|customer|purchas/i, 'Converted'],
  [/engag|replied|responded|clicked|opened|interest/i, 'Engaged'],
  [/qualif/i, 'Qualified'],
  [/contact|reached|attempt/i, 'Contacted'],
  [/lost|closed[-\s_]?lost|reject|unqualif/i, 'Lost'],
  [/new|open|fresh|created/i, 'New'],
];

const normalizeStatus = (value) => {
  const raw = str(value, 60);
  if (!raw) return 'New';
  for (const [pattern, label] of STATUS_ALIASES) if (pattern.test(raw)) return label;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
};

// Indian state names and the many ways they arrive (codes, abbreviations, old spellings).
// Correct state resolution is what makes the state chart and the map agree.
const STATE_ALIASES = {
  WB: 'West Bengal', MH: 'Maharashtra', KA: 'Karnataka', TN: 'Tamil Nadu', DL: 'Delhi',
  TG: 'Telangana', TS: 'Telangana', GJ: 'Gujarat', RJ: 'Rajasthan', UP: 'Uttar Pradesh',
  MP: 'Madhya Pradesh', KL: 'Kerala', PB: 'Punjab', HR: 'Haryana', BR: 'Bihar',
  OR: 'Odisha', OD: 'Odisha', AP: 'Andhra Pradesh', AS: 'Assam', JH: 'Jharkhand',
  CG: 'Chhattisgarh', UK: 'Uttarakhand', HP: 'Himachal Pradesh', GA: 'Goa', JK: 'Jammu and Kashmir',
  PY: 'Puducherry', CH: 'Chandigarh',
  BENGAL: 'West Bengal', 'WEST BENGAL': 'West Bengal', ORISSA: 'Odisha',
  PONDICHERRY: 'Puducherry', 'NCT OF DELHI': 'Delhi', 'NEW DELHI': 'Delhi',
};

const titleCase = (value) => value.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());

const normalizeState = (value) => {
  const raw = str(value, 80);
  if (!raw) return '';
  const key = raw.toUpperCase().replace(/\s+/g, ' ');
  if (STATE_ALIASES[key]) return STATE_ALIASES[key];
  return titleCase(raw);
};

const normalizeCity = (value) => {
  const raw = str(value, 80);
  if (!raw) return '';
  // Common alternate names, so one city is one map point rather than two.
  const key = raw.toUpperCase();
  const alias = { BOMBAY: 'Mumbai', CALCUTTA: 'Kolkata', MADRAS: 'Chennai', BANGALORE: 'Bengaluru', POONA: 'Pune', GURGAON: 'Gurugram' }[key];
  return alias || titleCase(raw);
};

const PINCODE_RE = /^[1-9][0-9]{5}$/;

// Coordinates, in order of trust: what the platform gave us, then our city table. We never
// geocode per request — §20 — and a lead we cannot place is kept with coords null so it
// still counts in totals and tables but is simply absent from the map.
const resolveCoords = (row, city, state) => {
  const lat = num(pick(row, ['latitude', 'lat', 'geo.lat', 'location.lat', 'location.latitude', 'coordinates.lat']));
  const lng = num(pick(row, ['longitude', 'lng', 'lon', 'geo.lng', 'location.lng', 'location.longitude', 'coordinates.lng']));
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    return { latitude: lat, longitude: lng, coordSource: 'platform' };
  }
  const hit = INDIA_CITY_COORDS[`${city}|${state}`] || INDIA_CITY_COORDS[city];
  if (hit) return { latitude: hit[0], longitude: hit[1], coordSource: 'city-table' };
  return { latitude: null, longitude: null, coordSource: null };
};

// One external record -> our internal lead shape.
function mapLead(row = {}) {
  const city = normalizeCity(pick(row, ['city', 'address.city', 'location.city', 'town']));
  const state = normalizeState(pick(row, ['state', 'address.state', 'location.state', 'region', 'province']));
  const pincodeRaw = str(pick(row, ['pincode', 'pinCode', 'postalCode', 'zip', 'zipcode', 'address.pincode', 'address.postalCode']), 10);

  return {
    id: str(pick(row, ['id', '_id', 'leadId', 'contactId', 'uuid']), 80) || null,
    projectId: str(pick(row, ['projectId', 'project.id', 'project_id', 'projectCode', 'project.code']), 80) || null,
    projectName: str(pick(row, ['projectName', 'project.name', 'project_title', 'project']), 200) || null,
    campaign: str(pick(row, ['campaign', 'campaignName', 'campaign.name', 'utm_campaign']), 200) || null,
    campaignId: str(pick(row, ['campaignId', 'campaign.id', 'campaign_id']), 80) || null,
    channel: normalizeChannel(pick(row, ['channel', 'marketingChannel', 'medium', 'utm_medium', 'source_type'])),
    source: str(pick(row, ['source', 'utm_source', 'leadSource']), 120) || null,

    name: str(pick(row, ['name', 'fullName', 'contactName', 'firstName']), 200) || null,
    email: str(pick(row, ['email', 'emailAddress', 'contact.email']), 200).toLowerCase() || null,
    phone: str(pick(row, ['phone', 'mobile', 'phoneNumber', 'contact.phone']), 40) || null,
    address: str(pick(row, ['address', 'address.line1', 'addressLine1', 'street']), 400) || null,

    city,
    state,
    pincode: PINCODE_RE.test(pincodeRaw) ? pincodeRaw : null,
    country: str(pick(row, ['country', 'address.country']), 80) || 'India',
    ...resolveCoords(row, city, state),

    status: normalizeStatus(pick(row, ['status', 'leadStatus', 'stage', 'lifecycleStage'])),
    campaignStatus: str(pick(row, ['campaignStatus', 'campaign.status']), 60) || null,
    // Counters, not booleans: a platform may report either, and totals need numbers.
    reach: num(pick(row, ['reach', 'impressions', 'delivered'])) ?? 0,
    engagement: num(pick(row, ['engagement', 'engagements', 'clicks', 'opens'])) ?? 0,
    conversions: num(pick(row, ['conversions', 'converted', 'conversionCount'])) ?? 0,

    // Money. Kept null rather than 0 when the platform reports nothing, because cost per
    // lead and return on ad spend are only meaningful where spend is actually known —
    // a zero would make CPL read as ₹0 instead of "not reported". Mapped now so the
    // figures appear the moment a platform supplies them, with no further code change.
    spend: num(pick(row, ['spend', 'cost', 'adSpend', 'amountSpent', 'spend_micros', 'costMicros'])),
    revenue: num(pick(row, ['revenue', 'conversionValue', 'conversion_value', 'orderValue', 'attributedRevenue'])),

    createdAt: date(pick(row, ['createdAt', 'created_at', 'createdDate', 'date', 'timestamp'])),
    lastActivityAt: date(pick(row, ['lastActivityAt', 'updatedAt', 'lastSeen', 'lastActivity'])),
  };
}

// The platform may return an array, or wrap it under any of several keys.
const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload;
  for (const key of ['data', 'results', 'items', 'records', 'leads', 'contacts']) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
};

const mapLeads = (payload) => rowsOf(payload).map(mapLead);

// A project list for the selector. Separate from leads so the dropdown does not depend on
// a lead query having returned anything.
const mapProjects = (payload) => rowsOf(payload).map((row) => ({
  id: str(pick(row, ['id', '_id', 'projectId', 'code', 'projectCode']), 80) || null,
  name: str(pick(row, ['name', 'projectName', 'title']), 200) || null,
  code: str(pick(row, ['code', 'projectCode']), 40) || null,
})).filter((p) => p.id && p.name);

module.exports = { mapLead, mapLeads, mapProjects, normalizeChannel, normalizeState, normalizeCity, normalizeStatus, rowsOf };
