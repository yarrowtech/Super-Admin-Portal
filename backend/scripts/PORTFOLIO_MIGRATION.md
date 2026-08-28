# Portfolio hierarchy migration runbook

The migration never modifies or deletes legacy `portfolios` documents. Do not
run `--apply` until the backup and dry-run outputs have been reviewed.

1. Create a collection-scoped backup:
   `node backend/scripts/exportPortfolioBackup.js --out=<secure-empty-directory>`
2. Copy the backup off the application host and verify every checksum in
   `manifest.json`. The files are canonical Extended JSON lines and preserve
   BSON IDs/dates.
3. Run `node backend/scripts/migratePortfolioHierarchy.js` and retain its exact
   report. Conflicts and duplicates must both be zero and counts must reconcile.
4. Only then run `node backend/scripts/migratePortfolioHierarchy.js --apply`.
   The apply uses one MongoDB transaction and records its `MigrationBatch` ID.
5. Verify collection counts and run the dry-run again; all create counts must be
   zero.

If application verification fails, roll back only the created batch with:
`node backend/scripts/migratePortfolioHierarchy.js --rollback <batch-id>`.
Rollback deletes only documents tagged with that batch ID, in child-to-parent
order, inside a transaction. It never deletes legacy portfolio data.

For disaster recovery, restore the scoped backup into a separate database first,
validate counts/checksums, and only then coordinate a production restore. Never
restore over the shared database without an approved maintenance window.
