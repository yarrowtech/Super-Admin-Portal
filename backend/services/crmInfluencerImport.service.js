/**
 * Spreadsheet import for CRM influencers.
 *
 * Deliberately a sibling of crmImport.service rather than a branch inside it.
 * The two share the parts that are genuinely generic — reading a workbook,
 * detecting columns from aliases, the two-phase analyze/commit contract — and
 * `parseWorkbook` is imported from there so CSV/XLSX handling has exactly one
 * implementation. What differs is the shape of a row: an influencer sheet
 * carries handles, follower counts and rate cards, and validating those as
 * client fields would either drop them or write nonsense.
 *
 * Phase contract, same as clients: analyze() reads and reports without writing,
 * so the counts and row issues on screen are seen before anything is persisted.
 */
const XLSX = require('xlsx');

const CRMInfluencer = require('../models/crm/CRMInfluencer');
const CRMInfluencerPost = require('../models/crm/CRMInfluencerPost');
const CRMImportBatch = require('../models/crm/CRMImportBatch');
const Project = require('../models/common/Project');
const { parseWorkbook } = require('./crmImport.service');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

const MAX_ROWS = Number(process.env.CRM_IMPORT_MAX_ROWS || 20000);
const PREVIEW_ROWS = 10;
const MAX_ISSUES = 100;

// ── Column detection ────────────────────────────────────────────────────────
// Ordered most-specific-first: a sheet carrying both "Instagram Handle" and
// "Name" must map the former to `handle`, not swallow it into `name`.
const COLUMN_ALIASES = {
  name:           ['influencer name', 'creator name', 'blogger name', 'full name', 'display name', 'account name', 'influencer', 'creator', 'blogger', 'name'],
  handle:         ['instagram handle', 'ig handle', 'insta handle', 'youtube handle', 'social handle', 'user name', 'username', 'handle', 'account', 'profile', 'insta id', 'instagram id'],
  platform:       ['platform', 'social platform', 'channel', 'network', 'social media'],
  // Listed before profileUrl so a "Reel / Post URL" column is claimed as content
  // rather than mistaken for the creator's profile link.
  postUrl:        ['instagram reel / post url', 'reel / post url', 'reel post url', 'post url', 'reel url', 'content url', 'video url', 'post link', 'reel link', 'content link'],
  profileUrl:     ['profile url', 'profile link', 'instagram url', 'instagram link', 'channel url', 'social link', 'profile', 'link', 'url'],
  email:          ['email address', 'e-mail address', 'email id', 'mail id', 'email', 'e-mail', 'mail'],
  phone:          ['phone number', 'mobile number', 'contact number', 'whatsapp', 'phone', 'mobile', 'contact no'],
  location:       ['location', 'city', 'region', 'based in', 'area'],
  followers:      ['followers count', 'follower count', 'no of followers', 'subscribers', 'followers', 'reach', 'audience'],
  avgViews:       ['average views', 'avg views', 'avg. views', 'mean views', 'views'],
  avgLikes:       ['average likes', 'avg likes', 'avg. likes', 'mean likes', 'likes'],
  engagementRate: ['engagement rate', 'engagement %', 'engagement percentage', 'er %', 'engagement', 'er'],
  ratePerPost:    ['rate per post', 'post rate', 'cost per post', 'price per post', 'charges per post', 'post price'],
  ratePerStory:   ['rate per story', 'story rate', 'cost per story', 'price per story', 'story price'],
  ratePerReel:    ['rate per reel', 'reel rate', 'cost per reel', 'price per reel', 'reel price'],
  currency:       ['currency', 'curr'],
  category:       ['category', 'niche', 'genre', 'vertical', 'content type'],
  tier:           ['tier', 'influencer tier', 'segment'],
  department:     ['department', 'dept', 'division', 'team'],
  status:         ['status', 'stage', 'outreach status', 'crm status'],
  priority:       ['priority', 'importance'],
  campaignPeriod: ['campaign period', 'campaign duration', 'duration', 'period', 'timeline', 'campaign dates'],
  notes:          ['notes', 'remarks', 'comments', 'description', 'mail content', 'message', 'note'],
};

// An influencer is identifiable by a name OR a handle, so neither alone is
// mandatory; the cross-field check lives in validateRows where both are visible.
const REQUIRED_FIELDS = [];

const canonical = (header) => String(header || '')
  .trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

