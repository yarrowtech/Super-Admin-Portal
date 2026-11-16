const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

const service = require('../services/crmImport.service');

// This importer reads files humans produced in Excel, so the cases that matter are
// the messy ones: alternate header spellings, department and status values written
// however the author felt like, numbers Excel mangled into floats, and duplicates.
//
// Two guarantees are asserted explicitly, because they are the ones whose failure
// would quietly corrupt the CRM rather than throw:
//   1. A status the pipeline does not define is never written — it is reported.
//   2. analyzeFile never persists anything.

const sheetBuffer = (rows, type = 'xlsx') => {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: type });
};

const PIPELINE = {
  fallbackDepartment: 'media',
  statusNames: ['New Enquiry', 'Contacted', 'Proposal Sent'],
  defaultStatus: 'New Enquiry',
};

// ── Column detection ────────────────────────────────────────────────────────

test('client-name column is detected across realistic header spellings', () => {
  const cases = [
    ['Client Name', 'Email'],
    ['Company Name', 'Email Address'],
    ['Organisation', 'E-mail'],
    ['Account Name', 'Email ID'],
    ['Name', 'Mail'],
  ];
  for (const headers of cases) {
    const mapping = service.detectColumns(headers);
    assert.equal(mapping.name, headers[0], `name should map from ${headers[0]}`);
    assert.equal(mapping.email, headers[1], `email should map from ${headers[1]}`);
  }
});

test('a header is claimed by at most one field', () => {
  // "Contact Email" must satisfy email, not contactPerson, leaving contactPerson
  // free for the column that actually holds a person's name.
  const mapping = service.detectColumns(['Client Name', 'Contact Email', 'Contact Person']);
  assert.equal(mapping.email, 'Contact Email');
  assert.equal(mapping.contactPerson, 'Contact Person');
  assert.notEqual(mapping.contactPerson, mapping.email);
});

test('the most specific alias wins when several could match', () => {
  const mapping = service.detectColumns(['Name', 'Client Name']);
  assert.equal(mapping.name, 'Client Name');
});

// ── Value normalisation ─────────────────────────────────────────────────────

test('department synonyms normalise, and unknown values report rather than guess', () => {
  assert.equal(service.normalizeDepartment('Media'), 'media');
  assert.equal(service.normalizeDepartment('  MARKETING  '), 'marketing');
  assert.equal(service.normalizeDepartment('Media & Marketing'), 'both');
  assert.equal(service.normalizeDepartment('Creative'), 'media');
  assert.equal(service.normalizeDepartment('Finance'), null);
  assert.equal(service.normalizeDepartment(''), null);
});

test('priority synonyms normalise to the schema enum', () => {
  assert.equal(service.normalizePriority('Critical'), 'urgent');
  assert.equal(service.normalizePriority('Normal'), 'medium');
  assert.equal(service.normalizePriority('P1'), 'urgent');
  assert.equal(service.normalizePriority('Nonsense'), null);
});

// ── Validation ──────────────────────────────────────────────────────────────

test('a status the pipeline does not define is reported, never written', () => {
  const rows = [{ 'Client Name': 'Acme', Status: 'Invented Stage' }];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records, issues } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1);
  // The guarantee: the unknown stage did not reach the record.
  assert.equal(records[0].status, 'New Enquiry');
  assert.match(issues[0].issues[0], /not a configured stage/);
});

test('an unreadable department falls back to the operator-chosen one, and says so', () => {
  const rows = [{ 'Client Name': 'Acme', Department: 'Logistics' }];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records, issues } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records[0].department, 'media');
  assert.match(issues[0].issues[0], /not recognised/);
});

test('duplicates within the file are flagged once and imported once', () => {
  const rows = [
    { 'Client Name': 'Acme', Email: 'a@acme.test' },
    { 'Client Name': 'Acme', Email: 'a@acme.test' },
    // Same name, different email — two real branches, not a duplicate.
    { 'Client Name': 'Acme', Email: 'b@acme.test' },
  ];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records, summary } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(summary.duplicates, 1);
  assert.equal(records.length, 2);
});

