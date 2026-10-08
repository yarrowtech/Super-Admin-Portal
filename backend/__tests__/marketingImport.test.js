const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const service = require('../services/marketingImport.service');

// The import pipeline reads files a human produced, so the tests that matter are the ones
// covering messy input: alternate header spellings, free-text locations, duplicates, and
// rows that simply cannot be placed on a map. Two guarantees are asserted explicitly —
// nothing is ever given a fabricated coordinate, and no email reaches the map payload.

const sheetBuffer = (rows, type = 'xlsx') => {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: type });
};

const csvBuffer = (text) => Buffer.from(text, 'utf8');

// ── Column detection (§5) ───────────────────────────────────────────────────

test('columns are detected across the header spellings a real file might use', async () => {
  const cases = [
    ['School', 'Email', 'Location'],
    ['School Name', 'Email Address', 'Location Name'],
    ['Institution', 'E-mail', 'City'],
    ['Institution Name', 'Contact Email', 'Address'],
  ];
  for (const headers of cases) {
    const detected = service.detectColumns(headers);
    assert.equal(detected.school, headers[0], `school from ${headers.join('/')}`);
    assert.equal(detected.email, headers[1], `email from ${headers.join('/')}`);
    assert.equal(detected.location, headers[2], `location from ${headers.join('/')}`);
  }
});

test('one header cannot satisfy two fields', async () => {
  // "Email" must map to email, never be claimed by school's loose "name" alias.
  const detected = service.detectColumns(['Email', 'Location']);
  assert.equal(detected.email, 'Email');
  assert.notEqual(detected.school, 'Email');
});

test('an unrecognised header set leaves fields unmapped rather than guessing', async () => {
  const detected = service.detectColumns(['Column A', 'Column B']);
  assert.equal(detected.school, null);
  assert.equal(detected.location, null);
});

// ── Location resolution (§8, §9) ────────────────────────────────────────────

test('a plain city resolves to its real coordinates', async () => {
  const kolkata = service.resolveLocation('Kolkata');
  assert.equal(kolkata.city, 'Kolkata');
  assert.ok(Math.abs(kolkata.latitude - 22.5726) < 0.01);
  assert.ok(Math.abs(kolkata.longitude - 88.3639) < 0.01);
  assert.equal(kolkata.coordSource, 'city-table');
});

test('free-text locations are resolved from the most specific part available', async () => {
  // Each of these should land on Kolkata.
  for (const input of ['Kolkata, West Bengal', 'Salt Lake, Kolkata', '700091, Kolkata', 'Calcutta']) {
    const out = service.resolveLocation(input);
    assert.equal(out.city, 'Kolkata', `"${input}" should resolve to Kolkata`);
    assert.ok(out.latitude !== null, `"${input}" should have coordinates`);
  }
});

test('a pincode is captured and does not block name resolution', async () => {
  const out = service.resolveLocation('700091, Kolkata');
  assert.equal(out.pincode, '700091');
  assert.ok(out.latitude !== null);
  // An invalid pincode is not stored as one.
  assert.equal(service.resolveLocation('000001 Kolkata').pincode, null);
});

test('an unresolvable location gets NO coordinates — never a fabricated one', async () => {
  for (const input of ['Nowhere-upon-Sea', 'Atlantis', 'xyz123', '']) {
    const out = service.resolveLocation(input);
    assert.equal(out.latitude, null, `"${input}" must not be given a latitude`);
    assert.equal(out.longitude, null, `"${input}" must not be given a longitude`);
    assert.equal(out.coordSource, null);
    // Specifically not 0,0 — that is a real place in the Gulf of Guinea.
    assert.notEqual(out.latitude, 0);
  }
});

test('different cities resolve to different points', async () => {
  const cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Chennai'];
  const coords = cities.map((c) => {
    const r = service.resolveLocation(c);
    assert.ok(r.latitude !== null, `${c} should resolve`);
    return `${r.latitude},${r.longitude}`;
  });
  assert.equal(new Set(coords).size, cities.length, 'every city has its own coordinate');
});

// ── Parsing (§3) ────────────────────────────────────────────────────────────

test('CSV and XLSX produce the same parsed result', async () => {
  const rows = [
    { School: 'ABC School', Email: 'abc@example.com', Location: 'Kolkata' },
    { School: 'XYZ School', Email: 'xyz@example.com', Location: 'Pune' },
  ];
  const fromXlsx = service.parseWorkbook(sheetBuffer(rows), 'f.xlsx');
  const fromCsv = service.parseWorkbook(
    csvBuffer('School,Email,Location\nABC School,abc@example.com,Kolkata\nXYZ School,xyz@example.com,Pune\n'),
    'f.csv'
  );
  assert.equal(fromXlsx.rows.length, 2);
  assert.equal(fromCsv.rows.length, 2);
  assert.deepEqual(fromCsv.headers, ['School', 'Email', 'Location']);
});

