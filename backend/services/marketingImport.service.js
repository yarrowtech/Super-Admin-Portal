'use strict';
// Spreadsheet import for marketing records: parse → detect columns → validate → resolve
// locations → persist → aggregate for the map.
//
// Two rules shape this file.
//
// Nothing is invented. A location that cannot be resolved is stored with null coordinates
// and reported as unresolved; it is never defaulted to 0,0 (the Gulf of Guinea) or to a
// nearby city. The caller sees exactly which rows failed and why.
//
// Nothing personal reaches the map. Email is persisted because the import is the system of
// record for these contacts, but the geographic rollup projects counts only — see
// buildMapPoints, which never selects the email field.
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const MarketingImport = require('../models/marketing/MarketingImport');
const Project = require('../models/common/Project');
const INDIA_CITY_COORDS = require('../integrations/marketingPlatform/indiaCityCoords');
const { normalizeCity, normalizeState } = require('../integrations/marketingPlatform/mapper');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

// Resolves the mapping the caller asked for against what detection found.
//
// The distinction that matters: a field the caller never mentioned falls back to detection,
// but a field the caller explicitly set to '' or null was deliberately unmapped and must
// stay that way. Falling back in that case would silently re-add a column the user just
// removed — which, for the optional Email field, means importing personal data against an
// explicit choice not to.
const resolveMapping = (requested, detected) => {
  const pick = (field) => (
    requested && Object.prototype.hasOwnProperty.call(requested, field)
      ? (requested[field] || null)
      : detected[field]
  );
  return { school: pick('school'), email: pick('email'), location: pick('location') };
};

const MAX_ROWS = Number(process.env.MARKETING_IMPORT_MAX_ROWS || 20000);
const PREVIEW_ROWS = 10;

// ── Column detection (§5) ───────────────────────────────────────────────────
// Header spellings differ per source, so each target field lists the aliases we accept.
// Order matters: the most specific alias is checked first, so a file with both "School
// Name" and "Name" maps the former.
const COLUMN_ALIASES = {
  school: ['school name', 'school', 'institution name', 'institution', 'organisation', 'organization', 'name'],
  email: ['email address', 'e-mail address', 'email', 'e-mail', 'mail', 'contact email'],
  location: ['location name', 'location', 'address', 'city', 'town', 'area', 'place', 'district'],
};

const canonical = (header) => String(header || '').trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

// Returns { school, email, location } -> the header each maps to, or null when undetected.
// A header is claimed by at most one field, so "Email" cannot satisfy both email and school.
function detectColumns(headers) {
  const available = headers.map((h) => ({ raw: h, key: canonical(h) }));
  const taken = new Set();
  const mapping = { school: null, email: null, location: null };
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const hit = available.find((h) => h.key === alias && !taken.has(h.raw));
      if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); break; }
    }
  }
  // Second pass for partial matches ("Contact e-mail id"), only for still-unmapped fields.
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (mapping[field]) continue;
    const hit = available.find((h) => !taken.has(h.raw) && aliases.some((a) => h.key.includes(a)));
    if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); }
  }
  return mapping;
}

// ── Parsing (§3) ────────────────────────────────────────────────────────────
// One code path for CSV and Excel: xlsx reads both from a buffer, so there is no separate
// CSV branch to keep in sync.
function parseWorkbook(buffer, filename = '') {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  } catch (err) {
    fail(400, 'That file could not be read. Please check it is a valid CSV, XLSX or XLS file.');
  }
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) fail(400, 'The file contains no worksheets.');
  const sheet = workbook.Sheets[sheetName];
  // defval keeps empty cells as '' so a row's column count stays stable.
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rows.length) fail(400, 'The file contains no data rows.');
  if (rows.length > MAX_ROWS) {
    fail(400, `The file has ${rows.length.toLocaleString('en-IN')} rows; the limit is ${MAX_ROWS.toLocaleString('en-IN')}.`);
  }
  const headers = Object.keys(rows[0] || {});
  if (!headers.length) fail(400, 'The first row must contain column headers.');
  return { rows, headers, sheetName, sheetCount: workbook.SheetNames.length };
}