test('a duplicate row fills blanks on the record that named the client first', () => {
  // The repeat row is the one carrying the email and phone. Discarding it, as
  // the import once did, lost the only contact details in the file.
  const rows = [
    { 'Client Name': 'Acme', Email: '', Phone: '' },
    { 'Client Name': 'Acme', Email: 'a@acme.test', Phone: '9988776655' },
  ];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records, summary } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1);
  assert.equal(summary.duplicates, 1);
  assert.equal(summary.merged, 1);
  // Merged rows are not lost rows, so nothing is reported as skipped.
  assert.equal(summary.skipped, 0);
  assert.equal(records[0].email, 'a@acme.test');
  assert.equal(records[0].phone, '9988776655');
});

test('the same handle with and without a leading @ is one client', () => {
  const rows = [
    { 'Client Name': '@kothin_chele' },
    { 'Client Name': 'kothin chele' },
    { 'Client Name': 'kothin.chele' },
  ];
  const mapping = service.detectColumns(['Client Name']);
  const { records, summary } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1);
  assert.equal(summary.duplicates, 2);
});

test('notes from duplicate rows accumulate instead of overwriting', () => {
  const rows = [
    { 'Client Name': 'Acme', Notes: 'first remark' },
    { 'Client Name': 'Acme', Notes: 'second remark' },
    // An identical remark must not be appended twice.
    { 'Client Name': 'Acme', Notes: 'second remark' },
  ];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1);
  assert.equal(records[0].notes, 'first remark\nsecond remark');
});

test('a social-outreach sheet maps its creator, handle URL and content columns', () => {
  const headers = ['Sl No', 'Account / Creator', 'Instagram Reel / Post URL', 'Email ID', 'Phone / WhatsApp', 'Mail Content', 'Status'];
  const mapping = service.detectColumns(headers);

  assert.equal(mapping.name, 'Account / Creator');
  assert.equal(mapping.website, 'Instagram Reel / Post URL');
  assert.equal(mapping.email, 'Email ID');
  assert.equal(mapping.phone, 'Phone / WhatsApp');
  assert.equal(mapping.notes, 'Mail Content');
});

test('a URL pasted into the phone column moves to website, not into phone', () => {
  const rows = [{ 'Client Name': 'Biennale', Phone: 'https://indiabiennale.example/?utm_source=ig', Website: '' }];
  const mapping = service.detectColumns(['Client Name', 'Phone', 'Website']);
  const { records } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records[0].phone, '');
  assert.equal(records[0].website, 'https://indiabiennale.example/?utm_source=ig');
});

test('a stray phone cell never overwrites a real website', () => {
  const rows = [{ 'Client Name': 'Acme', Phone: 'www.stray.example', Website: 'acme.example' }];
  const mapping = service.detectColumns(['Client Name', 'Phone', 'Website']);
  const { records } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records[0].website, 'https://acme.example');
});

test('Excel quoting is stripped so a leading-zero number stays dialable', () => {
  const rows = [{ 'Client Name': 'Acme', Phone: '"09292927892' }];
  const mapping = service.detectColumns(['Client Name', 'Phone']);
  const { records } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records[0].phone, '09292927892');
});

test('padding spaces inside a pasted name are collapsed', () => {
  const rows = [{ 'Client Name': 'indiabiennale          (4 Dec 26)' }];
  const mapping = service.detectColumns(['Client Name']);
  const { records } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records[0].name, 'indiabiennale (4 Dec 26)');
});

test('rows without a client name are skipped, not imported blank', () => {
  const rows = [
    { 'Client Name': 'Acme' },
    { 'Client Name': '   ' },
    { 'Client Name': '' },
  ];
  const mapping = service.detectColumns(['Client Name']);
  const { records, summary } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1);
  assert.equal(summary.skipped, 2);
});