/** Returns { field: header | null }. A header is claimed by at most one field. */
function detectColumns(headers) {
  const available = headers.map((h) => ({ raw: h, key: canonical(h) }));
  const taken = new Set();
  const mapping = Object.fromEntries(Object.keys(COLUMN_ALIASES).map((f) => [f, null]));

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const hit = available.find((h) => h.key === alias && !taken.has(h.raw));
      if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); break; }
    }
  }
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (mapping[field]) continue;
    const hit = available.find((h) => !taken.has(h.raw) && aliases.some((a) => h.key.includes(a)));
    if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); }
  }
  return mapping;
}

/**
 * A field the caller never mentioned falls back to detection; a field the caller
 * explicitly cleared was deliberately unmapped and stays so, or the operator's
 * removal would be silently undone.
 */
const resolveMapping = (requested, detected) => Object.fromEntries(
  Object.keys(COLUMN_ALIASES).map((field) => [
    field,
    requested && Object.prototype.hasOwnProperty.call(requested, field)
      ? (requested[field] || null)
      : detected[field],
  ])
);

// ── Value coercion ──────────────────────────────────────────────────────────
const PLATFORMS = ['instagram', 'youtube', 'tiktok', 'x', 'facebook', 'linkedin', 'other'];
const TIERS = ['nano', 'micro', 'mid', 'macro', 'mega'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function normalizePlatform(raw, fallback = 'instagram') {
  const text = canonical(raw);
  if (!text) return fallback;
  if (PLATFORMS.includes(text)) return text;
  if (/insta|ig\b/.test(text)) return 'instagram';
  if (/you ?tube|yt\b/.test(text)) return 'youtube';
  if (/tik ?tok/.test(text)) return 'tiktok';
  if (/twitter|^x$/.test(text)) return 'x';
  if (/face ?book|fb\b/.test(text)) return 'facebook';
  if (/linked ?in/.test(text)) return 'linkedin';
  return 'other';
}

function normalizeDepartment(raw, fallback = 'marketing') {
  const text = canonical(raw);
  if (['media', 'marketing', 'both'].includes(text)) return text;
  if (/both|all/.test(text)) return 'both';
  if (/market/.test(text)) return 'marketing';
  if (/media/.test(text)) return 'media';
  return fallback;
}

const normalizePriority = (raw) => {
  const text = canonical(raw);
  return PRIORITIES.includes(text) ? text : 'medium';
};

const normalizeTier = (raw) => {
  const text = canonical(raw);
  if (TIERS.includes(text)) return text;
  if (/mega/.test(text)) return 'mega';
  if (/macro/.test(text)) return 'macro';
  if (/\bmid\b|medium/.test(text)) return 'mid';
  if (/micro/.test(text)) return 'micro';
  if (/nano/.test(text)) return 'nano';
  return null;
};

/**
 * Audience and money columns arrive as humans write them: "12.5K", "1.2m",
 * "₹25,000", "1,20,000" (Indian grouping). Returns null for genuinely empty
 * cells so "not captured" stays distinct from a measured zero.
 */
function parseNumeric(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  let text = String(raw).trim();
  if (!text) return null;

  // Strip currency symbols/codes and thousands separators, keeping the K/M/B
  // suffix and decimal point that carry magnitude.
  text = text.replace(/[₹$€£,\s]/g, '').replace(/\b(inr|usd|eur|gbp|rs\.?)\b/gi, '');
  const match = text.match(/^(-?\d*\.?\d+)\s*([kmb])?$/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (!Number.isFinite(value)) return null;
  const factor = { k: 1e3, m: 1e6, b: 1e9 }[String(match[2] || '').toLowerCase()] || 1;
  return value * factor;
}

/** Engagement arrives as "3.2%" or "3.2" or, from a percent-formatted cell, 0.032. */
function parseEngagement(raw) {
  const hadPercentSign = typeof raw === 'string' && raw.includes('%');
  const value = parseNumeric(typeof raw === 'string' ? raw.replace('%', '') : raw);
  if (value === null) return null;
  // A spreadsheet percent cell hands over a fraction; 0.032 means 3.2%, while a
  // bare 3.2 already is the percentage. Only values below 1 are rescaled, and
  // only when the source did not spell the sign out.
  const pct = (!hadPercentSign && value > 0 && value < 1) ? value * 100 : value;
  return pct >= 0 && pct <= 100 ? Math.round(pct * 100) / 100 : null;
}

const normalizeHandle = (raw) => String(raw ?? '').trim().replace(/^@+/, '');

const normalizeUrl = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

/**
 * Dedupe key. The same creator appears as "@handle", "handle" and "Handle "
 * across sources; collapsing case, the leading @ and the separators handles are
 * written with inconsistently keeps those one record.
 */
const dedupeKey = (value) => String(value || '')
  .trim().toLowerCase().replace(/^@+/, '').replace(/[\s._-]+/g, '');

// ── Validation ──────────────────────────────────────────────────────────────
/**
 * Turns parsed rows into importable records plus a row-level issue list.
 *
 * Nothing here writes. Rows that cannot be identified are reported rather than
 * silently dropped, so the review screen accounts for every line in the file.
 */
function validateRows(rows, mapping, { fallbackDepartment = 'marketing', statusNames = [], defaultStatus = 'Email Sent' } = {}) {
  if (!mapping?.name && !mapping?.handle) {
    fail(422, 'Map an Influencer Name or Handle column before continuing.');
  }

  const records = [];
  const issues = [];
  const seen = new Map();          // dedupe key -> first row number
  const knownStatuses = new Set(statusNames.map((s) => canonical(s)));

  const cell = (row, field) => (mapping[field] ? row[mapping[field]] : undefined);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;   // +1 for zero-index, +1 for the header line
    const addIssue = (message) => {
      if (issues.length < MAX_ISSUES) issues.push({ row: rowNumber, message });
    };

    const rawName = String(cell(row, 'name') ?? '').trim();
    // Creator sheets routinely carry one "Account / Creator" column holding what
    // is really the handle, with no separate handle column. Rather than leaving
    // the handle empty, derive it from that name — a single-token value with no
    // spaces is a handle, not a person's name. A real handle column still wins.
    const explicitHandle = normalizeHandle(cell(row, 'handle'));
    const nameLooksLikeHandle = /^@?[\w.]+$/.test(rawName) && !/\s/.test(rawName);
    const handle = explicitHandle || (nameLooksLikeHandle ? normalizeHandle(rawName) : '');

    // Display names are shown as typed, minus a leading @ so the roster does not
    // mix "@creator" and "creator" spellings of the same kind of record.
    const name = normalizeHandle(rawName) || handle;

    if (!name) {
      addIssue('No influencer name or handle — row skipped');
      return;
    }

    const postUrl = normalizeUrl(cell(row, 'postUrl'));

    // A creator sheet lists one row per deliverable, so a repeated handle is
    // normally the same person's next reel rather than a mistake. The row's
    // content URL is added to the record already built for that creator; only
    // a repeat carrying nothing new is reported as a true duplicate.
    const key = dedupeKey(handle || name);
    if (seen.has(key)) {
      const first = seen.get(key);
      if (postUrl && !first.record.posts.includes(postUrl)) {
        first.record.posts.push(postUrl);
      } else {
        addIssue(`Duplicate of row ${first.row} ("${name}") — row skipped`);
      }
      return;
    }

    const followers = parseNumeric(cell(row, 'followers'));
    if (mapping.followers && cell(row, 'followers') && followers === null) {
      addIssue(`Follower count "${cell(row, 'followers')}" is not a number — left blank`);
    }

    const engagementRate = parseEngagement(cell(row, 'engagementRate'));
    if (mapping.engagementRate && cell(row, 'engagementRate') && engagementRate === null) {
      addIssue(`Engagement rate "${cell(row, 'engagementRate')}" is not a usable percentage — left blank`);
    }

    // A status the pipeline does not define is flagged rather than written, so an
    // import cannot invent stages no board column will ever display.
    let status = String(cell(row, 'status') ?? '').trim() || defaultStatus;
    if (canonical(status) === 'identified') status = 'Email Sent';
    if (knownStatuses.size && !knownStatuses.has(canonical(status))) {
      addIssue(`Status "${status}" is not a configured stage — set to "${defaultStatus}"`);
      status = defaultStatus;
    }

    const record = {
      name,
      handle: handle || undefined,
      platform: normalizePlatform(cell(row, 'platform')),
      profileUrl: normalizeUrl(cell(row, 'profileUrl')),
      // Content URLs for this creator, grown by any later row naming them.
      posts: postUrl ? [postUrl] : [],
      email: String(cell(row, 'email') ?? '').trim().toLowerCase(),
      phone: String(cell(row, 'phone') ?? '').trim(),
      location: String(cell(row, 'location') ?? '').trim(),
      followers,
      avgViews: parseNumeric(cell(row, 'avgViews')),
      avgLikes: parseNumeric(cell(row, 'avgLikes')),
      engagementRate,
      ratePerPost: parseNumeric(cell(row, 'ratePerPost')),
      ratePerStory: parseNumeric(cell(row, 'ratePerStory')),
      ratePerReel: parseNumeric(cell(row, 'ratePerReel')),
      currency: String(cell(row, 'currency') ?? '').trim().toUpperCase() || 'INR',
      category: String(cell(row, 'category') ?? '').trim(),
      tier: normalizeTier(cell(row, 'tier')),
      department: normalizeDepartment(cell(row, 'department'), fallbackDepartment),
      priority: normalizePriority(cell(row, 'priority')),
      campaignPeriod: String(cell(row, 'campaignPeriod') ?? '').trim(),
      notes: String(cell(row, 'notes') ?? '').trim(),
      status,
      _row: rowNumber,
    };

    records.push(record);
    // Held by reference so later rows for this creator append to its posts.
    seen.set(key, { row: rowNumber, record });
  });

  return { records, issues };
}