// ── Location resolution (§8, §9) ────────────────────────────────────────────
// A free-text location is tried from most specific to least: the whole string, then each
// comma-separated part from the right ("Salt Lake, Kolkata" → "Kolkata"), then a pincode's
// accompanying text. Resolution uses the same city table the platform adapter uses, so an
// imported Kolkata lands on exactly the same point as a platform Kolkata.
const PINCODE_RE = /\b([1-9][0-9]{5})\b/;

function resolveLocation(raw) {
  const text = String(raw || '').trim();
  if (!text) return { city: '', state: '', pincode: null, latitude: null, longitude: null, coordSource: null };

  const pincodeMatch = text.match(PINCODE_RE);
  const pincode = pincodeMatch ? pincodeMatch[1] : null;
  // Strip the pincode before name matching so "700091, Kolkata" resolves on "Kolkata".
  const withoutPin = pincode ? text.replace(pincode, ' ') : text;

  // Candidate names, longest-tail first: for "Salt Lake, Kolkata, West Bengal" this tries
  // the full string, then "Kolkata, West Bengal", then "West Bengal", then each single part.
  const parts = withoutPin.split(',').map((p) => p.trim()).filter(Boolean);
  const candidates = [withoutPin, ...parts.map((_, i) => parts.slice(i).join(', ')), ...parts].map((c) => c.trim()).filter(Boolean);

  for (const candidate of candidates) {
    const city = normalizeCity(candidate);
    // Qualified key first (City|State), then the bare city, matching the adapter's order.
    for (const part of parts) {
      const state = normalizeState(part);
      const qualified = INDIA_CITY_COORDS[`${city}|${state}`];
      if (qualified) return { city, state, pincode, latitude: qualified[0], longitude: qualified[1], coordSource: 'city-table' };
    }
    const hit = INDIA_CITY_COORDS[city];
    if (hit) {
      // Keep a state only if one of the other parts is recognisably a state name.
      const state = parts.map((p) => normalizeState(p)).find((s) => s && s !== city) || '';
      return { city, state, pincode, latitude: hit[0], longitude: hit[1], coordSource: 'city-table' };
    }
  }
  // Unresolved: keep what the file said, place nothing on the map.
  return { city: normalizeCity(parts[0] || text), state: '', pincode, latitude: null, longitude: null, coordSource: null };
}

// ── Validation (§7, §22) ────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Produces the full picture the drawer shows before anything is written: which rows are
// valid, which need attention and why, which locations resolved, and which rows duplicate
// each other inside the file itself.
function validateRows(rows, mapping) {
  if (!mapping?.school) fail(422, 'Map a School column before continuing.');
  if (!mapping?.location) fail(422, 'Map a Location column before continuing.');

  const seen = new Map();
  const records = [];
  const issues = [];
  let resolved = 0;
  let duplicates = 0;

  rows.forEach((row, index) => {
    // +2: one for the header row, one because spreadsheet rows are 1-indexed.
    const rowNumber = index + 2;
    const school = String(row[mapping.school] ?? '').trim();
    const email = mapping.email ? String(row[mapping.email] ?? '').trim().toLowerCase() : '';
    const locationRaw = String(row[mapping.location] ?? '').trim();

    const rowIssues = [];
    if (!school) rowIssues.push('School is empty');
    if (!locationRaw) rowIssues.push('Location is empty');
    if (email && !EMAIL_RE.test(email)) rowIssues.push('Email is not a valid address');

    const location = locationRaw ? resolveLocation(locationRaw) : null;
    if (locationRaw && location.latitude === null) rowIssues.push('Location could not be resolved');
    if (location?.latitude !== null && location?.latitude !== undefined) resolved += 1;

    const dedupeKey = `${school.toLowerCase()}|${email}|${locationRaw.toLowerCase()}`;
    const isDuplicate = seen.has(dedupeKey);
    if (isDuplicate) {
      duplicates += 1;
      rowIssues.push(`Duplicate of row ${seen.get(dedupeKey)}`);
    } else if (school && locationRaw) {
      seen.set(dedupeKey, rowNumber);
    }

    // A row is importable when it has the required fields and is not a duplicate. An
    // unresolved location does not block the import — the row is stored and counted, it
    // simply cannot be plotted.
    const importable = Boolean(school) && Boolean(locationRaw) && !isDuplicate;

    if (rowIssues.length) {
      issues.push({ row: rowNumber, school: school || '—', email: email || '—', location: locationRaw || '—', issues: rowIssues });
    }
    if (importable) {
      records.push({
        school, email, locationRaw,
        city: location.city, state: location.state, pincode: location.pincode,
        latitude: location.latitude, longitude: location.longitude, coordSource: location.coordSource,
      });
    }
  });

  return {
    summary: {
      total: rows.length,
      valid: records.length,
      needsAttention: issues.length,
      duplicates,
      locationsResolved: resolved,
      locationsUnresolved: records.filter((r) => r.latitude === null).length,
    },
    // Capped: this is a review aid, not an export.
    issues: issues.slice(0, 100),
    issuesTruncated: Math.max(0, issues.length - 100),
    records,
  };
}

