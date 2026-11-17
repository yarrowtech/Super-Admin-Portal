'use strict';
/**
 * Spreadsheet import for the Media & Marketing CRM: parse → detect columns →
 * validate → preview → commit, grouped project-wise.
 *
 * Deliberately mirrors services/marketingImport.service.js — same two-phase
 * shape (analyze writes nothing, commit persists), same "nothing is invented"
 * rule. Three rules shape this file:
 *
 * 1. Nothing is invented. A row whose department or status cannot be read is
 *    reported, not guessed into a default that would quietly misfile a client.
 *    The one exception is explicit and visible: an unreadable department falls
 *    back to the department the operator chose for the whole import, which they
 *    picked knowingly in the upload form.
 *
 * 2. Analyze never writes. The operator always sees counts and a row-level issue
 *    list before anything touches the database.
 *
 * 3. Every import is project-scoped and reversible. Rows carry a batchId so a
 *    mis-mapped file is one revert away, not a manual cleanup.
 */
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

const CRMClient = require('../models/crm/CRMClient');
const CRMImportBatch = require('../models/crm/CRMImportBatch');
const CRMStatus = require('../models/crm/CRMStatus');
const Project = require('../models/common/Project');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

const MAX_ROWS = Number(process.env.CRM_IMPORT_MAX_ROWS || 20000);
const PREVIEW_ROWS = 10;
const MAX_ISSUES = 100;

// ── Column detection ────────────────────────────────────────────────────────
// Header spellings differ per source, so each target field lists accepted aliases.
// Order matters: the most specific alias wins, so a sheet with both "Client Name"
// and "Name" maps the former.
const COLUMN_ALIASES = {
  name:           ['client name', 'company name', 'organisation name', 'organization name', 'account name', 'account / creator', 'account creator', 'creator name', 'influencer name', 'blogger name', 'handle', 'username', 'client', 'company', 'organisation', 'organization', 'account', 'creator', 'influencer', 'blogger', 'name'],
  contactPerson:  ['contact person', 'contact name', 'primary contact', 'poc', 'point of contact', 'contact'],
  email:          ['email address', 'e-mail address', 'email id', 'mail id', 'email', 'e-mail', 'mail'],
  phone:          ['phone number', 'mobile number', 'contact number', 'phone / whatsapp', 'phone whatsapp', 'whatsapp', 'phone', 'mobile', 'contact no', 'telephone'],
  website:        ['website url', 'website', 'profile url', 'profile link', 'instagram reel / post url', 'instagram url', 'instagram link', 'post url', 'reel url', 'social link', 'link', 'url', 'site', 'web'],
  address:        ['address', 'location', 'city', 'area'],
  department:     ['department', 'dept', 'vertical', 'division', 'team'],
  status:         ['status', 'stage', 'pipeline stage', 'lead status', 'crm status'],
  priority:       ['priority', 'importance', 'urgency'],
  projectName:    ['project name', 'project', 'campaign name', 'campaign'],
  source:         ['source', 'lead source', 'client source', 'referral source', 'channel'],
  campaignSource: ['campaign source', 'utm source', 'campaign id'],
  notes:          ['notes', 'remarks', 'comments', 'description', 'mail content', 'message', 'content', 'note'],
};

// Fields that must be mapped before an import can proceed. Everything else is
// optional: a sheet with just a client name and a department is importable.
const REQUIRED_FIELDS = ['name'];

const canonical = (header) => String(header || '')
  .trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

/**
 * Returns { field: header | null }. A header is claimed by at most one field, so
 * "Contact Email" cannot satisfy both `email` and `contactPerson`.
 */
function detectColumns(headers) {
  const available = headers.map((h) => ({ raw: h, key: canonical(h) }));
  const taken = new Set();
  const mapping = Object.fromEntries(Object.keys(COLUMN_ALIASES).map((f) => [f, null]));

  // Pass 1: exact alias match.
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const hit = available.find((h) => h.key === alias && !taken.has(h.raw));
      if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); break; }
    }
  }
  // Pass 2: partial match for still-unmapped fields ("Client e-mail id").
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (mapping[field]) continue;
    const hit = available.find((h) => !taken.has(h.raw) && aliases.some((a) => h.key.includes(a)));
    if (hit) { mapping[field] = hit.raw; taken.add(hit.raw); }
  }
  return mapping;
}

