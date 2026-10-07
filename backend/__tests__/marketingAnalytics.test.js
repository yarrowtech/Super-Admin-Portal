const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

// The marketing module reads an external platform we do not control, so these tests pin
// the two things most likely to break silently: the adapter (upstream renames a field or
// spells a channel differently) and the "not configured" path (a deployment without
// credentials must say so, not crash or invent numbers).

const mapper = require('../integrations/marketingPlatform/mapper');
const service = require('../services/marketingAnalytics.service');
const controller = require('../controllers/ceo/marketingAnalytics.controller');

const makeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});

// ── Adapter ─────────────────────────────────────────────────────────────────

test('the mapper reads a field under any of its plausible upstream names', async () => {
  // Three records carrying the same meaning under different key spellings.
  const camel = mapper.mapLead({ projectId: 'P1', city: 'Mumbai', state: 'MH', emailAddress: 'A@B.COM', createdAt: '2026-10-01' });
  const nested = mapper.mapLead({ project: { id: 'P1' }, address: { city: 'Mumbai', state: 'Maharashtra' }, contact: { email: 'a@b.com' }, created_at: '2026-10-01' });
  const snake = mapper.mapLead({ project_id: 'P1', city: 'BOMBAY', state: 'maharashtra', email: 'a@b.com', createdDate: '2026-10-01' });

  for (const lead of [camel, nested, snake]) {
    assert.equal(lead.projectId, 'P1');
    assert.equal(lead.city, 'Mumbai', 'alternate city names collapse to one');
    assert.equal(lead.state, 'Maharashtra', 'state codes and casing normalise');
    assert.equal(lead.email, 'a@b.com', 'email is lowercased');
    assert.ok(lead.createdAt.startsWith('2026-10-01'));
  }
});

test('channels and statuses collapse to a stable vocabulary', async () => {
  const channelOf = (v) => mapper.mapLead({ channel: v }).channel;
  assert.equal(channelOf('Email Marketing'), 'Email');
  assert.equal(channelOf('e-mail'), 'Email');
  assert.equal(channelOf('facebook'), 'Social');
  assert.equal(channelOf('Google Ads'), 'Search');
  assert.equal(channelOf(''), 'Unattributed', 'a missing channel is labelled, not dropped');

  const statusOf = (v) => mapper.mapLead({ status: v }).status;
  assert.equal(statusOf('closed-won'), 'Converted');
  assert.equal(statusOf('REPLIED'), 'Engaged');
  assert.equal(statusOf(''), 'New');
});

test('platform coordinates win over the city table, and an unplaceable lead keeps null coords', async () => {
  const given = mapper.mapLead({ city: 'Mumbai', state: 'MH', latitude: 1.5, longitude: 2.5 });
  assert.equal(given.latitude, 1.5, 'we do not re-geocode what we were given');
  assert.equal(given.coordSource, 'platform');

  const derived = mapper.mapLead({ city: 'Kolkata', state: 'West Bengal' });
  assert.equal(derived.coordSource, 'city-table');
  assert.ok(Math.abs(derived.latitude - 22.5726) < 0.01);

  const unknown = mapper.mapLead({ city: 'Nowhere-upon-Sea', state: 'Atlantis' });
  assert.equal(unknown.latitude, null, 'an unknown city is not guessed at');
  assert.equal(unknown.coordSource, null);
});

test('an invalid pincode is rejected rather than stored', async () => {
  assert.equal(mapper.mapLead({ pincode: '700001' }).pincode, '700001');
  assert.equal(mapper.mapLead({ pincode: '12' }).pincode, null);
  assert.equal(mapper.mapLead({ pincode: '000001' }).pincode, null, 'Indian pincodes do not start with 0');
});

test('the mapper finds the rows whatever envelope they arrive in', async () => {
  const row = { city: 'Pune' };
  for (const payload of [[row], { data: [row] }, { results: [row] }, { items: [row] }, { data: { items: [row] } }]) {
    assert.equal(mapper.mapLeads(payload).length, 1, `envelope ${JSON.stringify(Object.keys(payload))} handled`);
  }
  assert.deepEqual(mapper.mapLeads({ unexpected: true }), [], 'an unrecognised payload yields nothing, not a crash');
});

