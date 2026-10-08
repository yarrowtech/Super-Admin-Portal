'use strict';
// Marketing analytics aggregation.
//
// Everything the dashboard draws is computed here, server-side, from normalised leads.
// The browser receives summaries — KPIs, per-location points, per-state and per-channel
// rollups, campaign rows — and only receives individual contacts when it explicitly asks
// for that page of the table (§19). A CEO opening this page must never pull a million
// records over the wire.
const mongoose = require('mongoose');
const api = require('../integrations/marketingPlatform/api');
const client = require('../integrations/marketingPlatform/client');
const { getCache, setCache } = require('./cache.service');

const CACHE_TTL_SECONDS = Number(process.env.MARKETING_ANALYTICS_CACHE_TTL || 120);

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const round1 = (n) => Math.round(n * 10) / 10;

// Only these keys may vary a cache entry; anything else would make the key unbounded.
const FILTER_KEYS = ['projectId', 'startDate', 'endDate', 'channel', 'state', 'city', 'campaign', 'status'];

const cacheKeyFor = (filters) =>
  `ceo:marketing-analytics:${FILTER_KEYS.map((k) => filters[k] || '').join('|')}`;

// Date-window default: the trailing 30 days, so the page is useful before anyone touches
// the range picker.
function resolveWindow(filters = {}) {
  const end = filters.endDate ? new Date(filters.endDate) : new Date();
  const start = filters.startDate
    ? new Date(filters.startDate)
    : new Date(new Date(end).setDate(end.getDate() - 30));
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// Filters applied to the normalised set. The platform is asked to filter too, but it may
// ignore parameters it does not support, so we enforce them here as well — otherwise a
// partially-honoured upstream filter would silently inflate every number on the page.
function applyFilters(leads, filters = {}) {
  const { start, end } = resolveWindow(filters);
  const eq = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  return leads.filter((lead) => {
    if (lead.createdAt) {
      const at = new Date(lead.createdAt);
      if (at < start || at > end) return false;
    }
    // A lead may carry our id, our project code, or the platform's own project name, so
    // any of those matching counts as this project's lead.
    if (filters.projectId) {
      const wanted = [filters.projectId, filters.projectCode, filters.projectName].filter(Boolean);
      const carried = filters.strictProject && lead.projectId ? [lead.projectId] : [lead.projectId, lead.projectName].filter(Boolean);
      if (!wanted.some((w) => carried.some((c) => eq(c, w)))) return false;
    }
    if (filters.channel && !eq(lead.channel, filters.channel)) return false;
    if (filters.state && !eq(lead.state, filters.state)) return false;
    if (filters.city && !eq(lead.city, filters.city)) return false;
    if (filters.campaign && !eq(lead.campaign, filters.campaign)) return false;
    if (filters.status && !eq(lead.status, filters.status)) return false;
    return true;
  });
}

const ENGAGED_STATUSES = new Set(['Engaged', 'Qualified', 'Converted']);
const isEngaged = (lead) => ENGAGED_STATUSES.has(lead.status) || lead.engagement > 0;
const isConverted = (lead) => lead.status === 'Converted' || lead.conversions > 0;

// ── Summary (KPI cards) ─────────────────────────────────────────────────────
// Deltas compare the selected window against the window of equal length immediately
// before it, which is what makes "↑ 14.8%" a real statement rather than decoration.
// Sums a money field only across records that actually report it, and returns null when
// none do. Summing with a 0 default would turn "no platform reports spend" into "spend is
// zero", which then makes CPL look like ₹0 — a confident wrong number.
const sumMoney = (set, field) => {
  const reported = set.filter((l) => typeof l[field] === 'number' && Number.isFinite(l[field]));
  if (!reported.length) return null;
  return Math.round(reported.reduce((n, l) => n + l[field], 0) * 100) / 100;
};

function buildSummary(current, previous) {
  const metrics = (set) => ({
    leads: set.length,
    reach: set.reduce((n, l) => n + (l.reach || 0), 0),
    engagement: set.reduce((n, l) => n + (l.engagement || 0), 0) || set.filter(isEngaged).length,
    conversions: set.reduce((n, l) => n + (l.conversions || 0), 0) || set.filter(isConverted).length,
    cities: new Set(set.map((l) => l.city).filter(Boolean)).size,
    states: new Set(set.map((l) => l.state).filter(Boolean)).size,
    spend: sumMoney(set, 'spend'),
    revenue: sumMoney(set, 'revenue'),
  });
  const now = metrics(current);
  const before = metrics(previous);
  const delta = (a, b) => (b > 0 ? round1(((a - b) / b) * 100) : null);
  return {
    ...now,
    conversionRate: pct(now.conversions, now.leads),
    // Derived only where the inputs exist; null means "cannot be computed", which the UI
    // renders as "Not reported" rather than a zero.
    costPerLead: now.spend !== null && now.leads > 0 ? Math.round((now.spend / now.leads) * 100) / 100 : null,
    roas: now.spend !== null && now.revenue !== null && now.spend > 0
      ? Math.round((now.revenue / now.spend) * 100) / 100
      : null,
    deltas: {
      leads: delta(now.leads, before.leads),
      reach: delta(now.reach, before.reach),
      engagement: delta(now.engagement, before.engagement),
      conversions: delta(now.conversions, before.conversions),
      // Cities is a count, so its delta reads better as an absolute change.
      cities: before.cities > 0 ? now.cities - before.cities : null,
    },
  };
}

// ── Map points ──────────────────────────────────────────────────────────────
// Aggregated per city, exactly the shape §19 asks for: one point per location carrying
// its totals, never the raw contacts behind them. Records we could not place are counted
// separately so the page can be honest about what the map omits.
function buildMap(leads) {
  const byCity = new Map();
  let unplaced = 0;
  for (const lead of leads) {
    if (lead.latitude === null || lead.longitude === null) { unplaced += 1; continue; }
    const key = `${lead.city}|${lead.state}`;
    const entry = byCity.get(key) || {
      location: lead.city || 'Unknown', state: lead.state || '',
      latitude: lead.latitude, longitude: lead.longitude,
      // `activities` is the marketing volume; `leads` the people it produced. The map
      // sizes bubbles by activity, which is what "where are we marketing" asks.
      activities: 0, leads: 0, engagement: 0, conversions: 0,
      channels: {}, campaignSet: new Set(), _leads: [],
    };
    entry.activities += (lead.reach || 0) || 1;
    entry.leads += 1;
    if (isEngaged(lead)) entry.engagement += 1;
    if (isConverted(lead)) entry.conversions += 1;
    entry.channels[lead.channel] = (entry.channels[lead.channel] || 0) + 1;
    if (lead.campaign) entry.campaignSet.add(lead.campaign);
    entry._leads.push(lead);
    byCity.set(key, entry);
  }
  // Counts and spend resolved per location for the click-through panel (§5/§6).
  const points = [...byCity.values()]
    .map(({ campaignSet, _leads, ...p }) => ({
      ...p,
      campaigns: campaignSet.size,
      channelCount: Object.keys(p.channels).length,
      conversionRate: pct(p.conversions, p.leads),
      spend: sumMoney(_leads, 'spend'),
    }))
    .sort((a, b) => b.activities - a.activities);
  return { points, unplaced, totalPlaced: points.reduce((n, p) => n + p.leads, 0) };
}

// ── Channels ────────────────────────────────────────────────────────────────
function buildChannels(leads) {
  const byChannel = new Map();
  for (const lead of leads) {
    const entry = byChannel.get(lead.channel) || { channel: lead.channel, leads: 0, engagement: 0, conversions: 0, reach: 0 };
    entry.leads += 1;
    entry.reach += lead.reach || 0;
    if (isEngaged(lead)) entry.engagement += 1;
    if (isConverted(lead)) entry.conversions += 1;
    byChannel.set(lead.channel, entry);
  }
  const total = leads.length;
  return [...byChannel.values()]
    .map((c) => ({ ...c, share: pct(c.leads, total), conversionRate: pct(c.conversions, c.leads) }))
    .sort((a, b) => b.leads - a.leads);
}

// ── States ──────────────────────────────────────────────────────────────────
function buildStates(leads) {
  const byState = new Map();
  for (const lead of leads) {
    const name = lead.state || 'Unspecified';
    const entry = byState.get(name) || { state: name, leads: 0, engagement: 0, conversions: 0, cities: new Set() };
    entry.leads += 1;
    if (isEngaged(lead)) entry.engagement += 1;
    if (isConverted(lead)) entry.conversions += 1;
    if (lead.city) entry.cities.add(lead.city);
    byState.set(name, entry);
  }
  const total = leads.length;
  return [...byState.values()]
    .map((s) => ({ state: s.state, leads: s.leads, engagement: s.engagement, conversions: s.conversions, cities: s.cities.size, share: pct(s.leads, total) }))
    .sort((a, b) => b.leads - a.leads);
}

// ── Campaigns ───────────────────────────────────────────────────────────────
// `status` is the campaign's own state from the platform where it reports one. Several
// leads under one campaign can disagree (a campaign paused mid-flight), so the most recent
// lead's value wins — that is the campaign's current state, not its historical one.
function buildCampaigns(leads) {
  const byCampaign = new Map();
  for (const lead of leads) {
    const name = lead.campaign || 'Unattributed';
    const entry = byCampaign.get(name) || {
      campaign: name, channel: lead.channel, reach: 0, engagement: 0, leads: 0, conversions: 0,
      status: null, statusAt: null, channels: {},
    };
    entry.leads += 1;
    entry.reach += lead.reach || 0;
    if (isEngaged(lead)) entry.engagement += 1;
    if (isConverted(lead)) entry.conversions += 1;
    // A campaign can run on more than one channel; keep the mix and report the dominant.
    entry.channels[lead.channel] = (entry.channels[lead.channel] || 0) + 1;
    if (lead.campaignStatus && (!entry.statusAt || String(lead.createdAt || '') > entry.statusAt)) {
      entry.status = lead.campaignStatus;
      entry.statusAt = String(lead.createdAt || '');
    }
    byCampaign.set(name, entry);
  }
  return [...byCampaign.values()]
    .map(({ statusAt, channels, ...c }) => ({
      ...c,
      // The channel that carried most of this campaign's volume.
      channel: Object.entries(channels).sort((a, b) => b[1] - a[1])[0]?.[0] || c.channel,
      channelMix: Object.keys(channels).length,
      conversionRate: pct(c.conversions, c.leads),
      // Null means the platform reported no campaign state — distinct from "Active".
      status: c.status || null,
    }))
    .sort((a, b) => b.leads - a.leads);
}

// ── Activity rollup (§18) ───────────────────────────────────────────────────
// A day-by-location-by-channel summary: the detailed table the dashboard shows instead of
// raw contacts, so a CEO can read where and how activity happened without any record
// identifying a person. Rows are capped because this is a display aid, not an export.
function buildActivity(leads, limit = 500) {
  const byKey = new Map();
  for (const lead of leads) {
    const date = (lead.createdAt || '').slice(0, 10);
    const key = `${date}|${lead.city}|${lead.state}|${lead.channel}|${lead.campaign || ''}`;
    const entry = byKey.get(key) || {
      date: date || null,
      projectName: lead.projectName || null,
      campaign: lead.campaign || 'Unattributed',
      channel: lead.channel,
      city: lead.city || 'Unspecified',
      state: lead.state || 'Unspecified',
      activities: 0, leads: 0, conversions: 0, statuses: {},
    };
    entry.activities += (lead.reach || 0) || 1;
    entry.leads += 1;
    if (isConverted(lead)) entry.conversions += 1;
    entry.statuses[lead.status] = (entry.statuses[lead.status] || 0) + 1;
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .map(({ statuses, ...row }) => ({
      ...row,
      // The predominant lead state in this group, which is what a summary row can honestly claim.
      status: Object.entries(statuses).sort((a, b) => b[1] - a[1])[0]?.[0] || 'New',
      conversionRate: pct(row.conversions, row.leads),
    }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || b.leads - a.leads)
    .slice(0, limit);
}

// ── Trend ───────────────────────────────────────────────────────────────────
function buildTrend(leads) {
  const byDay = new Map();
  for (const lead of leads) {
    if (!lead.createdAt) continue;
    const day = lead.createdAt.slice(0, 10);
    const entry = byDay.get(day) || { date: day, activities: 0, leads: 0, engagement: 0, conversions: 0 };
    // Reach where the platform reports it, else the lead itself counts as one touch.
    entry.activities += (lead.reach || 0) || 1;
    entry.leads += 1;
    if (isEngaged(lead)) entry.engagement += 1;
    if (isConverted(lead)) entry.conversions += 1;
    byDay.set(day, entry);
  }
  return [...byDay.values()]
    .map((d) => ({ ...d, conversionRate: pct(d.conversions, d.leads) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ── PII ─────────────────────────────────────────────────────────────────────
// §15: summary tables get a masked address. The full value is only returned by the
// contacts endpoint when the caller asks for one record's detail.
const maskEmail = (email) => {
  if (!email) return null;
  const [user, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = user.slice(0, Math.min(4, Math.max(1, user.length - 2)));
  return `${head}${'*'.repeat(4)}@${domain}`;
};
const maskPhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  return digits.length < 4 ? '***' : `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

const toListRow = (lead) => ({
  id: lead.id,
  name: lead.name,
  email: maskEmail(lead.email),
  phone: maskPhone(lead.phone),
  city: lead.city,
  state: lead.state,
  channel: lead.channel,
  campaign: lead.campaign,
  status: lead.status,
  createdAt: lead.createdAt,
});

// ── Entry point ─────────────────────────────────────────────────────────────
// One upstream fetch produces every section, so the page costs a single external round
// trip rather than six (§18's "do not unnecessarily duplicate API calls").
async function getAnalytics(filters = {}, { includeContacts = true, page = 1, limit = 25, search = '' } = {}) {
  // Our project id is validated against the project database first — it is the master
  // source — and translated into whatever identifier the marketing platform keys on.
  const project = await resolveProjectFilter(filters.projectId);
  const key = cacheKeyFor(filters);
  let leads = await getCache(key);
  if (!leads) {
    const { start, end } = resolveWindow(filters);
    // Pull a window wide enough to also cover the comparison period for the deltas.
    const span = end.getTime() - start.getTime();
    const previousStart = new Date(start.getTime() - span);
    leads = await api.fetchLeads({
      ...filters,
      // The platform may know this project by either identifier; send both and let it
      // match on the one it understands.
      projectId: project.projectId || filters.projectId,
      projectCode: project.projectCode || undefined,
      startDate: previousStart.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
    await setCache(key, leads, CACHE_TTL_SECONDS);
  }

  const { start, end } = resolveWindow(filters);
  const span = end.getTime() - start.getTime();
  // Carry the resolved code and name so a lead keyed either way still matches.
  const matchFilters = { ...filters, projectCode: project.projectCode, projectName: project.projectName };
  const current = applyFilters(leads, matchFilters);
  const previous = applyFilters(leads, {
    ...matchFilters,
    startDate: new Date(start.getTime() - span).toISOString(),
    endDate: new Date(start.getTime() - 1).toISOString(),
  });

  const payload = {
    summary: buildSummary(current, previous),
    map: buildMap(current),
    channels: buildChannels(current),
    states: buildStates(current),
    campaigns: buildCampaigns(current),
    activity: buildActivity(current),
    trend: buildTrend(current),
    // Distinct values for the filter bar, derived from the data actually present.
    facets: {
      channels: [...new Set(current.map((l) => l.channel))].filter(Boolean).sort(),
      states: [...new Set(current.map((l) => l.state))].filter(Boolean).sort(),
      cities: [...new Set(current.map((l) => l.city))].filter(Boolean).sort(),
      campaigns: [...new Set(current.map((l) => l.campaign))].filter(Boolean).sort(),
      statuses: [...new Set(current.map((l) => l.status))].filter(Boolean).sort(),
    },
    window: { startDate: start.toISOString(), endDate: end.toISOString() },
  };

  if (includeContacts) {
    const term = String(search || '').trim().toLowerCase();
    const matched = term
      ? current.filter((l) => [l.name, l.email, l.city, l.state, l.campaign].some((v) => String(v || '').toLowerCase().includes(term)))
      : current;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
    const sorted = matched.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    payload.contacts = {
      items: sorted.slice((safePage - 1) * safeLimit, safePage * safeLimit).map(toListRow),
      pagination: {
        page: safePage, limit: safeLimit, total: matched.length,
        totalPages: Math.max(1, Math.ceil(matched.length / safeLimit)),
      },
    };
  }
  return payload;
}

// A single contact's full detail, for the drawer. This is the only path that returns
// unmasked PII, and it is reached only when an authorised user opens one record.
async function getContact(contactId, filters = {}) {
  const key = cacheKeyFor(filters);
  const leads = (await getCache(key)) || (await api.fetchLeads(filters));
  const lead = leads.find((l) => String(l.id) === String(contactId));
  return lead || null;
}

// ── Projects ────────────────────────────────────────────────────────────────
// The project database is the master source: projects exist here whether or not any
// marketing has happened for them, so the selector must be populated from our own
// collection rather than from the marketing platform. The platform is the source of
// marketing *activity* only.
//
// Each option carries both identifiers. `id` is what the UI binds to, `code` is what the
// platform is queried with where it keys projects by code — see resolveProjectFilter.
async function getProjects({ search = '', includeInactive = false } = {}) {
  const Project = require('../models/common/Project');
  const filter = {};
  // Closed work is hidden by default: a CEO picking a project to review marketing for is
  // almost always looking at live delivery, and the full list is a flag away.
  if (!includeInactive) filter.status = { $nin: ['completed', 'cancelled'] };
  const term = String(search || '').trim().slice(0, 100);
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { projectCode: rx }];
  }
  const rows = await Project.find(filter)
    .select('name projectCode status')
    .sort({ name: 1 })
    .limit(500)
    .lean();
  return rows.map((p) => ({
    id: String(p._id),
    name: p.name,
    code: p.projectCode || null,
    status: p.status || null,
  }));
}

// The selector sends our project id; the marketing platform may know the project by its
// code instead. Resolving here means the UI never has to care which, and a project with
// no code still filters correctly by id.
async function resolveProjectFilter(projectId) {
  if (!projectId) return {};
  const Project = require('../models/common/Project');
  if (!mongoose.isValidObjectId(projectId)) {
    // Already a code (or an external id): pass it through untouched.
    return { projectId, projectCode: projectId };
  }
  const project = await Project.findById(projectId).select('projectCode name').lean();
  if (!project) {
    // A project that no longer exists must not silently widen to "all projects".
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }
  return { projectId: String(project._id), projectCode: project.projectCode || null, projectName: project.name };
}

module.exports = {
  getAnalytics, getContact, getProjects, resolveProjectFilter,
  isConfigured: client.isConfigured, describe: client.describe,
  // exported for tests
  applyFilters, buildSummary, buildMap, buildChannels, buildStates, buildCampaigns, buildActivity, buildTrend, maskEmail, maskPhone,
};
