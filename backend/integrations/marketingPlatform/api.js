'use strict';
// The named operations we use from the external marketing platform.
//
// Endpoint paths are environment-overridable because the brief is explicit that we must not
// assume the platform's shape: a deployment can point these at whatever its vendor exposes
// without a code change. Everything returns our internal shape via the mapper, so no raw
// external field name escapes this directory.
const client = require('./client');
const mapper = require('./mapper');

const PATHS = {
  leads: process.env.MARKETING_PLATFORM_LEADS_PATH || 'leads',
  campaigns: process.env.MARKETING_PLATFORM_CAMPAIGNS_PATH || 'campaigns',
};

// Platforms paginate differently; we page through until exhausted so our own aggregation
// sees the whole filtered set. Capped so a misconfigured upstream cannot spin forever.
const PAGE_SIZE = Number(process.env.MARKETING_PLATFORM_PAGE_SIZE || 500);
const MAX_PAGES = Number(process.env.MARKETING_PLATFORM_MAX_PAGES || 40);

// Filters are pushed upstream so the platform does the narrowing, not us (§19).
const leadQuery = (filters = {}) => ({
  projectId: filters.projectId,
  project_id: filters.projectId,
  from: filters.startDate,
  to: filters.endDate,
  start_date: filters.startDate,
  end_date: filters.endDate,
  channel: filters.channel,
  state: filters.state,
  city: filters.city,
  campaign: filters.campaign,
  status: filters.status,
});

async function fetchLeads(filters = {}) {
  const out = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const payload = await client.request(PATHS.leads, { ...leadQuery(filters), page, limit: PAGE_SIZE, per_page: PAGE_SIZE });
    const batch = mapper.mapLeads(payload);
    out.push(...batch);
    // Stop on a short page: the common signal that there is nothing further, and it works
    // whether or not the platform reports a total.
    if (batch.length < PAGE_SIZE) break;
  }
  return out;
}

// No fetchProjects: the project list comes from our own project database (the master
// source), not from the marketing platform, which supplies activity only.
module.exports = { fetchLeads, PATHS };