/**
 * A field the caller never mentioned falls back to detection, but a field the
 * caller explicitly cleared ('' or null) was deliberately unmapped and stays so.
 * Falling back there would silently re-add a column the operator just removed.
 */
const resolveMapping = (requested, detected) => Object.fromEntries(
  Object.keys(COLUMN_ALIASES).map((field) => [
    field,
    requested && Object.prototype.hasOwnProperty.call(requested, field)
      ? (requested[field] || null)
      : detected[field],
  ])
);

// ── Parsing ─────────────────────────────────────────────────────────────────
// One code path for CSV and Excel: xlsx reads both from a buffer, so there is no
// separate CSV branch to drift out of sync.
function parseWorkbook(buffer, { sheet } = {}) {
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  } catch {
    fail(400, 'That file could not be read. Please check it is a valid CSV, XLSX or XLS file.');
  }
  if (!workbook.SheetNames?.length) fail(400, 'The file contains no worksheets.');

  // An explicitly chosen sheet must exist — silently falling back to the first
  // sheet would import data the operator did not select.
  if (sheet && !workbook.SheetNames.includes(sheet)) {
    fail(422, `The file has no worksheet named "${sheet}".`);
  }
  const sheetName = sheet || workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });

  if (!rows.length) fail(400, `The worksheet "${sheetName}" contains no data rows.`);
  if (rows.length > MAX_ROWS) {
    fail(400, `The file has ${rows.length.toLocaleString('en-IN')} rows; the limit is ${MAX_ROWS.toLocaleString('en-IN')}.`);
  }
  // Headers are unioned across rows: xlsx omits trailing empty cells, so row 1
  // alone can under-report the real column set.
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(Boolean);
  if (!headers.length) fail(400, 'The first row must contain column headers.');

  return { rows, headers, sheetName, sheetNames: workbook.SheetNames };
}

// ── Value normalisation ─────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEPT_SYNONYMS = {
  media: 'media', 'media dept': 'media', 'media department': 'media', creative: 'media', production: 'media',
  marketing: 'marketing', 'marketing dept': 'marketing', 'marketing department': 'marketing', growth: 'marketing', digital: 'marketing',
  both: 'both', shared: 'both', 'media & marketing': 'both', 'media and marketing': 'both', all: 'both',
};