test('an empty or unreadable file is refused with a usable message', async () => {
  assert.throws(() => service.parseWorkbook(sheetBuffer([]), 'empty.xlsx'), (e) => e.statusCode === 400);
  assert.throws(() => service.parseWorkbook(csvBuffer(''), 'empty.csv'), (e) => e.statusCode === 400);
});

// ── Validation (§7, §22) ────────────────────────────────────────────────────

const MAPPING = { school: 'School', email: 'Email', location: 'Location' };

test('validation separates importable rows from those needing attention', async () => {
  const rows = [
    { School: 'ABC School', Email: 'abc@example.com', Location: 'Kolkata' },
    { School: 'XYZ School', Email: 'xyz@example.com', Location: 'Pune' },
    { School: '', Email: 'no-school@example.com', Location: 'Delhi' },        // missing school
    { School: 'No Location School', Email: 'n@example.com', Location: '' },    // missing location
    { School: 'Bad Email School', Email: 'not-an-email', Location: 'Mumbai' }, // invalid email
    { School: 'Unknown Place School', Email: 'u@example.com', Location: 'Atlantis' }, // unresolvable
  ];
  const out = service.validateRows(rows, MAPPING);
  assert.equal(out.summary.total, 6);
  // The two bad-field rows are excluded; the invalid-email and unresolved-location rows
  // are still importable, because neither prevents storing the record.
  assert.equal(out.summary.valid, 4);
  assert.equal(out.summary.needsAttention, 4);
  assert.equal(out.summary.locationsUnresolved, 1, 'Atlantis is stored but not mappable');

  const flagged = out.issues.find((i) => i.school === 'Unknown Place School');
  assert.ok(flagged.issues.some((m) => /could not be resolved/i.test(m)));
  // Row numbers account for the header row, so they match what the user sees in Excel.
  assert.equal(out.issues.find((i) => i.school === 'Bad Email School').row, 6);
});

test('duplicates inside one file are detected and reported, not silently imported', async () => {
  const row = { School: 'ABC School', Email: 'abc@example.com', Location: 'Kolkata' };
  const out = service.validateRows([row, { ...row }, { ...row }], MAPPING);
  assert.equal(out.summary.total, 3);
  assert.equal(out.summary.valid, 1, 'only the first copy is importable');
  assert.equal(out.summary.duplicates, 2);
  assert.ok(out.issues.some((i) => i.issues.some((m) => /Duplicate of row 2/.test(m))));
});

test('an unmapped required column is refused before any work happens', async () => {
  assert.throws(() => service.validateRows([{ A: 1 }], { school: null, location: 'A' }),
    (e) => e.statusCode === 422 && /School column/.test(e.message));
  assert.throws(() => service.validateRows([{ A: 1 }], { school: 'A', location: null }),
    (e) => e.statusCode === 422 && /Location column/.test(e.message));
});

// ── Analysis endpoint shape (§5, §6) ────────────────────────────────────────

test('analysis auto-matches columns and returns a capped preview', async () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({
    'School Name': `School ${i}`, 'Email Address': `s${i}@example.com`, Location: 'Mumbai',
  }));
  const out = await service.analyzeFile({ buffer: sheetBuffer(rows), filename: 'schools.xlsx' });
  assert.equal(out.ready, true);
  assert.deepEqual(out.autoMatched, { school: true, email: true, location: true });
  assert.equal(out.file.rows, 25);
  assert.equal(out.preview.length, 10, 'preview is capped, not thousands of rows');
  assert.equal(out.preview[0].mapped, true);
  assert.equal(out.summary.valid, 25);
});

test('analysis reports not-ready when a required column cannot be detected', async () => {
  const out = await service.analyzeFile({
    buffer: sheetBuffer([{ Foo: 'a', Bar: 'b' }]), filename: 'odd.xlsx',
  });
  assert.equal(out.ready, false);
  assert.equal(out.summary, undefined, 'no validation is attempted until mapping is complete');
  assert.deepEqual(out.headers, ['Foo', 'Bar']);
});

test('a caller-supplied mapping overrides detection', async () => {
  const out = await service.analyzeFile({
    buffer: sheetBuffer([{ A: 'ABC School', B: 'abc@example.com', C: 'Kolkata' }]),
    filename: 'unnamed.xlsx',
    mapping: { school: 'A', email: 'B', location: 'C' },
  });
  assert.equal(out.ready, true);
  assert.equal(out.summary.valid, 1);
  assert.equal(out.preview[0].school, 'ABC School');
});