// ── Aggregation ─────────────────────────────────────────────────────────────

const lead = (over = {}) => mapper.mapLead({
  id: Math.random().toString(36).slice(2), projectId: 'P1', city: 'Mumbai', state: 'Maharashtra',
  channel: 'Email', status: 'New', createdAt: '2026-10-05', ...over,
});

test('map points are aggregated per city and never carry the underlying contacts', async () => {
  const leads = [
    lead(), lead(), lead({ status: 'Converted' }),
    lead({ city: 'Kolkata', state: 'West Bengal' }),
    lead({ city: 'Nowhere-upon-Sea', state: 'Atlantis' }),
  ];
  const map = service.buildMap(leads);
  const mumbai = map.points.find((p) => p.location === 'Mumbai');
  assert.equal(mumbai.leads, 3);
  assert.equal(mumbai.conversions, 1);
  assert.equal(map.points.length, 2, 'one point per placeable city');
  assert.equal(map.unplaced, 1, 'the unplaceable lead is counted, not hidden');
  // The point carries totals only — no names, emails or phones reach the map payload.
  for (const key of ['name', 'email', 'phone', 'contacts']) {
    assert.ok(!(key in mumbai), `map point must not expose ${key}`);
  }
});

test('channel and state rollups share out to 100% of the leads', async () => {
  const leads = [lead(), lead(), lead({ channel: 'Social' }), lead({ channel: 'Social', city: 'Delhi', state: 'Delhi' })];
  const channels = service.buildChannels(leads);
  assert.equal(channels.reduce((n, c) => n + c.leads, 0), 4);
  assert.equal(channels[0].channel, 'Email');
  assert.equal(channels[0].share + channels[1].share, 100);

  const states = service.buildStates(leads);
  assert.equal(states.reduce((n, s) => n + s.leads, 0), 4);
  assert.equal(states.find((s) => s.state === 'Maharashtra').leads, 3);
});

test('KPI deltas compare against the preceding window of equal length', async () => {
  const now = [lead(), lead(), lead()];
  const before = [lead()];
  const summary = service.buildSummary(now, before);
  assert.equal(summary.leads, 3);
  assert.equal(summary.deltas.leads, 200, '1 -> 3 is +200%');
  // With no prior data a percentage would be meaningless, so it is null, not Infinity.
  assert.equal(service.buildSummary(now, []).deltas.leads, null);
});

test('filters are re-applied server-side even if the platform ignored them', async () => {
  const leads = [
    lead({ channel: 'Email', state: 'Maharashtra' }),
    lead({ channel: 'Social', state: 'Maharashtra' }),
    lead({ channel: 'Email', city: 'Kolkata', state: 'West Bengal' }),
  ];
  const window = { startDate: '2026-10-01', endDate: '2026-10-31' };
  assert.equal(service.applyFilters(leads, { ...window, channel: 'Email' }).length, 2);
  assert.equal(service.applyFilters(leads, { ...window, state: 'West Bengal' }).length, 1);
  assert.equal(service.applyFilters(leads, { ...window, channel: 'email' }).length, 2, 'matching is case-insensitive');
  // Outside the window, nothing survives.
  assert.equal(service.applyFilters(leads, { startDate: '2025-01-01', endDate: '2025-01-31' }).length, 0);
});