// ── Analyze (writes nothing) ────────────────────────────────────────────────
async function analyzeFile({ buffer, filename, mapping, sheet, department = 'marketing' }) {
  const parsed = parseWorkbook(buffer, { sheet });
  if (parsed.rows.length > MAX_ROWS) {
    fail(413, `That file has ${parsed.rows.length} rows; the limit is ${MAX_ROWS}.`);
  }

  const detected = detectColumns(parsed.headers);
  const effective = resolveMapping(mapping, detected);

  const { records, issues } = validateRows(parsed.rows, effective, { fallbackDepartment: department });

  return {
    filename,
    sheet: parsed.sheet,
    sheets: parsed.sheets,
    headers: parsed.headers,
    detected,
    mapping: effective,
    required: REQUIRED_FIELDS,
    rowsTotal: parsed.rows.length,
    rowsValid: records.length,
    rowsSkipped: parsed.rows.length - records.length,
    issues,
    preview: records.slice(0, PREVIEW_ROWS),
  };
}

// ── Commit ──────────────────────────────────────────────────────────────────
async function commitImport({ buffer, filename, mapping, sheet, projectId, department = 'marketing', mode = 'skip', actorId }) {
  if (!projectId) fail(422, 'Choose a project to import these influencers into.');

  const project = await Project.findById(projectId).select('_id name').lean();
  if (!project) fail(404, 'That project no longer exists.');

  const parsed = parseWorkbook(buffer, { sheet });
  if (parsed.rows.length > MAX_ROWS) {
    fail(413, `That file has ${parsed.rows.length} rows; the limit is ${MAX_ROWS}.`);
  }

  const detected = detectColumns(parsed.headers);
  const effective = resolveMapping(mapping, detected);
  const { records } = validateRows(parsed.rows, effective, { fallbackDepartment: department });

  const batchId = require('crypto').randomUUID();
  let created = 0; let updated = 0; let skipped = 0; let postsCreated = 0;
  const failures = [];

  /**
   * File a creator's content URLs. Upserted on (influencer, url) so re-running
   * an import adds genuinely new posts without duplicating the existing ones.
   */
  const savePosts = async (influencerId, urls) => {
    for (const url of urls || []) {
      await CRMInfluencerPost.updateOne(
        { influencer: influencerId, url },
        {
          $setOnInsert: {
            influencer: influencerId,
            url,
            kind: CRMInfluencerPost.kindFromUrl(url),
            project: project._id,
            importBatch: batchId,
            importedAt: new Date(),
            createdBy: actorId || null,
          },
        },
        { upsert: true },
      );
      postsCreated += 1;
    }
  };

  for (const record of records) {
    const { _row, posts, ...payload } = record;
    try {
      // Match on handle first — it is the stable identifier for a creator, while
      // display names are rewritten constantly. Email is the fallback for rows
      // that carry no handle at all.
      const or = [];
      if (payload.handle) or.push({ handle: payload.handle });
      if (payload.email) or.push({ email: payload.email });
      if (!or.length) or.push({ name: payload.name });

      const existing = await CRMInfluencer.findOne({ isActive: true, $or: or }).select('_id').lean();

      if (existing) {
        if (mode === 'update') {
          // Only non-empty cells are written, so a sparse sheet cannot blank out
          // metrics already captured against the creator.
          const patch = Object.fromEntries(
            Object.entries(payload).filter(([, v]) => v !== '' && v !== null && v !== undefined)
          );
          await CRMInfluencer.updateOne({ _id: existing._id }, { $set: patch });
          updated += 1;
        } else {
          skipped += 1;
        }
        // Posts are filed either way: a creator already on file still gains the
        // new content this sheet lists, which is the point of a re-import.
        await savePosts(existing._id, posts);
        continue;
      }

      // save(), not insertMany(): influencerId comes from a pre-save hook that
      // insertMany would bypass, leaving every imported row without an ID.
      const doc = await new CRMInfluencer({
        ...payload,
        project: project._id,
        importBatch: batchId,
        importedAt: new Date(),
        createdBy: actorId || null,
        statusHistory: [{
          toStatus: payload.status,
          changedBy: actorId || null,
          reason: `Imported from ${filename || 'spreadsheet'}`,
        }],
      }).save();
      created += 1;
      await savePosts(doc._id, posts);
    } catch (err) {
      failures.push({ row: _row, name: record.name, error: err.message });
    }
  }

  await CRMImportBatch.create({
    batchId,
    entity: 'influencer',
    fileName: String(filename || '').slice(0, 300),
    project: project._id,
    projectName: project.name,
    department: normalizeDepartment(department, 'marketing'),
    mapping: effective,
    rowsTotal: parsed.rows.length,
    created, updated, skipped,
    failed: failures.length,
    importedBy: actorId || null,
  });

  return {
    batchId,
    projectId: String(project._id),
    projectName: project.name,
    department,
    created, updated, skipped,
    postsCreated,
    failed: failures.length,
    failures: failures.slice(0, MAX_ISSUES),
  };
}