// ── Public operations ───────────────────────────────────────────────────────

// Step 1-3: read the file and report what we found. Writes nothing.
async function analyzeFile({ buffer, filename, mapping }) {
  const { rows, headers, sheetName, sheetCount } = parseWorkbook(buffer, filename);
  const detected = detectColumns(headers);
  // A caller-supplied mapping wins — including an explicit "unmapped".
  const effective = resolveMapping(mapping, detected);

  const complete = Boolean(effective.school && effective.location);
  const result = {
    file: { name: filename, rows: rows.length, sheetName, sheetCount },
    headers,
    detected,
    mapping: effective,
    // Which fields were auto-matched, so the UI can show the ✓ per §5.
    autoMatched: Object.fromEntries(Object.entries(detected).map(([k, v]) => [k, Boolean(v)])),
    ready: complete,
  };
  if (!complete) return result;

  const validation = validateRows(rows, effective);
  return {
    ...result,
    summary: validation.summary,
    issues: validation.issues,
    issuesTruncated: validation.issuesTruncated,
    preview: validation.records.slice(0, PREVIEW_ROWS).map(({ school, email, locationRaw, city, state, latitude }) => ({
      school, email, location: locationRaw, city, state, mapped: latitude !== null,
    })),
  };
}

// Step 4: persist. Requires a project (§15) — an import with no project would pollute
// every project's analytics.
async function commitImport({ buffer, filename, mapping, projectId, actorId }) {
  if (!projectId) fail(422, 'Select a project before importing marketing data.');
  if (!mongoose.isValidObjectId(projectId)) fail(422, 'Invalid project.');
  const project = await Project.findById(projectId).select('_id name').lean();
  if (!project) fail(404, 'Project not found.');

  const { rows, headers } = parseWorkbook(buffer, filename);
  const detected = detectColumns(headers);
  const effective = resolveMapping(mapping, detected);
  const validation = validateRows(rows, effective);
  if (!validation.records.length) {
    fail(422, 'No importable rows were found. Every row is missing a School or Location, or is a duplicate.');
  }

  const batchId = crypto.randomUUID();
  const docs = validation.records.map((r) => ({
    ...r,
    projectId: project._id,
    batchId,
    sourceFile: String(filename || '').slice(0, 300),
    importedBy: actorId || null,
  }));

  // ordered:false so a row that collides with an earlier import is skipped rather than
  // aborting the batch — re-importing a file with ten new rows should insert those ten.
  let inserted = 0;
  let skipped = 0;
  try {
    const res = await MarketingImport.insertMany(docs, { ordered: false });
    inserted = res.length;
  } catch (err) {
    inserted = err?.result?.nInserted ?? err?.insertedDocs?.length ?? 0;
    const writeErrors = err?.writeErrors || [];
    // 11000 is the unique-index collision: an already-imported row, not a failure.
    skipped = writeErrors.filter((e) => e?.err?.code === 11000 || e?.code === 11000).length;
    if (writeErrors.length && skipped !== writeErrors.length) throw err;
  }

  return {
    batchId,
    projectId: String(project._id),
    projectName: project.name,
    inserted,
    skippedAsExisting: skipped,
    ...validation.summary,
  };
}