test('the activity rollup groups by day, location and channel and exposes no PII', async () => {
  const leads = [
    lead({ name: 'Asha', email: 'asha@example.com', phone: '9876543210', createdAt: '2026-10-05' }),
    lead({ name: 'Bala', email: 'bala@example.com', phone: '9876543211', createdAt: '2026-10-05' }),
    lead({ createdAt: '2026-10-06', channel: 'Social' }),
  ];
  const rows = service.buildActivity(leads);
  // Two leads on the same day/city/channel/campaign collapse into one row.
  assert.equal(rows.length, 2);
  const grouped = rows.find((r) => r.date === '2026-10-05');
  assert.equal(grouped.leads, 2);
  assert.equal(grouped.city, 'Mumbai');
  assert.equal(grouped.channel, 'Email');
  // §18/§23: a summary row must not carry anything identifying a person.
  const serialised = JSON.stringify(rows);
  for (const pii of ['Asha', 'Bala', 'asha@example.com', '9876543210']) {
    assert.ok(!serialised.includes(pii), `activity rollup must not contain ${pii}`);
  }
  for (const key of ['name', 'email', 'phone', 'address', 'pincode']) {
    assert.ok(!(key in grouped), `activity row must not have a ${key} field`);
  }
});

test('campaign rows carry the latest reported status and the dominant channel', async () => {
  const rows = service.buildCampaigns([
    lead({ campaign: 'Diwali Push', channel: 'Email', campaignStatus: 'Active', createdAt: '2026-10-01' }),
    lead({ campaign: 'Diwali Push', channel: 'Email', createdAt: '2026-10-02' }),
    lead({ campaign: 'Diwali Push', channel: 'Social', campaignStatus: 'Paused', createdAt: '2026-10-05' }),
  ]);
  const campaign = rows.find((r) => r.campaign === 'Diwali Push');
  assert.equal(campaign.leads, 3);
  assert.equal(campaign.status, 'Paused', 'the most recent reported state wins');
  assert.equal(campaign.channel, 'Email', 'the channel carrying most volume');
  assert.equal(campaign.channelMix, 2, 'multi-channel campaigns are flagged as such');
});

test('a campaign with no reported status is null, not invented as Active', async () => {
  const rows = service.buildCampaigns([lead({ campaign: 'Quiet', channel: 'Email' })]);
  assert.equal(rows[0].status, null);
});

test('the trend series carries activities, leads and conversions per day in date order', async () => {
  const series = service.buildTrend([
    lead({ createdAt: '2026-10-06', status: 'Converted' }),
    lead({ createdAt: '2026-10-05' }),
    lead({ createdAt: '2026-10-05' }),
  ]);
  assert.deepEqual(series.map((d) => d.date), ['2026-10-05', '2026-10-06'], 'ascending, for a time axis');
  assert.equal(series[0].leads, 2);
  assert.equal(series[1].conversions, 1);
  assert.equal(series[1].conversionRate, 100);
  // A lead with no reported reach still counts as one activity, so the series is never flat-zero.
  assert.ok(series[0].activities >= 2);
});

// ── Money: spend, CPL, ROAS ─────────────────────────────────────────────────

test('spend, CPL and ROAS stay null when the platform reports no money', async () => {
  // The current situation: no platform field for cost or revenue. These must read as
  // "not reported", never as zero — a ₹0 CPL would be a confident wrong number.
  const summary = service.buildSummary([lead(), lead()], []);
  assert.equal(summary.spend, null);
  assert.equal(summary.revenue, null);
  assert.equal(summary.costPerLead, null, 'CPL is not computable without spend');
  assert.equal(summary.roas, null, 'ROAS is not computable without spend and revenue');
});

test('spend, CPL and ROAS are computed once the platform reports money', async () => {
  const leads = [
    mapper.mapLead({ city: 'Mumbai', state: 'MH', createdAt: '2026-10-05', spend: 1000, revenue: 4000 }),
    mapper.mapLead({ city: 'Mumbai', state: 'MH', createdAt: '2026-10-05', spend: 1000, revenue: 2000 }),
  ];
  const summary = service.buildSummary(leads, []);
  assert.equal(summary.spend, 2000);
  assert.equal(summary.revenue, 6000);
  assert.equal(summary.costPerLead, 1000, '2000 spend over 2 leads');
  assert.equal(summary.roas, 3, '6000 revenue on 2000 spend');
});