// A field the caller never mentioned should fall back to detection; a field the caller
// explicitly cleared must stay cleared. Email is the case that matters: a user who removes
// the Email column has decided not to import personal data, and silently re-detecting it
// would import addresses against that choice.
test('an explicitly cleared column stays unmapped instead of falling back to detection', async () => {
  const buffer = sheetBuffer([{ School: 'ABC School', Email: 'abc@example.com', Location: 'Kolkata' }]);

  // Omitted → detection fills it in.
  const detected = await service.analyzeFile({
    buffer, filename: 'f.xlsx', mapping: { school: 'School', location: 'Location' },
  });
  assert.equal(detected.mapping.email, 'Email');
  assert.equal(detected.preview[0].email, 'abc@example.com');

  // Explicitly emptied → stays unmapped, and no address is read from the file.
  const cleared = await service.analyzeFile({
    buffer, filename: 'f.xlsx', mapping: { school: 'School', email: '', location: 'Location' },
  });
  assert.equal(cleared.mapping.email, null);
  assert.equal(cleared.ready, true);
  assert.equal(cleared.summary.valid, 1);
  assert.equal(cleared.preview[0].email, '');
});

test('clearing a required column makes the analysis not-ready rather than silently re-detecting', async () => {
  const out = await service.analyzeFile({
    buffer: sheetBuffer([{ School: 'ABC School', Location: 'Kolkata' }]),
    filename: 'f.xlsx',
    mapping: { school: 'School', location: '' },
  });
  assert.equal(out.mapping.location, null);
  assert.equal(out.ready, false);
  // Not-ready means no validation ran, so there is nothing to mistake for a clean file.
  assert.equal(out.summary, undefined);
});

// ── Persistence and the map payload (§15, §19) ──────────────────────────────