// ── Map aggregation (§11, §12, §19) ─────────────────────────────────────────
// One point per city with counts only. The email field is never selected, so there is no
// path by which a contact's address could reach the map payload.
// `projectIds` is the set the caller is authorised to see. One id scopes to that project;
// several (the "All Projects" filter, §2) aggregate across them. An empty set returns
// nothing rather than everything — a filter that fails open is a data leak.
async function getImportedMapPoints(projectIds) {
  const ids = (Array.isArray(projectIds) ? projectIds : [projectIds])
    .filter((id) => id && mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  if (!ids.length) return { points: [], unresolved: 0, total: 0, schools: 0 };
  const match = { projectId: { $in: ids } };

  const [points, counts] = await Promise.all([
    MarketingImport.aggregate([
      { $match: { ...match, latitude: { $ne: null } } },
      {
        $group: {
          _id: { city: '$city', state: '$state' },
          latitude: { $first: '$latitude' },
          longitude: { $first: '$longitude' },
          records: { $sum: 1 },
          schools: { $addToSet: '$school' },
        },
      },
      {
        $project: {
          _id: 0,
          location: '$_id.city',
          state: '$_id.state',
          latitude: 1,
          longitude: 1,
          records: 1,
          schools: { $size: '$schools' },
        },
      },
      { $sort: { records: -1 } },
    ]),
    MarketingImport.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          unresolved: { $sum: { $cond: [{ $eq: ['$latitude', null] }, 1, 0] } },
          // Distinct across the whole selection, so the summary's school count is not the
          // sum of per-city counts (a chain with branches in three cities is one school).
          schools: { $addToSet: '$school' },
        },
      },
      { $project: { _id: 0, total: 1, unresolved: 1, schools: { $size: '$schools' } } },
    ]),
  ]);

  const tally = counts[0] || { total: 0, unresolved: 0, schools: 0 };
  return { points, unresolved: tally.unresolved, total: tally.total, schools: tally.schools };
}