test('a partially reporting platform totals only what it reported', async () => {
  // One record with spend, one without: the total is the reported subset, not a sum that
  // silently treats the missing one as zero-cost.
  const leads = [
    mapper.mapLead({ city: 'Pune', createdAt: '2026-10-05', spend: 500 }),
    mapper.mapLead({ city: 'Pune', createdAt: '2026-10-05' }),
  ];
  const summary = service.buildSummary(leads, []);
  assert.equal(summary.spend, 500);
  assert.equal(summary.revenue, null, 'nothing reported revenue');
  assert.equal(summary.roas, null);
});

test('map points carry per-location campaign, channel and spend counts for the detail panel', async () => {
  const leads = [
    mapper.mapLead({ city: 'Mumbai', state: 'MH', channel: 'Email', campaign: 'A', createdAt: '2026-10-05', spend: 300 }),
    mapper.mapLead({ city: 'Mumbai', state: 'MH', channel: 'Social', campaign: 'B', createdAt: '2026-10-05', spend: 200 }),
    mapper.mapLead({ city: 'Mumbai', state: 'MH', channel: 'Email', campaign: 'A', createdAt: '2026-10-05', status: 'Converted' }),
  ];
  const point = service.buildMap(leads).points.find((p) => p.location === 'Mumbai');
  assert.equal(point.leads, 3);
  assert.equal(point.campaigns, 2, 'distinct campaigns at this location');
  assert.equal(point.channelCount, 2, 'distinct channels at this location');
  assert.equal(point.spend, 500, 'only the records that reported spend');
  assert.ok(point.activities >= 3, 'activity volume, not just lead count');
  assert.equal(point.conversionRate, 33.3);
  // Still no PII on a map point (§23).
  for (const key of ['name', 'email', 'phone', '_leads', 'campaignSet']) {
    assert.ok(!(key in point), `map point must not expose ${key}`);
  }
});

// ── PII ─────────────────────────────────────────────────────────────────────

test('summary rows mask email and phone', async () => {
  assert.equal(service.maskEmail('john.doe@gmail.com'), 'john****@gmail.com');
  assert.equal(service.maskPhone('+91 98765 43210'), '********3210');
  assert.equal(service.maskEmail(null), null);
  // The mask must not leak the local part of a short address.
  assert.ok(!service.maskEmail('ab@x.com').startsWith('ab@'));
});

// ── Projects come from our own database ─────────────────────────────────────
// The project database is the master source; the marketing platform supplies activity
// only. These tests exist because the selector previously called the platform, which left
// it empty — and therefore the whole page unusable — whenever no platform was configured.

test('the project list is served from our database even with no platform configured', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
  try {
    const Project = require('../models/common/Project');
    const manager = new mongoose.Types.ObjectId();
    await Project.create([
      { name: 'Project Alpha', projectCode: 'ALPHA', description: 'x', startDate: new Date(), status: 'in-progress', projectManager: manager },
      { name: 'Project Beta', projectCode: 'BETA', description: 'x', startDate: new Date(), status: 'planning', projectManager: manager },
      { name: 'Old Project', projectCode: 'OLD', description: 'x', startDate: new Date(), status: 'completed', projectManager: manager },
    ]);

    // The platform is deliberately unconfigured, which is exactly the case that used to
    // produce an empty dropdown.
    assert.equal(service.isConfigured(), false);

    const projects = await service.getProjects();
    assert.equal(projects.length, 2, 'completed work is hidden by default');
    assert.deepEqual(projects.map((p) => p.name), ['Project Alpha', 'Project Beta'], 'sorted by name');
    assert.equal(projects[0].code, 'ALPHA');
    assert.ok(mongoose.isValidObjectId(projects[0].id), 'id is our own project id');

    // Closed work is available on request.
    assert.equal((await service.getProjects({ includeInactive: true })).length, 3);
    // And the list is searchable by name or code.
    assert.deepEqual((await service.getProjects({ search: 'beta' })).map((p) => p.code), ['BETA']);
    assert.deepEqual((await service.getProjects({ search: 'ALPHA' })).map((p) => p.code), ['ALPHA']);
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});