test('import persists into a project, dedupes a re-import, and the map payload carries no PII', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
  try {
    const Project = require('../models/common/Project');
    const MarketingImport = require('../models/marketing/MarketingImport');
    await MarketingImport.init();   // build the unique index before relying on it
    const project = await Project.create({
      name: 'Project Alpha', projectCode: 'ALPHA', description: 'x',
      startDate: new Date(), status: 'in-progress', projectManager: new mongoose.Types.ObjectId(),
    });

    const rows = [
      { School: 'ABC School', Email: 'abc@example.com', Location: 'Kolkata' },
      { School: 'DEF School', Email: 'def@example.com', Location: 'Kolkata' },
      { School: 'XYZ School', Email: 'xyz@example.com', Location: 'Pune' },
      { School: 'Lost School', Email: 'lost@example.com', Location: 'Atlantis' },
    ];
    const buffer = sheetBuffer(rows);

    // An import with no project must be refused (§15).
    await assert.rejects(
      service.commitImport({ buffer, filename: 'f.xlsx', projectId: null }),
      (e) => e.statusCode === 422 && /Select a project/.test(e.message),
    );

    const result = await service.commitImport({
      buffer, filename: 'schools.xlsx', projectId: String(project._id),
    });
    assert.equal(result.inserted, 4, 'all four rows stored, including the unmappable one');
    assert.equal(result.locationsUnresolved, 1);
    assert.equal(result.projectName, 'Project Alpha');

    // Re-importing the identical file must not double-count.
    const again = await service.commitImport({
      buffer, filename: 'schools.xlsx', projectId: String(project._id),
    });
    assert.equal(again.inserted, 0, 're-import inserts nothing');
    assert.equal(again.skippedAsExisting, 4);
    assert.equal(await MarketingImport.countDocuments({ projectId: project._id }), 4);

    // The map payload: aggregated per city, counts only.
    const map = await service.getImportedMapPoints(String(project._id));
    assert.equal(map.total, 4);
    assert.equal(map.unresolved, 1, 'the unmappable row is counted but not plotted');
    assert.equal(map.points.length, 2, 'Kolkata and Pune');

    const kolkata = map.points.find((p) => p.location === 'Kolkata');
    assert.equal(kolkata.records, 2);
    assert.equal(kolkata.schools, 2);
    assert.ok(kolkata.latitude !== null);

    // §19: no contact detail may appear anywhere in the map payload.
    const serialised = JSON.stringify(map);
    for (const pii of ['abc@example.com', 'def@example.com', 'xyz@example.com', 'lost@example.com']) {
      assert.ok(!serialised.includes(pii), `map payload must not contain ${pii}`);
    }
    for (const key of ['email', 'school', 'importedBy']) {
      assert.ok(!(key in kolkata), `map point must not expose ${key}`);
    }

    // Distinct school count across the whole selection (§28), not the sum of per-city counts.
    assert.equal(map.schools, 4);

    // Another project sees none of it.
    const other = await Project.create({
      name: 'Project Beta', projectCode: 'BETA', description: 'x',
      startDate: new Date(), status: 'in-progress', projectManager: new mongoose.Types.ObjectId(),
    });
    assert.equal((await service.getImportedMapPoints(String(other._id))).total, 0);

    // ── "All Projects" is a filter over a set, not a project (§2, §22) ──────
    await service.commitImport({
      buffer: sheetBuffer([{ School: 'Beta School', Email: 'beta@example.com', Location: 'Delhi' }]),
      filename: 'beta.xlsx', projectId: String(other._id),
    });
    const both = await service.getImportedMapPoints([String(project._id), String(other._id)]);
    assert.equal(both.total, 5, 'aggregates across the authorised set');
    assert.equal(both.points.length, 3, 'Kolkata, Pune and Delhi');

    // An empty authorised set must return nothing, never everything: a scope filter that
    // fails open is a data leak.
    assert.equal((await service.getImportedMapPoints([])).total, 0);
    assert.equal((await service.getImportedMapPoints(null)).total, 0);

    // ── View Details: the authorised per-location records (§34) ─────────────
    const records = await service.getLocationRecords({ projectIds: [String(project._id)], city: 'Kolkata' });
    assert.equal(records.pagination.total, 2);
    assert.deepEqual(records.items.map((r) => r.school).sort(), ['ABC School', 'DEF School']);
    // This IS the authorised detail view, so the address is present here — and only here.
    assert.equal(records.items[0].email, 'abc@example.com');
    assert.equal(records.items[0].mapped, true);
    assert.equal(records.items[0].projectName, 'Project Alpha');

    // It must stay scoped: Project Beta's Delhi row is not reachable through Alpha.
    assert.equal(
      (await service.getLocationRecords({ projectIds: [String(project._id)], city: 'Delhi' })).pagination.total,
      0,
    );
    await assert.rejects(
      service.getLocationRecords({ projectIds: [], city: 'Kolkata' }),
      (e) => e.statusCode === 422,
    );

    // ── Unmapped records (§32) ──────────────────────────────────────────────
    const unmapped = await service.getUnmappedRecords({ projectIds: [String(project._id)] });
    assert.equal(unmapped.pagination.total, 1);
    assert.equal(unmapped.items[0].school, 'Lost School');
    // The raw value is returned so it can be corrected at source and re-imported.
    assert.equal(unmapped.items[0].location, 'Atlantis');
    assert.equal(unmapped.items[0].projectName, 'Project Alpha');
    assert.equal(unmapped.items[0].status, 'Unmapped');
    assert.equal(unmapped.items[0].missingLocationReason, 'Location could not be resolved to coordinates');

    const search = await service.searchImportedRecords({ projectIds: [String(project._id)], search: 'school' });
    assert.equal(search.items.length, 4);
    assert.ok(search.items.every((row) => !('email' in row)));
    assert.ok(search.items.every((row) => row.projectName === 'Project Alpha'));
    assert.equal((await service.searchImportedRecords({ projectIds: [], search: 'school' })).items.length, 0);
    assert.equal((await service.searchImportedRecords({ projectIds: [String(project._id)], search: '.*' })).items.length, 0);
    const record = await service.getImportedRecord({ projectIds: [String(project._id)], recordId: records.items[0].id });
    assert.equal(record.school, 'ABC School');
    assert.equal(record.email, 'abc@example.com');
    assert.equal(record.mapped, true);
    await assert.rejects(service.getImportedRecord({ projectIds: [String(other._id)], recordId: record.id }), (error) => error.statusCode === 404);
    await assert.rejects(service.getImportedRecord({ projectIds: [], recordId: record.id }), (error) => error.statusCode === 422);
    const lostRecord = await service.getImportedRecord({ projectIds: [String(project._id)], recordId: unmapped.items[0].id });
    assert.equal(lostRecord.mapped, false);
    assert.equal(lostRecord.status, 'Unmapped');
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});

test('a file with no importable rows is refused rather than creating an empty batch', async () => {
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
  try {
    const Project = require('../models/common/Project');
    const project = await Project.create({
      name: 'Project Gamma', projectCode: 'GAMMA', description: 'x',
      startDate: new Date(), status: 'in-progress', projectManager: new mongoose.Types.ObjectId(),
    });
    const buffer = sheetBuffer([{ School: '', Email: '', Location: '' }]);
    await assert.rejects(
      service.commitImport({ buffer, filename: 'blank.xlsx', projectId: String(project._id) }),
      (e) => e.statusCode === 422 && /No importable rows/.test(e.message),
    );
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }
});
