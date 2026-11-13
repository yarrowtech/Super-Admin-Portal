const test = require('node:test');
const assert = require('node:assert/strict');

const service = require('../services/crmBulk.service');

// Bulk writes are the one place in the CRM where a single bad request can damage
// hundreds of records at once, so what is asserted here is the guard rail rather
// than the happy path: every way a caller can supply a dangerous or malformed
// selection must be refused *before* anything is written.

const { parseIds, MAX_BULK_IDS } = service;

const oid = (n) => String(n).padStart(24, '0');

// ── Selection validation ────────────────────────────────────────────────────

test('an empty selection is refused rather than treated as "everything"', () => {
  // The important failure mode: a bulk op that reads an empty list as an
  // unfiltered match would rewrite the whole collection.
  assert.throws(() => parseIds([]), (err) => err.statusCode === 422);
  assert.throws(() => parseIds(undefined), (err) => err.statusCode === 422);
  assert.throws(() => parseIds(null), (err) => err.statusCode === 422);
});

test('a non-array selection is refused', () => {
  assert.throws(() => parseIds('all'), (err) => err.statusCode === 422);
  assert.throws(() => parseIds({ $ne: null }), (err) => err.statusCode === 422);
});

test('a selection over the cap is refused, naming the limit', () => {
  const tooMany = Array.from({ length: MAX_BULK_IDS + 1 }, (_, i) => oid(i));
  assert.throws(
    () => parseIds(tooMany),
    (err) => err.statusCode === 422 && String(err.message).includes(String(MAX_BULK_IDS)),
  );
});

test('a selection exactly at the cap is allowed', () => {
  const atLimit = Array.from({ length: MAX_BULK_IDS }, (_, i) => oid(i));
  assert.equal(parseIds(atLimit).length, MAX_BULK_IDS);
});

test('duplicate ids collapse, so a record is acted on once', () => {
  assert.deepEqual(parseIds([oid(1), oid(1), oid(2)]), [oid(1), oid(2)]);
});

test('malformed ids are dropped while valid ones survive', () => {
  assert.deepEqual(parseIds(['nope', oid(3), '', null]), [oid(3)]);
});

test('a selection of only malformed ids is refused rather than matching nothing silently', () => {
  assert.throws(() => parseIds(['nope', 'still-not-an-id']), (err) => err.statusCode === 422);
});

// ── Input validation, ahead of any write ────────────────────────────────────

test('an unknown priority is refused', async () => {
  await assert.rejects(
    () => service.bulkPriority({ ids: [oid(1)], priority: 'catastrophic' }),
    (err) => err.statusCode === 422,
  );
});

test('an unknown department is refused', async () => {
  await assert.rejects(
    () => service.bulkDepartment({ ids: [oid(1)], department: 'legal' }),
    (err) => err.statusCode === 422,
  );
});

test('a missing stage is refused before the database is consulted', async () => {
  await assert.rejects(
    () => service.bulkStatus({ ids: [oid(1)] }),
    (err) => err.statusCode === 422,
  );
});

test('a malformed owner id is refused rather than cast-erroring mid-write', async () => {
  await assert.rejects(
    () => service.bulkOwner({ ids: [oid(1)], owner: 'not-a-user' }),
    (err) => err.statusCode === 422,
  );
});

test('a malformed project id is refused', async () => {
  await assert.rejects(
    () => service.bulkProject({ ids: [oid(1)], projectId: 'not-a-project' }),
    (err) => err.statusCode === 422,
  );
});

test('every bulk operation validates its selection first', async () => {
  // Each entry is called with an empty selection; all must refuse identically,
  // so no operation can be reached with an unvalidated id list.
  const calls = [
    () => service.bulkStatus({ ids: [], status: 'Contacted' }),
    () => service.bulkOwner({ ids: [] }),
    () => service.bulkPriority({ ids: [], priority: 'high' }),
    () => service.bulkProject({ ids: [] }),
    () => service.bulkDepartment({ ids: [], department: 'media' }),
    () => service.bulkDeactivate({ ids: [] }),
  ];
  for (const call of calls) {
    await assert.rejects(call, (err) => err.statusCode === 422);
  }
});

test('the service exposes no filter-based bulk entry point', () => {
  // A "apply to everything matching this filter" API is the documented
  // non-goal; this asserts nobody adds one without revisiting the decision.
  const exported = Object.keys(service);
  const byFilter = exported.filter((k) => /filter|all|query/i.test(k));
  assert.deepEqual(byFilter, [], `unexpected filter-based bulk API: ${byFilter.join(', ')}`);
});