test('a selected project id resolves to the code the platform is queried with', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
  try {
    const Project = require('../models/common/Project');
    const project = await Project.create({
      name: 'Project Alpha', projectCode: 'ALPHA', description: 'x', startDate: new Date(),
      status: 'in-progress', projectManager: new mongoose.Types.ObjectId(),
    });

    const resolved = await service.resolveProjectFilter(String(project._id));
    assert.equal(resolved.projectId, String(project._id));
    assert.equal(resolved.projectCode, 'ALPHA', 'the platform may key on the code');
    assert.equal(resolved.projectName, 'Project Alpha');

    // A code or external id passes through untouched.
    const passthrough = await service.resolveProjectFilter('EXTERNAL-123');
    assert.equal(passthrough.projectId, 'EXTERNAL-123');

    // A project that no longer exists must not silently widen to every project.
    await assert.rejects(
      service.resolveProjectFilter(String(new mongoose.Types.ObjectId())),
      (err) => err.statusCode === 404,
    );

    // No project selected means no project constraint.
    assert.deepEqual(await service.resolveProjectFilter(undefined), {});
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});

test('a lead matches its project whether it carries our id, our code, or the project name', async () => {
  const window = { startDate: '2026-10-01', endDate: '2026-10-31' };
  const id = String(new mongoose.Types.ObjectId());
  const leads = [
    mapper.mapLead({ projectId: id, city: 'Mumbai', createdAt: '2026-10-05' }),
    mapper.mapLead({ projectId: 'ALPHA', city: 'Pune', createdAt: '2026-10-05' }),
    mapper.mapLead({ projectName: 'Project Alpha', city: 'Delhi', createdAt: '2026-10-05' }),
    mapper.mapLead({ projectId: 'SOMETHING-ELSE', city: 'Chennai', createdAt: '2026-10-05' }),
  ];
  const matched = service.applyFilters(leads, {
    ...window, projectId: id, projectCode: 'ALPHA', projectName: 'Project Alpha',
  });
  assert.equal(matched.length, 3, 'all three identifier forms match; the unrelated one does not');
  assert.ok(!matched.some((l) => l.city === 'Chennai'));
});

// ── Not-configured path ─────────────────────────────────────────────────────

test('with no credentials the API reports "not configured" and does not invent data', async () => {
  // The env is unset in test, which is exactly the deployment case this must handle.
  assert.equal(service.isConfigured(), false);

  const res = makeRes();
  await controller.getMarketingAnalytics({ query: {}, log: { error() {} } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.equal(res.body.code, 'MARKETING_PLATFORM_NOT_CONFIGURED');
  assert.equal(res.body.retryable, false, 'retrying cannot fix missing configuration');
  assert.ok(!('data' in res.body), 'no placeholder figures are returned');
});

test('the status endpoint tells an operator the state without leaking a secret', async () => {
  const res = makeRes();
  controller.getMarketingStatus({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.configured, false);
  const serialised = JSON.stringify(res.body);
  for (const secret of ['MARKETING_PLATFORM_TOKEN', 'MARKETING_PLATFORM_API_KEY', 'Bearer ']) {
    assert.ok(!serialised.includes(secret), `status must not contain ${secret}`);
  }
});

test('query input is bounded, so a hostile filter cannot become an unbounded cache key', async () => {
  const res = makeRes();
  // Oversized and array-valued parameters must be clamped, not passed through.
  await controller.getMarketingAnalytics({
    query: { projectId: 'x'.repeat(5000), channel: ['Email', 'Social'], startDate: 'not-a-date', page: '-5' },
    log: { error() {} },
  }, res);
  // Still the not-configured answer, which proves it reached the client rather than
  // throwing on the way in.
  assert.equal(res.body.code, 'MARKETING_PLATFORM_NOT_CONFIGURED');
});
