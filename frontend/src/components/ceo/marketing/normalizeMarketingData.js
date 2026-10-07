// Normalisation layer between the marketing API and the dashboard UI (§25).
//
// The backend already adapts the external platform's payload, but the UI should not depend
// on even that shape directly: a renamed or missing section upstream should surface as an
// empty chart, never as a crashed page. Every accessor here returns a usable value — an
// array, a number, or null — so no component needs its own optional chaining or fallbacks.
//
//   API response → normalizeMarketingData() → MarketingDashboardModel → KPIs / charts / map / tables

const asArray = (value) => (Array.isArray(value) ? value : []);
const asNumber = (value) => {
  // Guarded before coercion: Number(null) and Number('') are both 0, which would turn
  // "not reported" into a confident zero.
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
// Trends may legitimately be absent (no prior period to compare against), and that is
// different from a trend of zero — so this one keeps null.
const asTrend = (value) => {
  if (value === undefined || value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
const asText = (value, fallback = '') => {
  const str = value === undefined || value === null ? '' : String(value).trim();
  return str || fallback;
};

// Money and derived ratios keep null, because "not reported" and "zero" are different
// facts: a ₹0 cost per lead would be a confident wrong number, where null renders as
// "Not reported".
const asMoney = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeSummary = (summary = {}) => ({
  activities: asNumber(summary.reach) || asNumber(summary.leads),
  leads: asNumber(summary.leads),
  reach: asNumber(summary.reach),
  engagement: asNumber(summary.engagement),
  conversions: asNumber(summary.conversions),
  conversionRate: asNumber(summary.conversionRate),
  cities: asNumber(summary.cities),
  states: asNumber(summary.states),
  spend: asMoney(summary.spend),
  revenue: asMoney(summary.revenue),
  costPerLead: asMoney(summary.costPerLead),
  roas: asMoney(summary.roas),
  deltas: {
    leads: asTrend(summary.deltas?.leads),
    reach: asTrend(summary.deltas?.reach),
    engagement: asTrend(summary.deltas?.engagement),
    conversions: asTrend(summary.deltas?.conversions),
    cities: asTrend(summary.deltas?.cities),
  },
});

// Map points must have real coordinates to be plotted at all; anything else is dropped
// here rather than handed to Leaflet, which would place a null at 0°N 0°E.
const normalizeMapPoints = (points) =>
  asArray(points)
    .filter((p) => Number.isFinite(Number(p?.latitude)) && Number.isFinite(Number(p?.longitude)))
    .map((p) => ({
      location: asText(p.location, 'Unknown'),
      state: asText(p.state),
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      activities: asNumber(p.activities) || asNumber(p.leads),
      leads: asNumber(p.leads),
      engagement: asNumber(p.engagement),
      conversions: asNumber(p.conversions),
      conversionRate: asNumber(p.conversionRate),
      campaigns: asNumber(p.campaigns),
      channelCount: asNumber(p.channelCount),
      spend: asMoney(p.spend),
      channels: p.channels && typeof p.channels === 'object' ? p.channels : {},
    }));

const normalizeChannels = (channels) =>
  asArray(channels).map((c) => ({
    channel: asText(c.channel, 'Unattributed'),
    leads: asNumber(c.leads),
    reach: asNumber(c.reach),
    engagement: asNumber(c.engagement),
    conversions: asNumber(c.conversions),
    share: asNumber(c.share),
    conversionRate: asNumber(c.conversionRate),
  }));

const normalizeStates = (states) =>
  asArray(states).map((s) => ({
    state: asText(s.state, 'Unspecified'),
    leads: asNumber(s.leads),
    engagement: asNumber(s.engagement),
    conversions: asNumber(s.conversions),
    cities: asNumber(s.cities),
    share: asNumber(s.share),
  }));

const normalizeCampaigns = (campaigns) =>
  asArray(campaigns).map((c) => ({
    campaign: asText(c.campaign, 'Unattributed'),
    channel: asText(c.channel, 'Unattributed'),
    channelMix: asNumber(c.channelMix),
    reach: asNumber(c.reach),
    activities: asNumber(c.reach) || asNumber(c.leads),
    engagement: asNumber(c.engagement),
    leads: asNumber(c.leads),
    conversions: asNumber(c.conversions),
    conversionRate: asNumber(c.conversionRate),
    // Null is meaningful: the platform reported no campaign state. Rendering it as
    // "Active" would be inventing a fact.
    status: c.status ? asText(c.status) : null,
  }));

const normalizeActivity = (rows) =>
  asArray(rows).map((r) => ({
    date: r.date || null,
    projectName: asText(r.projectName),
    campaign: asText(r.campaign, 'Unattributed'),
    channel: asText(r.channel, 'Unattributed'),
    city: asText(r.city, 'Unspecified'),
    state: asText(r.state, 'Unspecified'),
    activities: asNumber(r.activities),
    leads: asNumber(r.leads),
    conversions: asNumber(r.conversions),
    conversionRate: asNumber(r.conversionRate),
    status: asText(r.status, 'New'),
  }));

const normalizeTrend = (trend) =>
  asArray(trend).map((d) => ({
    date: d.date || null,
    activities: asNumber(d.activities),
    leads: asNumber(d.leads),
    engagement: asNumber(d.engagement),
    conversions: asNumber(d.conversions),
    conversionRate: asNumber(d.conversionRate),
  }));

const normalizeFacets = (facets = {}) => ({
  channels: asArray(facets.channels),
  states: asArray(facets.states),
  cities: asArray(facets.cities),
  campaigns: asArray(facets.campaigns),
  statuses: asArray(facets.statuses),
});

// The single model every part of the dashboard reads.
export function normalizeMarketingData(payload) {
  const raw = payload || {};
  const summary = normalizeSummary(raw.summary);
  const map = {
    points: normalizeMapPoints(raw.map?.points),
    unplaced: asNumber(raw.map?.unplaced),
  };
  return {
    summary,
    map,
    channels: normalizeChannels(raw.channels),
    states: normalizeStates(raw.states),
    campaigns: normalizeCampaigns(raw.campaigns),
    activity: normalizeActivity(raw.activity),
    trend: normalizeTrend(raw.trend),
    facets: normalizeFacets(raw.facets),
    contacts: {
      items: asArray(raw.contacts?.items),
      pagination: raw.contacts?.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 },
    },
    window: raw.window || null,
    // One flag the whole page can branch on, rather than each section testing differently.
    isEmpty: summary.leads === 0 && map.points.length === 0,
  };
}

export default normalizeMarketingData;
