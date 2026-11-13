'use strict';
/**
 * Server-side CRM export.
 *
 * The client-side CSV in the UI can only write the rows the browser already
 * holds — a page at a time, or whatever a second fetch could pull. Exporting a
 * real book of business means the server builds the file: it applies the same
 * filters the list uses, resolves the refs (owner, project) that the raw
 * documents only hold as ids, and streams back one complete sheet.
 *
 * CSV and XLSX share one row builder, so the two formats can never disagree
 * about which columns an export has or what a cell contains.
 */
const mongoose = require('mongoose');
const XLSX = require('xlsx');

const CRMClient = require('../models/crm/CRMClient');
const CRMFollowUp = require('../models/crm/CRMFollowUp');

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };

// Hard ceiling on an export. Without one, a filterless call would try to build a
// workbook from the entire collection in memory.
const MAX_EXPORT_ROWS = Number(process.env.CRM_EXPORT_MAX_ROWS || 20000);

const fmtDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const userName = (u) =>
  !u ? '' : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || '';

/**
 * The export's column contract: header text and how to read it off a document.
 * Declared once so CSV and XLSX stay identical and adding a column is one line.
 */
const CLIENT_COLUMNS = [
  { header: 'Client ID',       get: (c) => c.clientId || '' },
  { header: 'Client Name',     get: (c) => c.name || '' },
  { header: 'Contact Person',  get: (c) => c.contactPerson || '' },
  { header: 'Email',           get: (c) => c.email || '' },
  { header: 'Phone',           get: (c) => c.phone || '' },
  { header: 'Website',         get: (c) => c.website || '' },
  { header: 'Address',         get: (c) => c.address || '' },
  { header: 'Department',      get: (c) => c.department || '' },
  { header: 'Status',          get: (c) => c.status || '' },
  { header: 'Priority',        get: (c) => c.priority || '' },
  { header: 'Project',         get: (c) => c.project?.name || '' },
  { header: 'Project Code',    get: (c) => c.project?.projectCode || '' },
  { header: 'Owner',           get: (c) => userName(c.owner) },
  { header: 'Source',          get: (c) => c.source || '' },
  { header: 'Campaign Source', get: (c) => c.campaignSource || '' },
  { header: 'Marketing Channel', get: (c) => c.marketingChannel || '' },
  { header: 'Last Contacted',  get: (c) => fmtDate(c.lastContactedAt) },
  { header: 'Next Follow-up',  get: (c) => fmtDate(c.nextFollowUpAt) },
  { header: 'Imported',        get: (c) => (c.importBatch ? 'Yes' : 'No') },
  { header: 'Created',         get: (c) => fmtDate(c.createdAt) },
  { header: 'Notes',           get: (c) => c.notes || '' },
];

const FOLLOWUP_COLUMNS = [
  { header: 'Client',      get: (f) => f.client?.name || '' },
  { header: 'Client ID',   get: (f) => f.client?.clientId || '' },
  { header: 'Department',  get: (f) => f.department || '' },
  { header: 'Type',        get: (f) => f.type || '' },
  { header: 'Due Date',    get: (f) => fmtDate(f.dueDate) },
  { header: 'Status',      get: (f) => f.status || '' },
  { header: 'Priority',    get: (f) => f.priority || '' },
  { header: 'Assigned To', get: (f) => userName(f.assignedTo) },
  { header: 'Notes',       get: (f) => f.notes || '' },
  { header: 'Outcome',     get: (f) => f.outcome || '' },
  { header: 'Completed',   get: (f) => fmtDate(f.completedAt) },
];

/**
 * Builds the same client filter the list endpoint uses, so an export always
 * contains exactly the rows the operator was looking at when they clicked.
 * Kept in step with GET /clients by hand — a divergence here is a silent bug,
 * because the file would simply hold different rows than the screen.
 */
