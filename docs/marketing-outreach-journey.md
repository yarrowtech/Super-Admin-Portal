# Marketing outreach journey

The map's primary status describes outreach, independently of coordinate availability. The workflow belongs to a single imported marketing record, not every contact sharing a school name. Existing records without outreach data display **Not recorded**; importing a spreadsheet or obtaining city coordinates does not imply that an email, visit, or meeting happened.

The available stages are owned by `backend/config/marketingStages.js` and returned by `GET /api/ceo/marketing-analytics/import/journey`, with `canUpdate` and `scope: "record"`. The frontend uses those stage IDs, labels, next actions, branch flags, and semantic tones. The existing CEO portal guards still apply; status updates additionally require a CEO/admin role in the service.

## Data and updates

`MarketingImport.marketingStatus` stores `currentStage`, `version`, optional `scheduledAt`, and an append-only `history`. Each recorded change includes the stage, server timestamp, authenticated actor ID/name/role, source, optional note, and scheduled date. Existing GIS `status`/`mapped` fields remain in the API for compatibility and are not used as the marketing status.

Update a selected record with:

```http
PATCH /api/ceo/marketing-analytics/import/records/:recordId/marketing-status?projectId=...
Content-Type: application/json

{
  "stage": "MEETING_FIXED",
  "expectedVersion": 2,
  "scheduledAt": "2026-10-20T00:00:00+05:30",
  "note": "Confirmed by school"
}
```

The response includes the complete updated record. The atomic version check rejects a stale edit with HTTP 409; reload the record before retrying. Identical saves without a new note do not append duplicate events. Timestamps and actor identity cannot be supplied by the client. History is never replaced through this endpoint.

## Filtering and counts

The imported points, location records, records without coordinates, and search endpoints accept `marketingStage=MEETING_FIXED` or a comma-separated list. `NOT_RECORDED` selects records with no recorded stage. Map totals, point counts, and `pipeline: [{ stage, records }]` use the same applied stage/project/department/geography filters. Pipeline counts represent records in their **current** stage, not historical event totals or inferred school-wide stages.

City pins retain their existing aggregation. An accent is shown only when every underlying record agrees on the same marketing stage; mixed-stage points do not imply one school-wide status. Changing an inspected record refreshes the lists and aggregate counts without reloading the page. If the new stage falls outside the current filters, the inspector stays open with an explanatory message while the filtered map excludes that record.

The timeline marks a stage completed only when an event exists for it. Jumping to a later stage leaves unrecorded earlier steps unrecorded. Negative/on-hold branches do not imply conversion. Dates are displayed in Asia/Kolkata. A scheduled date is separate from the timestamp when the stage was recorded.

## Verification

```powershell
# Backend, including journey isolation/concurrency/filter tests
cd backend
npm test

# Frontend production bundle
cd ../frontend
npm run build

# Isolated headless browser interactions, using fixtures only
cd ../backend
node scripts/verifyMarketingJourneyUi.cjs
```

The browser check serves the production bundle on an ephemeral localhost port and intercepts API requests with fixtures. It exercises stage updates/history, filters, browser navigation, refresh, mobile sizing, read-only actions, and runtime errors without touching live records. Screenshots are saved to a temporary directory printed by the script.