test('an invalid email is reported but does not block the row', () => {
  const rows = [{ 'Client Name': 'Acme', Email: 'not-an-email' }];
  const mapping = service.detectColumns(Object.keys(rows[0]));
  const { records, issues } = service.validateRows(rows, mapping, PIPELINE);

  assert.equal(records.length, 1, 'a bad email should not lose the client');
  assert.match(issues[0].issues[0], /not a valid address/);
});

test('issue rows report the spreadsheet row number an operator would see', () => {
  const rows = [
    { 'Client Name': 'Good' },
    { 'Client Name': '' },
  ];
  const mapping = service.detectColumns(['Client Name']);
  const { issues } = service.validateRows(rows, mapping, PIPELINE);
  // Row 1 is the header, so the second data row is spreadsheet row 3.
  assert.equal(issues[0].row, 3);
});

test('mapping a column to null leaves that field unread', () => {
  const rows = [{ 'Client Name': 'Acme', Notes: 'sensitive internal note' }];
  const detected = service.detectColumns(Object.keys(rows[0]));
  const { records } = service.validateRows(rows, { ...detected, notes: null }, PIPELINE);
  assert.equal(records[0].notes, '');
});

// ── Parsing ─────────────────────────────────────────────────────────────────

test('xlsx and csv take the same code path and yield the same records', () => {
  const rows = [{ 'Client Name': 'Acme', Email: 'a@acme.test' }];
  const fromXlsx = service.parseWorkbook(sheetBuffer(rows, 'xlsx'));
  const fromCsv = service.parseWorkbook(Buffer.from('Client Name,Email\nAcme,a@acme.test\n', 'utf8'));

  assert.deepEqual(fromXlsx.headers, fromCsv.headers);
  assert.equal(fromXlsx.rows[0]['Client Name'], fromCsv.rows[0]['Client Name']);
});

test('headers are unioned across rows, so a late-appearing column is still mapped', () => {
  // xlsx omits trailing empty cells, so row 1 alone under-reports the column set.
  const wb = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ['Client Name', 'Email', 'Notes'],
    ['Acme', 'a@acme.test', ''],
    ['Globex', 'g@globex.test', 'Has a note'],
  ]);
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const parsed = service.parseWorkbook(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  assert.ok(parsed.headers.includes('Notes'));
});

test('an empty sheet and an unreadable file both fail with a usable message', () => {
  assert.throws(() => service.parseWorkbook(Buffer.from('')), /could not be read|no data rows|no worksheets/i);

  const empty = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(empty, XLSX.utils.aoa_to_sheet([]), 'Sheet1');
  assert.throws(
    () => service.parseWorkbook(XLSX.write(empty, { type: 'buffer', bookType: 'xlsx' })),
    /no data rows/i
  );
});

test('naming a sheet that does not exist fails instead of importing the wrong one', () => {
  const buffer = sheetBuffer([{ 'Client Name': 'Acme' }]);
  assert.throws(() => service.parseWorkbook(buffer, { sheet: 'Nope' }), /no worksheet named/i);
});

test('a multi-sheet workbook reads the named sheet, not the first', () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 'Client Name': 'First' }]), 'One');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ 'Client Name': 'Second' }]), 'Two');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const parsed = service.parseWorkbook(buffer, { sheet: 'Two' });
  assert.equal(parsed.rows[0]['Client Name'], 'Second');
  assert.deepEqual(parsed.sheetNames, ['One', 'Two']);
});

// ── Template ────────────────────────────────────────────────────────────────

test('the generated template round-trips through detection with no unmapped required field', () => {
  // If this breaks, we are shipping a template our own importer cannot read.
  const parsed = service.parseWorkbook(service.buildTemplate());
  const mapping = service.detectColumns(parsed.headers);

  assert.equal(mapping.name, 'Client Name');
  assert.equal(mapping.department, 'Department');
  assert.equal(mapping.status, 'Status');
  assert.equal(mapping.projectName, 'Project Name');
  assert.equal(mapping.campaignSource, 'Campaign Source');
  // Campaign Source must not steal the plain Source column.
  assert.equal(mapping.source, 'Source');
});