/**
 * Undo an import. Only rows this batch CREATED carry its id, so rows it merely
 * updated are left alone — reverting cannot delete a creator that predated the
 * file. The batch row itself is kept so the history stays truthful.
 */
async function revertBatch({ batchId, actorId }) {
  const batch = await CRMImportBatch.findOne({ batchId, entity: 'influencer' });
  if (!batch) fail(404, 'That import batch no longer exists.');
  if (batch.revertedAt) fail(409, 'That import has already been reverted.');

  // Posts go with the creators they were imported alongside, or reverting
  // would strand content rows pointing at influencers that no longer exist.
  const posts = await CRMInfluencerPost.deleteMany({ importBatch: batchId });
  const res = await CRMInfluencer.deleteMany({ importBatch: batchId });
  batch.revertedAt = new Date();
  batch.revertedBy = actorId || null;
  await batch.save();

  return { batchId, deleted: res.deletedCount, postsDeleted: posts.deletedCount };
}

async function listBatches({ projectId, limit = 25 } = {}) {
  const filter = { entity: 'influencer' };
  if (projectId) filter.project = projectId;
  return CRMImportBatch.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 25, 100))
    .populate('importedBy', 'firstName lastName email')
    .lean();
}

/** A ready-to-fill workbook whose headers detection is guaranteed to recognise. */
function buildTemplate() {
  const headers = [
    'Influencer Name', 'Handle', 'Platform', 'Profile URL', 'Email', 'Phone',
    'Location', 'Followers', 'Avg Views', 'Avg Likes', 'Engagement Rate',
    'Rate Per Post', 'Rate Per Story', 'Rate Per Reel', 'Currency',
    'Category', 'Tier', 'Department', 'Status', 'Priority', 'Campaign Period', 'Notes',
  ];
  const sample = [{
    'Influencer Name': 'Aisha Verma', Handle: 'aishaeats', Platform: 'Instagram',
    'Profile URL': 'https://instagram.com/aishaeats', Email: 'aisha@example.com',
    Phone: '+91 98200 10000', Location: 'Mumbai', Followers: '125K',
    'Avg Views': '48K', 'Avg Likes': '6.2K', 'Engagement Rate': '4.9%',
    'Rate Per Post': '45000', 'Rate Per Story': '15000', 'Rate Per Reel': '60000',
    Currency: 'INR', Category: 'Food', Tier: 'Macro', Department: 'Marketing',
    Status: 'Email Sent', Priority: 'High', 'Campaign Period': '4 Dec 26 to 21 Mar 27',
    Notes: 'Strong food audience in Mumbai',
  }];

  const sheet = XLSX.utils.json_to_sheet(sample, { header: headers });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Influencers');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  analyzeFile,
  commitImport,
  revertBatch,
  listBatches,
  buildTemplate,
  // exported for tests
  detectColumns,
  validateRows,
  parseNumeric,
  parseEngagement,
  normalizePlatform,
  normalizeTier,
  COLUMN_ALIASES,
};