/** Returns a valid department, or null when the cell says nothing we recognise. */
const normalizeDepartment = (raw) => {
  const key = canonical(raw);
  if (!key) return null;
  return DEPT_SYNONYMS[key] || (['media', 'marketing', 'both'].includes(key) ? key : null);
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const normalizePriority = (raw) => {
  const key = canonical(raw);
  if (!key) return null;
  if (PRIORITIES.includes(key)) return key;
  if (['critical', 'highest', 'p1'].includes(key)) return 'urgent';
  if (['p2'].includes(key)) return 'high';
  if (['normal', 'standard', 'p3'].includes(key)) return 'medium';
  if (['minor', 'p4'].includes(key)) return 'low';
  return null;
};

/** A cell holding a link, not a number — these turn up in phone columns. */
const looksLikeUrl = (text) => /^(https?:\/\/|www\.)/i.test(text);

/**
 * Excel often stores phone numbers as floats ("9.19876e+11"); keep the digits.
 * Stray quotes and the apostrophe Excel uses to force a leading zero are
 * stripped, so '"09292927892' is stored as a dialable number.
 */
const normalizePhone = (raw) => {
  const text = String(raw ?? '').trim().replace(/^['"]+|["]+$/g, '').trim();
  if (!text) return '';
  if (/e\+/i.test(text) && Number.isFinite(Number(text))) return Number(text).toFixed(0);
  // A cell with no digits at all is not a phone number; reporting it beats
  // storing a truncated URL that nobody can dial.
  if (!/\d/.test(text) || looksLikeUrl(text)) return '';
  return text.slice(0, 60);
};

/**
 * Dedupe key for a client name. Social sheets list the same creator as
 * "@handle" on one row and "handle" on the next; treating those as two clients
 * would import the same person twice, so the key strips the leading @ and
 * collapses the separators handles are written with inconsistently.
 */
const dedupeName = (name) => String(name || '')
  .trim().toLowerCase().replace(/^@+/, '').replace(/[\s._-]+/g, '');

const normalizeWebsite = (raw) => {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

// ── Validation ──────────────────────────────────────────────────────────────
/**
 * Turns parsed rows into importable records plus a row-level issue list.
 *
 * `statusNames` is the set of configured pipeline stages. A status the pipeline
 * does not define is flagged rather than written, so an import cannot invent
 * stages that no board column will ever show.
 */
function validateRows(rows, mapping, { fallbackDepartment, statusNames = [], defaultStatus }) {
  if (!mapping?.name) fail(422, 'Map a Client Name column before continuing.');

  const knownStatuses = new Map(statusNames.map((s) => [canonical(s), s]));
  const seen = new Map();
  const records = [];
  const issues = [];
  let duplicates = 0;

  const cell = (row, field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');

  rows.forEach((row, index) => {
    // +2: one for the header row, one because spreadsheet rows are 1-indexed.
    const rowNumber = index + 2;
    const rowIssues = [];

    // Pasted cells carry runs of padding spaces and line breaks; collapsing them
    // keeps the name readable in the CRM and keeps dedupe honest.
    const name = cell(row, 'name').replace(/\s+/g, ' ').trim();
    if (!name) rowIssues.push('Client name is empty');

    const email = cell(row, 'email').toLowerCase();
    if (email && !EMAIL_RE.test(email)) rowIssues.push('Email is not a valid address');

    // An unreadable department falls back to the operator's choice for the whole
    // import — an explicit, visible default, not a silent guess.
    const rawDept = cell(row, 'department');
    let department = normalizeDepartment(rawDept);
    if (rawDept && !department) {
      rowIssues.push(`Department "${rawDept}" not recognised — using "${fallbackDepartment}"`);
    }
    if (!department) department = fallbackDepartment;

    const rawStatus = cell(row, 'status');
    let status = defaultStatus;
    if (rawStatus) {
      const matched = knownStatuses.get(canonical(rawStatus));
      if (matched) status = matched;
      else rowIssues.push(`Status "${rawStatus}" is not a configured stage — using "${defaultStatus}"`);
    }

    const rawPriority = cell(row, 'priority');
    let priority = 'medium';
    if (rawPriority) {
      const matched = normalizePriority(rawPriority);
      if (matched) priority = matched;
      else rowIssues.push(`Priority "${rawPriority}" not recognised — using "medium"`);
    }

    // A link pasted into the phone column is still useful data, so it is moved
    // to the website field rather than dropped — but only into an empty one, so
    // a real website is never overwritten by a stray cell.
    const rawPhone = mapping.phone ? String(row[mapping.phone] ?? '').trim() : '';
    const phone = normalizePhone(rawPhone);
    let website = normalizeWebsite(cell(row, 'website'));
    if (rawPhone && !phone) {
      if (looksLikeUrl(rawPhone) && !website) website = normalizeWebsite(rawPhone);
      else rowIssues.push(`Phone "${rawPhone.slice(0, 40)}" is not a usable number — left blank`);
    }

    const candidate = {
      name,
      contactPerson:  cell(row, 'contactPerson'),
      email,
      phone,
      website,
      address:        cell(row, 'address'),
      department,
      status,
      priority,
      source:         cell(row, 'source'),
      campaignSource: cell(row, 'campaignSource'),
      notes:          cell(row, 'notes'),
      // Free-text project label from the sheet. The authoritative link is the
      // Project id chosen at commit; this records what the file itself said.
      relatedProject: cell(row, 'projectName'),
      _row: rowNumber,
    };

    // Dedupe within the file. Two records collide when the normalised names
    // match AND their emails do not contradict each other: a blank email cannot
    // contradict anything, so the row that finally supplies an address merges
    // into the earlier bare one, while two genuinely different addresses under
    // one company name stay apart as two real branches.
    const key = dedupeName(name);
    const bucket = name ? (seen.get(key) || []) : [];
    const firstIndex = bucket.find((i) => !email || !records[i].email || records[i].email === email);
    const isDuplicate = firstIndex !== undefined;

    if (isDuplicate) {
      // Merge, do not discard. Repeat rows in these sheets are usually the same
      // creator captured again with *more* detail — one row carries the email,
      // a later one the phone or status. Dropping the later rows silently threw
      // that away, so each blank field on the kept record is filled from the
      // duplicate and the row numbers are recorded for the operator.
      const kept = records[firstIndex];
      const filled = [];
      for (const field of ['contactPerson', 'email', 'phone', 'website', 'address', 'source', 'campaignSource', 'relatedProject']) {
        if (!kept[field] && candidate[field]) { kept[field] = candidate[field]; filled.push(field); }
      }
      // Notes accumulate rather than overwrite: two rows can carry two genuinely
      // different remarks about the same creator.
      if (candidate.notes && !String(kept.notes || '').includes(candidate.notes)) {
        kept.notes = kept.notes ? `${kept.notes}\n${candidate.notes}` : candidate.notes;
        filled.push('notes');
      }
      // A row that names a real pipeline stage beats the default the kept row fell back to.
      if (rawStatus && status !== defaultStatus && kept.status === defaultStatus) {
        kept.status = status; filled.push('status');
      }
      kept._mergedRows.push(rowNumber);

      duplicates += 1;
      rowIssues.push(
        filled.length
          ? `Duplicate of row ${kept._row} — merged, filling ${filled.join(', ')}`
          : `Duplicate of row ${kept._row} — merged, no new details`
      );
    } else if (name) {
      candidate._mergedRows = [];
      bucket.push(records.length);
      seen.set(key, bucket);
      records.push(candidate);
    }

    if (rowIssues.length) {
      issues.push({ row: rowNumber, name: name || '—', email: email || '—', issues: rowIssues });
    }
  });

  const byDepartment = records.reduce((acc, r) => {
    acc[r.department] = (acc[r.department] || 0) + 1;
    return acc;
  }, {});

  return {
    summary: {
      total: rows.length,
      valid: records.length,
      needsAttention: issues.length,
      duplicates,
      // Duplicates are merged into a kept record, so they are not skipped. The
      // only rows that reach nothing are those with no client name at all.
      merged: duplicates,
      skipped: rows.length - records.length - duplicates,
      byDepartment,
    },
    issues: issues.slice(0, MAX_ISSUES),
    issuesTruncated: Math.max(0, issues.length - MAX_ISSUES),
    records,
  };
}

/** The stage new clients land in, and the set of stages an import may reference. */
async function loadPipeline(department) {
  const filter = { isActive: true };
  if (department && department !== 'both') {
    filter.department = { $in: [department, 'shared'] };
  }
  const statuses = await CRMStatus.find(filter).sort({ order: 1 }).select('name isDefault').lean();
  const names = statuses.map((s) => s.name);
  const defaultStatus = statuses.find((s) => s.isDefault)?.name || names[0] || 'New Enquiry';
  return { names, defaultStatus };
}

// ── Public operations ───────────────────────────────────────────────────────

/** Phase 1: read the file and report what we found. Writes nothing. */
async function analyzeFile({ buffer, filename, mapping, sheet, department = 'media' }) {
  const parsed = parseWorkbook(buffer, { sheet });
  const detected = detectColumns(parsed.headers);
  const effective = resolveMapping(mapping, detected);

  const missing = REQUIRED_FIELDS.filter((f) => !effective[f]);
  const result = {
    file: {
      name: filename,
      rows: parsed.rows.length,
      sheetName: parsed.sheetName,
      sheetNames: parsed.sheetNames,
    },
    headers: parsed.headers,
    detected,
    mapping: effective,
    autoMatched: Object.fromEntries(Object.entries(detected).map(([k, v]) => [k, Boolean(v)])),
    required: REQUIRED_FIELDS,
    missingRequired: missing,
    ready: missing.length === 0,
  };
  if (missing.length) return result;

  const { names, defaultStatus } = await loadPipeline(department);
  const validation = validateRows(parsed.rows, effective, {
    fallbackDepartment: department === 'all' ? 'media' : department,
    statusNames: names,
    defaultStatus,
  });

  return {
    ...result,
    defaultStatus,
    summary: validation.summary,
    issues: validation.issues,
    issuesTruncated: validation.issuesTruncated,
    preview: validation.records.slice(0, PREVIEW_ROWS)
      .map(({ _row, _mergedRows, ...r }) => ({ row: _row, mergedRows: _mergedRows || [], ...r })),
  };
}

/**
 * Phase 2: persist, scoped to one project.
 *
 * `mode` decides what happens when a client already exists in this project:
 *   'skip'   — leave the existing record untouched (default; non-destructive)
 *   'update' — fill in fields the sheet provides, leaving blanks alone
 */
async function commitImport({ buffer, filename, mapping, sheet, projectId, department = 'media', mode = 'skip', actorId }) {
  if (!projectId) fail(422, 'Select a project before importing CRM data.');
  if (!mongoose.isValidObjectId(projectId)) fail(422, 'Invalid project.');
  const project = await Project.findById(projectId).select('_id name').lean();
  if (!project) fail(404, 'Project not found.');
  if (!['skip', 'update'].includes(mode)) fail(422, 'Unknown import mode.');

  const effectiveDept = department === 'all' ? 'media' : department;
  if (!['media', 'marketing', 'both'].includes(effectiveDept)) fail(422, 'Unknown department.');

  const parsed = parseWorkbook(buffer, { sheet });
  const effective = resolveMapping(mapping, detectColumns(parsed.headers));
  const { names, defaultStatus } = await loadPipeline(effectiveDept);
  const validation = validateRows(parsed.rows, effective, {
    fallbackDepartment: effectiveDept,
    statusNames: names,
    defaultStatus,
  });

  if (!validation.records.length) {
    fail(422, 'No importable rows were found. Every row is missing a client name, or is a duplicate.');
  }

  const batchId = crypto.randomUUID();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failures = [];

  for (const { _row, _mergedRows, ...record } of validation.records) {
    try {
      // Match within the project only: the same client name under two projects
      // is two separate relationships, not a collision.
      const existing = await CRMClient.findOne({
        project: project._id,
        isActive: true,
        ...(record.email
          ? { $or: [{ email: record.email }, { name: record.name }] }
          : { name: record.name }),
      }).select('_id').lean();

      if (existing) {
        if (mode === 'update') {
          // Only non-empty cells are written, so a sparse sheet cannot blank out
          // details already captured in the CRM.
          const patch = Object.fromEntries(
            Object.entries(record).filter(([, v]) => v !== '' && v !== null && v !== undefined)
          );
          await CRMClient.updateOne({ _id: existing._id }, { $set: patch });
          updated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      // save(), not insertMany(): CRMClient generates clientId in a pre-save hook,
      // which insertMany would bypass, leaving every imported client without an ID.
      await new CRMClient({
        ...record,
        project: project._id,
        importBatch: batchId,
        importedAt: new Date(),
        createdBy: actorId || null,
        statusHistory: [{ toStatus: record.status, changedBy: actorId || null, reason: `Imported from ${filename || 'spreadsheet'}` }],
      }).save();
      created += 1;
    } catch (err) {
      failures.push({ row: _row, name: record.name, error: err.message });
    }
  }

  await CRMImportBatch.create({
    batchId,
    fileName: String(filename || '').slice(0, 300),
    project: project._id,
    projectName: project.name,
    department: effectiveDept,
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
    department: effectiveDept,
    created, updated, skipped,
    failed: failures.length,
    failures: failures.slice(0, MAX_ISSUES),
    ...validation.summary,
  };
}

/**
 * Undo a batch. Only records the batch created are removed — rows it merely
 * updated are left in place, because their pre-import state was not captured and
 * deleting them would destroy data the import did not create.
 */
async function revertBatch({ batchId, actorId }) {
  // Scoped to client batches: an influencer batch id must not resolve here, or
  // the revert would mark it done having deleted none of its rows.
  const batch = await CRMImportBatch.findOne({ batchId, entity: { $ne: 'influencer' } });
  if (!batch) fail(404, 'Import batch not found.');
  if (batch.revertedAt) fail(409, 'That import has already been reverted.');

  const res = await CRMClient.deleteMany({ importBatch: batchId });
  batch.revertedAt = new Date();
  batch.revertedBy = actorId || null;
  await batch.save();

  return { batchId, removed: res.deletedCount || 0, updatedLeftInPlace: batch.updated };
}

/** Import history, newest first — optionally for one project. */
async function listBatches({ projectId, limit = 25 } = {}) {
  // Client history only. Influencer imports keep their own history, so a mixed
  // list would offer an undo that silently targets the wrong collection.
  const filter = { entity: { $ne: 'influencer' } };
  if (projectId && mongoose.isValidObjectId(projectId)) filter.project = projectId;
  return CRMImportBatch.find(filter)
    .populate('importedBy', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 25, 100))
    .lean();
}

/**
 * The project-wise rollup this feature exists to produce: one row per project
 * with its CRM totals, split by department and pipeline stage.
 */
async function getProjectBreakdown({ department } = {}) {
  const match = { isActive: true };
  if (department && department !== 'all') {
    match.department = { $in: [department, 'both'] };
  }

  const rows = await CRMClient.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$project',
        total:        { $sum: 1 },
        media:        { $sum: { $cond: [{ $eq: ['$department', 'media'] }, 1, 0] } },
        marketing:    { $sum: { $cond: [{ $eq: ['$department', 'marketing'] }, 1, 0] } },
        both:         { $sum: { $cond: [{ $eq: ['$department', 'both'] }, 1, 0] } },
        imported:     { $sum: { $cond: [{ $ifNull: ['$importBatch', false] }, 1, 0] } },
        overdue:      { $sum: { $cond: [{ $and: [{ $ifNull: ['$nextFollowUpAt', false] }, { $lt: ['$nextFollowUpAt', new Date()] }] }, 1, 0] } },
        lastActivity: { $max: '$updatedAt' },
        stages:       { $push: '$status' },
      },
    },
    { $sort: { total: -1 } },
    { $limit: 200 },
    {
      $lookup: {
        from: 'projects', localField: '_id', foreignField: '_id',
        pipeline: [{ $project: { name: 1, projectCode: 1, status: 1, themeColor: 1 } }],
        as: 'projectDoc',
      },
    },
  ]);

  return rows.map((r) => {
    const stageCounts = r.stages.reduce((acc, s) => {
      const key = s || 'Unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const doc = r.projectDoc?.[0];
    return {
      projectId:   r._id ? String(r._id) : null,
      // Clients created before project linkage existed group under this bucket
      // rather than being dropped from the rollup.
      projectName: doc?.name || (r._id ? 'Unknown project' : 'Unassigned'),
      projectCode: doc?.projectCode || null,
      themeColor:  doc?.themeColor || null,
      total: r.total,
      media: r.media,
      marketing: r.marketing,
      both: r.both,
      imported: r.imported,
      overdue: r.overdue,
      lastActivity: r.lastActivity,
      stages: Object.entries(stageCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
}

/** A downloadable .xlsx whose headers are exactly what detection expects. */
function buildTemplate() {
  const headers = [
    'Client Name', 'Contact Person', 'Email', 'Phone', 'Website', 'Address',
    'Department', 'Status', 'Priority', 'Project Name', 'Source', 'Campaign Source', 'Notes',
  ];
  const example = [{
    'Client Name': 'Acme Media Ltd',
    'Contact Person': 'Ravi Menon',
    Email: 'ravi@acmemedia.example',
    Phone: '+91 98200 11122',
    Website: 'acmemedia.example',
    Address: 'Bandra West, Mumbai',
    Department: 'Media',
    Status: 'New Enquiry',
    Priority: 'High',
    'Project Name': 'Brand Refresh 2026',
    Source: 'Referral',
    'Campaign Source': 'Q4 Brand Push',
    Notes: 'Replace this example row with your own data.',
  }];

  const sheet = XLSX.utils.json_to_sheet(example, { header: headers });
  sheet['!cols'] = headers.map((h) => ({ wch: Math.max(16, h.length + 4) }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'CRM Clients');
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  analyzeFile,
  commitImport,
  revertBatch,
  listBatches,
  getProjectBreakdown,
  buildTemplate,
  // exported for tests
  detectColumns,
  validateRows,
  parseWorkbook,
  normalizeDepartment,
  normalizePriority,
  COLUMN_ALIASES,
};
