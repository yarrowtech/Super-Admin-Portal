const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

const service = require('../services/crmExport.service');

// An export is a file someone opens in Excel and then acts on, so the cases that
// matter are the ones that corrupt a cell silently rather than throw: a comma or
// a quote inside a value, a name that looks like a regex when it reaches the
// filter, and a populated ref that must read as a name rather than an ObjectId.

const { toCsv, toXlsx, buildClientFilter, CLIENT_COLUMNS } = service;

const COLS = [
  { header: 'Name', get: (r) => r.name },
  { header: 'Note', get: (r) => r.note },
];

// ── CSV quoting ─────────────────────────────────────────────────────────────

test('a value containing a comma stays one cell', () => {
  const csv = toCsv(COLS, [{ name: 'Acme, Ltd', note: 'ok' }]).toString('utf8');
  const line = csv.split('\r\n')[1];
  assert.equal(line, '"Acme, Ltd","ok"');
});

test('a double quote inside a value is escaped, not terminated', () => {
  const csv = toCsv(COLS, [{ name: 'The "Big" Co', note: '' }]).toString('utf8');
  assert.match(csv, /"The ""Big"" Co"/);
});

test('a newline inside a value does not break the row apart', () => {
  const csv = toCsv(COLS, [{ name: 'Multi\nLine', note: 'x' }]).toString('utf8');
  // Still exactly one header row and one data row, as RFC-4180 quoting intends.
  assert.equal(csv.split('\r\n').length, 2);
});

test('null and undefined export as empty, never the string "null"', () => {
  const csv = toCsv(COLS, [{ name: null, note: undefined }]).toString('utf8');
  assert.equal(csv.split('\r\n')[1], '"",""');
});

test('the file starts with a BOM so Excel reads it as UTF-8', () => {
  const csv = toCsv(COLS, [{ name: 'Zoë', note: '' }]).toString('utf8');
  assert.ok(csv.startsWith('﻿'), 'expected a leading byte-order mark');
  assert.match(csv, /Zoë/);
});

// ── XLSX ────────────────────────────────────────────────────────────────────

test('the workbook round-trips with its header row and values intact', () => {
  const buf = toXlsx(COLS, [{ name: 'Acme', note: 'first' }, { name: 'Beta', note: 'second' }]);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Name, 'Acme');
  assert.equal(rows[1].Note, 'second');
});

test('a sheet name Excel would reject is sanitised rather than thrown', () => {
  const buf = toXlsx(COLS, [{ name: 'x', note: 'y' }], 'Q4: Brand/Push [2026]');
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  assert.ok(sheetName.length <= 31);
  assert.ok(!/[[\]:*?/\\]/.test(sheetName), `sheet name still illegal: ${sheetName}`);
});

// ── Filter construction ─────────────────────────────────────────────────────

test('a search term with regex characters is escaped, not interpreted', () => {
  const filter = buildClientFilter({ search: 'A+B (new)' });
  const pattern = filter.$or[0].name.$regex;
  // Must match the literal text rather than acting as a quantifier/group.
  assert.ok(new RegExp(pattern, 'i').test('A+B (new) Ltd'));
  assert.ok(!new RegExp(pattern, 'i').test('AAAB new'));
});

test('a single department also returns records shared with it', () => {
  const filter = buildClientFilter({ department: 'media' });
  assert.deepEqual(filter.department, { $in: ['media', 'both'] });
});

test("department 'all' applies no department constraint", () => {
  assert.equal(buildClientFilter({ department: 'all' }).department, undefined);
});

test("projectId 'unassigned' selects records with no project, not a literal id", () => {
  assert.equal(buildClientFilter({ projectId: 'unassigned' }).project, null);
});

test('an invalid projectId is ignored rather than throwing a cast error', () => {
  assert.equal(buildClientFilter({ projectId: 'not-an-id' }).project, undefined);
});

test('an export always excludes archived clients', () => {
  assert.equal(buildClientFilter({}).isActive, true);
});

// ── Column contract ─────────────────────────────────────────────────────────

test('populated refs export as readable names, not ids', () => {
  const owner = CLIENT_COLUMNS.find((c) => c.header === 'Owner');
  const project = CLIENT_COLUMNS.find((c) => c.header === 'Project');
  assert.equal(owner.get({ owner: { firstName: 'Ravi', lastName: 'Menon' } }), 'Ravi Menon');
  assert.equal(project.get({ project: { name: 'Brand Refresh' } }), 'Brand Refresh');
});

test('an unpopulated ref exports blank rather than an object', () => {
  const owner = CLIENT_COLUMNS.find((c) => c.header === 'Owner');
  assert.equal(owner.get({ owner: null }), '');
  assert.equal(owner.get({}), '');
});

test('every column produces a primitive for a completely empty record', () => {
  for (const col of CLIENT_COLUMNS) {
    const value = col.get({});
    assert.ok(
      value === '' || typeof value === 'string',
      `column "${col.header}" produced ${JSON.stringify(value)}`,
    );
  }
});

test('an unsupported format is rejected before any query runs', async () => {
  await assert.rejects(
    () => service.exportClients({ format: 'pdf' }),
    (err) => err.statusCode === 422,
  );
});