// ── Location records (§34, §35) ─────────────────────────────────────────────
// The records behind one map marker, for the View Details drawer. Separate from the map
// payload on purpose: the map gets counts, and this is the authorised detail view, reached
// only by an explicit click and scoped to one city within the projects the caller may see.
//
// Email is returned here because this IS the authorised detail view (§34) — the same place
// the platform's own contact drawer shows it. It is never in the map payload.
async function getLocationRecords({ projectIds, city, page = 1, limit = 25 } = {}) {
  const ids = (Array.isArray(projectIds) ? projectIds : [projectIds])
    .filter((id) => id && mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  if (!ids.length) fail(422, 'Select a project to view its records.');
  if (!city) fail(422, 'A location is required.');

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  // Exact match on the normalised city the aggregation grouped by, so the drawer shows
  // precisely the records that marker counted.
  const match = { projectId: { $in: ids }, city: String(city) };

  const [items, total] = await Promise.all([
    MarketingImport.find(match)
      .select('school email locationRaw city state pincode latitude longitude sourceFile createdAt projectId')
      .populate('projectId', 'name projectCode')
      .sort({ school: 1, _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    MarketingImport.countDocuments(match),
  ]);

  return {
    items: items.map((r) => ({
      id: String(r._id),
      school: r.school,
      email: r.email || '',
      location: r.locationRaw,
      city: r.city,
      state: r.state,
      pincode: r.pincode || '',
      // Whether this row is on the map, so the drawer can explain an absence.
      mapped: r.latitude !== null && r.latitude !== undefined,
      sourceFile: r.sourceFile || '',
      projectName: r.projectId?.name || '',
      createdAt: r.createdAt,
    })),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) },
  };
}

// Records with no resolvable location (§32). Same authorisation, no city filter — these are
// exactly the rows the map cannot show, which is why they need their own view.
async function getUnmappedRecords({ projectIds, page = 1, limit = 25 } = {}) {
  const ids = (Array.isArray(projectIds) ? projectIds : [projectIds])
    .filter((id) => id && mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(String(id)));
  if (!ids.length) fail(422, 'Select a project to view its records.');

  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const match = { projectId: { $in: ids }, latitude: null };

  const [items, total] = await Promise.all([
    MarketingImport.find(match)
      .select('school email locationRaw sourceFile createdAt projectId')
      .populate('projectId', 'name')
      .sort({ _id: 1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    MarketingImport.countDocuments(match),
  ]);

  return {
    items: items.map((r) => ({
      id: String(r._id),
      school: r.school,
      email: r.email || '',
      // What the file actually said — the value that failed to resolve, so it can be
      // corrected at source and re-imported.
      location: r.locationRaw,
      sourceFile: r.sourceFile || '',
      projectName: r.projectId?.name || '',
      missingLocationReason: r.locationRaw?.trim() ? 'Location could not be resolved to coordinates' : 'Location is missing from the source record',
      status: 'Unmapped',
      createdAt: r.createdAt,
    })),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.max(1, Math.ceil(total / safeLimit)) },
  };
}

module.exports = {
  analyzeFile, commitImport, getImportedMapPoints, getLocationRecords, getUnmappedRecords,
  searchImportedRecords, getImportedRecord,
  // exported for tests
  detectColumns, resolveLocation, validateRows, parseWorkbook, resolveMapping,
};

const recordScope = (projectIds) => (Array.isArray(projectIds) ? projectIds : [projectIds])
  .filter((id) => id && mongoose.isValidObjectId(id))
  .map((id) => new mongoose.Types.ObjectId(String(id)));

const recordDetail = (row) => ({
  id: String(row._id), school: row.school, email: row.email || '',
  location: row.locationRaw || '', city: row.city || '', state: row.state || '',
  latitude: row.latitude ?? null, longitude: row.longitude ?? null,
  projectName: row.projectId?.name || '', department: row.department || '',
  sourceFile: row.sourceFile || '', pincode: row.pincode || '', createdAt: row.createdAt,
  mapped: Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
  status: Number.isFinite(row.latitude) && Number.isFinite(row.longitude) ? 'Mapped' : 'Unmapped',
  missingLocationReason: row.locationRaw?.trim() ? 'Location could not be resolved to coordinates' : 'Location is missing from the source record',
});

async function searchImportedRecords({ projectIds, search } = {}) {
  const ids = recordScope(projectIds);
  const term = String(search || '').trim().slice(0, 120);
  if (!ids.length || term.length < 2) return { items: [] };
  const literal = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = { projectId: { $in: ids }, $or: ['school', 'locationRaw', 'city'].map((key) => ({ [key]: { $regex: literal, $options: 'i' } })) };
  const rows = await MarketingImport.find(match)
    .select('school locationRaw city state latitude longitude projectId')
    .populate('projectId', 'name').sort({ school: 1, _id: 1 }).limit(12).lean();
  // Search exposes names and geography only; contact details are loaded after selection.
  return { items: rows.map((row) => { const { email: _email, ...item } = recordDetail(row); return item; }) };
}

async function getImportedRecord({ projectIds, recordId } = {}) {
  const ids = recordScope(projectIds);
  if (!ids.length) fail(422, 'Select a project to view its records.');
  if (!mongoose.isValidObjectId(recordId)) fail(422, 'A valid record is required.');
  const row = await MarketingImport.findOne({ _id: recordId, projectId: { $in: ids } })
    .populate('projectId', 'name').lean();
  if (!row) fail(404, 'This record is not available in the selected project.');
  return recordDetail(row);
}