function buildClientFilter({ department, status, priority, search, projectId, importBatch }) {
  const filter = { isActive: true };
  if (department && department !== 'all') {
    filter.department = { $in: [department, 'both'] };
  }
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId === 'unassigned') filter.project = null;
  else if (projectId && mongoose.isValidObjectId(projectId)) filter.project = projectId;
  if (importBatch) filter.importBatch = importBatch;
  if (search) {
    // Escaped: a client search for "A+B" or "(new)" must not be read as a regex.
    const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { contactPerson: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { clientId: { $regex: safe, $options: 'i' } },
    ];
  }
  return filter;
}

/** CSV with RFC-4180 quoting, plus a BOM so Excel opens UTF-8 correctly. */
function toCsv(columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [
    columns.map((c) => esc(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.get(r))).join(',')),
  ].join('\r\n');
  return Buffer.from(`﻿${body}`, 'utf8');
}

function toXlsx(columns, rows, sheetName = 'Export') {
  const aoa = [
    columns.map((c) => c.header),
    ...rows.map((r) => columns.map((c) => c.get(r))),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!cols'] = columns.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));
  // Freeze the header so a long export stays readable while scrolling.
  sheet['!freeze'] = { xSplit: 0, ySplit: 1 };
  const book = XLSX.utils.book_new();
  // Excel rejects sheet names over 31 chars or containing []:*?/\
  XLSX.utils.book_append_sheet(book, sheet, sheetName.replace(/[[\]:*?/\\]/g, '').slice(0, 31));
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });
}

/** A filename-safe slug, so a project called "Q4: Brand/Push" cannot break the header. */
const slug = (s) =>
  String(s || 'export').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'export';

/**
 * Export clients as csv or xlsx.
 * Returns { buffer, filename, contentType } ready to send.
 */
async function exportClients({ format = 'csv', ...query } = {}) {
  if (!['csv', 'xlsx'].includes(format)) fail(422, 'Unsupported export format.');

  const filter = buildClientFilter(query);
  const total = await CRMClient.countDocuments(filter);
  if (total > MAX_EXPORT_ROWS) {
    fail(413, `That export is ${total} rows, over the ${MAX_EXPORT_ROWS} limit. Narrow the filters and try again.`);
  }

  const rows = await CRMClient.find(filter)
    .populate('owner', 'firstName lastName email')
    .populate('project', 'name projectCode')
    .sort({ name: 1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `crm-clients-${slug(query.department || 'all')}-${stamp}`;

  return format === 'xlsx'
    ? {
        buffer: toXlsx(CLIENT_COLUMNS, rows, 'CRM Clients'),
        filename: `${name}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    : {
        buffer: toCsv(CLIENT_COLUMNS, rows),
        filename: `${name}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
}

/** Export follow-ups, with the same filters the follow-up list accepts. */
async function exportFollowUps({ format = 'csv', department, status, assignedTo, overdue } = {}) {
  if (!['csv', 'xlsx'].includes(format)) fail(422, 'Unsupported export format.');

  const filter = {};
  if (department && department !== 'all') filter.department = department;
  if (assignedTo && mongoose.isValidObjectId(assignedTo)) filter.assignedTo = assignedTo;
  // Overdue is derived (pending + past due), never a stored status — same rule
  // the list endpoint applies, so the file matches the screen.
  if (overdue === 'true' || overdue === true || status === 'overdue') {
    filter.status = 'pending';
    filter.dueDate = { $lt: new Date() };
  } else if (status) {
    filter.status = status;
  }

  const rows = await CRMFollowUp.find(filter)
    .populate('client', 'name clientId')
    .populate('assignedTo', 'firstName lastName email')
    .sort({ dueDate: 1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `crm-followups-${slug(department || 'all')}-${stamp}`;

  return format === 'xlsx'
    ? {
        buffer: toXlsx(FOLLOWUP_COLUMNS, rows, 'Follow-ups'),
        filename: `${name}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }
    : {
        buffer: toCsv(FOLLOWUP_COLUMNS, rows),
        filename: `${name}.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
}

module.exports = {
  exportClients,
  exportFollowUps,
  // exported for tests
  buildClientFilter,
  toCsv,
  toXlsx,
  CLIENT_COLUMNS,
  FOLLOWUP_COLUMNS,
  MAX_EXPORT_ROWS,
};
