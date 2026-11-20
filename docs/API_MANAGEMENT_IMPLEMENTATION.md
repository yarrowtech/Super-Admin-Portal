# API Management implementation report

Date: 20 November 2026

## UI and UX maintenance update

The API Management interface now uses the portal's shared header, section cards,
buttons, KPI cards and modal components. Project cards include search, configuration
state, existing-adapter counts and a direct configuration action. The secondary
navigation is sticky and collapsible on desktop, with a grouped section selector
on mobile. Project scope stays in the URL across sections.

The previous large component has been split into focused modules under
`frontend/src/components/admin/api-management/`: navigation, overview, provider
settings/documentation, endpoint editing, portal connections, operational panels,
shared presentation components and configuration constants. Registry queries use
the existing TanStack Query provider; mutation handling prevents duplicate submits
and reports success, errors and stale refreshes separately.

Existing integration editors are collapsed by default. Credential inputs remain
empty; environment variable identifiers sit in optional technical details. Forms
use explicit labels, helper text, responsive grids, type selectors and clear save
and cancel actions. Endpoint drafts can now be saved without shared fields while
sharing is disabled. The backend still rejects enabling sharing with no fields.
New field names receive default scalar schemas, fixing write-field type setup.

Connection configuration has three steps: portal selection, endpoint/field
approval and review. Saved mappings remain inactive until tested. Connection
lists expose their exact permissions through an expandable detail view. Activation,
deactivation, retesting an active connection and credential rotation have contextual
confirmation dialogs. Retest copy explains that the connection must be activated
again. One-time credentials have copy/dismiss controls and are kept in section-local
state. Failed confirmation actions remain visible in the dialog.

The module includes skeleton loading, failed-load retry, contextual empty states,
search, status badges, read-only views and timestamp formatting. Configuration
state is distinguished from verified connectivity. Shared modals now expose their
title/description IDs to assistive technology while retaining the existing focus
trap and Escape behavior.

Verification: frontend production build and scoped lint passed. All 12 backend
regression tests passed, including unshared endpoint drafts and rejection of empty
active sharing policies. `node scripts/verifyApiManagementUi.cjs` runs an isolated
headless-browser preview using fixture API responses and verifies project search,
project scope, endpoint draft submission, connection review, one-time credentials,
mobile/dark layout, administrator read-only controls and load-error retry. It never
reads real credentials or calls actual project APIs. Review screenshots are saved
under `backend/artifacts/api-management-ui/`. Live provider acceptance testing is
still separate from these interface checks.

## Frontend control of existing environment settings

The latest user request supersedes the original requirement to keep individual
project settings out of `.env`. API Management now discovers the existing
EdifyEight teacher/study-material, EFNBMMS admin-management, YarrowTech SRS and
Marketing Platform adapters. Configured integrations appear on the dashboard and
under their owning project. Discovery and registration do not rewrite existing
values or automatically grant portal access.

Super Admin can register an existing adapter and edit its supported URL and
credential fields in **Existing project APIs**. Saving updates `backend/.env`
and the running process. Existing environment names, aliases, shared-token
relationships and unrelated settings are preserved. Blank credential fields keep
stored values. Credentials are never populated in frontend responses.

New project API URL/token saves create server-generated variables named
`PROJECT_API_<API_ID>_BASE_URL` and `PROJECT_API_<API_ID>_TOKEN`. URLs and encrypted
credential copies remain in the registry; the gateway reads the environment-backed
configuration. Provider tokens in `.env` are plaintext server secrets under this
requested design. File permissions and deployment secret handling therefore
remain necessary; database encryption does not encrypt the environment file.

A project can register multiple existing adapters. An endpoint can select one of
that project's registered bearer-authenticated adapters as its provider, so the
teacher and study-material APIs remain distinct. Backend checks reject provider
references from another project. Existing signing/API-key adapters can have their
configuration managed without claiming that their resource authentication
contract is verified for the generic bearer gateway.

Environment edits use a fixed backend path, allowed project keys, a writer lock,
revision/conflict checks and an atomic temporary-file rename. No raw `.env`
editor, arbitrary variable name or infrastructure-secret control is exposed.
Malformed input/newlines are rejected; multi-line legacy values need server-side
migration. Imported shared credentials continue to affect all existing adapters
that use them. Frozen legacy configuration exports now use live getters for
these supported project values; Marketing Platform also reads its connection
settings at request time. No server restart is needed for those ordinary edits.

Additional management endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/api-management/existing-integrations/:integrationId/import` | Register the existing adapter with its owning project without rewriting `.env` |
| PATCH | `/api/api-management/existing-integrations/:integrationId` | Save explicitly changed allowed settings with an environment revision |

The state response includes a masked `existingIntegrations` inventory. Database
API records track imported adapter IDs and environment-backed configuration;
endpoint records track an optional project-owned provider adapter ID. A unique
partial index prevents one existing adapter being assigned to multiple projects.
Run the module index script on deployments that disable automatic indexes.

Environment writes affect the backend instance's local file and running process.
An immutable filesystem, read-only secret mount or multiple independent backend
hosts requires deployment-specific configuration distribution; the UI reports a
write error instead of claiming success. Crash-abandoned writer locks require
operator inspection. Existing portal authorization is unchanged; registering an
adapter does not automatically expose its data through the gateway.

New files for this update:

- `backend/services/apiManagement.environment.js`
- `backend/__tests__/apiManagementEnvironment.test.js`
- `frontend/src/components/admin/ExistingProjectApis.jsx`

Also updated: API Management models/routes/security, legacy environment getters,
Marketing Platform connection readers, project UI, environment example and tests.
The actual local `.env` values were not changed by discovery, import development
or verification; all environment-write tests use temporary files.

Final verification for this update: production frontend build passed; lint passed
for the updated API Management components and scope helper; 12 backend tests passed
with zero failures across API Management, environment preservation/runtime updates,
credential log redaction and existing workspace HTTP/persistence/synchronization.
The logger now also masks environment-style `_TOKEN`, `_SECRET`, `_API_KEY` and
`_PASSWORD` fields, including nested frontend settings submissions. Local read-only
discovery confirmed configured EdifyEight teacher, EdifyEight study-material and
EFNBMMS admin-management settings without printing their values. No real provider
read or write was executed during these checks.

## Project-wise workspace update

The dashboard now lists every actual project alongside its own API, provider URL,
endpoint count and portal connection count. Use **Manage project API** or the
persistent project selector to open that project's workspace. The selected
project remains in the URL while navigating between sections and on refresh.

Endpoint catalogs, sharing policies, credentials, documentation, connection
tables, permissions, data access paths, sync jobs and logs are scoped to that
project. Project-specific sections require a project selection. Switching
projects clears unfinished forms, permission previews and displayed credentials.
Portal client registration remains organization-wide so a project can be
explicitly connected to any registered consumer.

The backend rejects moving an endpoint to another API and rejects connection
grants referencing a different project's endpoints. Regression assertions cover
these ownership checks and frontend scope isolation with two independent projects.
Registration audit events now reference the registered API ID correctly.

## Status

A working, database-backed API Management module is implemented at `/admin/api-management`, with all requested secondary navigation groups. It supports dynamic project registration, scoped endpoint sharing, many-to-many portal connections, live reads, explicitly approved writes, scheduled snapshots, event-triggered refresh, monitoring, generated OpenAPI documentation and optional read-only MCP tools.

This is **not yet a verified production rollout of every existing project**. No real provider credentials were used or live connections activated. Provider contract registration, integration-specific adapters and the rollout items below remain necessary. No production mock data or predefined project-to-portal grants were added.

## Architecture audit

- Backend: CommonJS Express, MongoDB/Mongoose, Node test runner. The application is composed in `backend/app.js`; process lifecycle and scheduled work are in `backend/server.js`.
- Authentication: existing `authenticate` middleware validates JWTs, users and sessions. Existing `super_admin` and `admin` roles are reused. This module grants management reads to both and mutations only to `super_admin`.
- Canonical projects: `backend/models/common/Project.js`. API identities are registered against actual project IDs, with a unique project reference and UUID-suffixed namespace. New projects appear in the registration selector without source changes.
- Portal access definitions: `backend/models/superAdmin/PortalAccess.js`. Its distinct portal values are suggestions for registration; a suggestion confers no API access. Registered API consumers are separate database records.
- Frontend: React/Vite, shared `AdminPortal`, `AdminSidebar`, `PortalHeader`, existing authentication context, API client and light/dark utility styles. Existing CRM behavior was not edited. Screenshots were not included in the attachment; the implementation follows the existing components.
- Existing YarrowTech routes include project overview, service clients/projects, provider projects, activity, integration capabilities/test/sync and sync history. Existing organization workspace routes and persistence/sync services provide project-scoped products, services, customers and related resources.
- Policy routes include project policies, requirements, policy audit, versions and acceptance records. Law remains separately mounted at `/api/dept/law` and `/api/law`.
- Existing project services have their own authentication and integration configuration. They were not migrated, rewritten or silently exposed through the new gateway. Existing provider settings in environment files remain intact; the module now manages supported existing entries and generates dedicated variables for newly configured APIs, as requested in the latest update.
- Existing `/mcp` and MCP-key administration are separate. The new MCP endpoint uses the new portal credentials and gateway policy; it grants no access through the existing MCP infrastructure.

## Implemented behavior

1. Register a canonical project to create an independent API ID, namespace and gateway base path.
2. Configure a public HTTPS provider base URL and write-only bearer credential in the UI. Newly submitted generic provider credentials have an AES-256-GCM database copy with random nonces and are also saved in the backend environment as requested.
3. Register actual endpoint methods, modules, datasets, scalar field contracts and response envelope paths. Approve shared fields independently from the full registered field catalog. Sharing defaults to disabled.
4. Register any portal and issue a server credential. Credentials are shown once, stored as SHA-256 hashes, and revoked immediately when rotated. Provider credentials are never returned by the backend.
5. Configure any project/portal combination. Each connection contains explicit endpoint, operation and field grants. The UI shows the permission summary before saving.
6. Test granted GET endpoints against the provider, then activate. The provider must be configured and enabled; the portal must have credentials. Mutation endpoints are not executed during a connection test.
7. The gateway rechecks project enablement, portal identity, active connection, current endpoint sharing, HTTP method, operation, field restrictions and configuration fingerprint for each request. No wildcard grant or query passthrough exists. Endpoint or credential changes require retesting.
8. Read responses are projected to approved scalar fields. Writes reject unapproved fields and invalid scalar types before dispatch. No DELETE method is supported. Provider authentication headers and credentials never reach the consuming portal.
9. Only explicitly configured sync jobs persist data: a filtered, per-connection/endpoint snapshot. Snapshots replace the previous authorized result; they never merge into provider databases. A cache read rechecks the active policy fingerprint.
10. The scheduler polls every 30 seconds. Database leases serialize job execution across processes; lease IDs prevent an old worker from publishing over a newer worker. Failed reads retry with exponential backoff capped at one hour. Job reconfiguration invalidates its cached snapshot.
11. Webhooks authenticate with a separate, job-scoped hashed credential and trigger a provider refresh. Unique event IDs deduplicate notifications for seven days. Failed refreshes remove the receipt so the provider can retry.
12. MCP is disabled by default per portal. When enabled, its stateless Streamable HTTP endpoint lists GET tools from that portal's active, tested connections only. Invocation reauthenticates, checks MCP revocation, and calls the same gateway execution function. No mutation tools are exposed.
13. Request attempts, successes/failures and configuration changes produce metadata-only events. The UI shows the latest 100 events, error filtering, connection test state and timestamps. No request payloads or provider data are placed in these module events.

## Actual endpoints

All management routes below are relative to `/api/api-management`. They use existing session JWT authentication. GET is available to `admin` and `super_admin`; mutations require `super_admin`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/state` | Current registries, catalogs, connections, jobs, latest events, canonical project options and capability flags |
| POST | `/apis` | Register project API identity using `projectId` |
| PATCH | `/apis/:id` | Configure provider URL and enable/disable |
| POST | `/apis/:id/credential` | Encrypt/store or rotate provider-issued bearer token |
| GET | `/apis/:id/documentation` | Generate per-project OpenAPI 3.1 JSON; UI can view/export |
| POST | `/endpoints` | Register endpoint/schema/sharing policy |
| PUT | `/endpoints/:id` | Replace same-project endpoint policy |
| POST | `/portals` | Register portal consumer |
| PATCH | `/portals/:id` | Enable/disable portal and optional MCP access |
| POST | `/portals/:id/rotate` | Issue one-time portal credential and revoke previous credential |
| POST | `/connections` | Create/update mapping and grants; reset to Pending |
| POST | `/connections/:id/test` | Test current configuration without upstream writes |
| POST | `/connections/:id/status` | Activate tested configuration or disable |
| POST | `/sync-jobs` | Configure/enable/disable interval snapshot job |
| POST | `/sync-jobs/:id/run` | Execute enabled sync job now |
| POST | `/sync-jobs/:id/webhook-credential` | Issue/rotate one-time job webhook credential |

Consumer and provider-facing endpoints:

| Method | Path | Authentication |
|---|---|---|
| Registered GET/POST/PUT/PATCH | `/api/v1/projects/:namespace/:endpointId` | Portal server bearer credential plus active endpoint grants |
| GET | `/api/v1/projects/:namespace/:endpointId/cache` | Same, plus explicit sync grant and an enabled job with current snapshot |
| POST | `/api/api-management-webhooks/:jobId` | Job webhook bearer credential; body `{ "eventId": "unique-provider-event-id" }` |
| POST | `/api/api-management-mcp` | Enabled MCP portal bearer credential; stateless MCP protocol |

The gateway claims only generated UUID-suffixed namespaces. Other `/api/v1/projects/...` routes fall through to existing integrations.

## Database additions

Mongoose model names (collections use Mongoose's pluralized defaults):

| Model | Data and constraints |
|---|---|
| `ManagedProjectApi` | Canonical project reference (unique), namespace (unique), URL, enablement, encrypted credential, rotation/fetch timestamps |
| `ManagedApiEndpoint` | Module/dataset, registered scalar schemas, method/operation, sharing policy; unique API/path/method |
| `ManagedApiPortal` | Name, unique slug, enablement, optional MCP flag, hashed server credential |
| `ManagedApiConnection` | Unique API/portal pair, embedded endpoint/field/operation grants, status, test fingerprint/timestamps |
| `ManagedApiEvent` | Metadata-only audit/request events; time/kind index |
| `ManagedApiSyncJob` | Unique connection/endpoint pair, schedule, lease, retry state, filtered snapshot, webhook hash; scheduler index |
| `ManagedApiSyncReceipt` | Unique job/event ID; seven-day expiry with TTL index |

There is no project database replication or direct cross-project database access. New models do not alter existing project, Law, Policy or CRM schemas.

For production deployments where automatic Mongoose index creation is disabled, run from `backend`:

```powershell
node scripts/apiManagementIndexes.js
```

The script adds this module's indexes only; it never drops existing indexes. It has not been run against the user's configured database during this task.

## Infrastructure and local configuration

- A new 32-byte infrastructure encryption key was generated in the local gitignored `backend/.env` without displaying or logging its value. No existing project URL, project token, connection mapping or permission was changed during implementation; subsequent frontend saves update only the supported project keys.
- `backend/.env.example` documents the sole new infrastructure variable, `API_MANAGEMENT_ENCRYPTION_KEY` (64 hexadecimal characters).
- Back up that key in the deployment secret manager. Replacing it without re-encrypting stored credentials makes them unreadable. Automated key rewrapping/KMS integration is not implemented.
- The infrastructure key requires process initialization, so restart the backend once to load the new code/key. Normal project/endpoint/credential/permission/job changes are read from MongoDB and require no restart.
- The UI retains typed provider tokens and one-time issued credentials in React memory only. It clears displayed credentials on section changes; credentials are not written to browser storage. Portal credentials belong in the destination portal's server-side secret store, never its frontend bundle.
- The new outbound transport supports public HTTPS on port 443 with bearer authentication only. It validates the connected DNS address, rejects private/reserved address ranges, does not follow redirects, applies a 15-second request timeout and limits responses to 2 MiB.

## Files changed

New:

- `backend/models/ApiManagement.js`
- `backend/services/apiManagement.security.js`
- `backend/services/apiManagement.sync.js`
- `backend/routes/apiManagement.routes.js`
- `backend/routes/apiManagement.mcp.js`
- `backend/scripts/apiManagementIndexes.js`
- `backend/__tests__/apiManagement.test.js`
- `frontend/src/components/admin/ApiManagement.jsx`
- `frontend/src/components/admin/apiManagementScope.js`
- `docs/API_MANAGEMENT_IMPLEMENTATION.md`

Updated:

- `backend/app.js`: additive router mounts
- `backend/server.js`: scheduler startup/shutdown
- `backend/.env.example`: infrastructure key documentation
- local ignored `backend/.env`: generated infrastructure key
- `frontend/src/components/admin/AdminSidebar.jsx`: independent navigation entry
- `frontend/src/routes/AppRoutes.jsx`: protected lazy-loaded module route

The pre-existing `backend/package-lock.json` working-tree modification was preserved. No dependency changes were needed.

## Verification

Passed:

```text
frontend: npm run build
frontend: npx eslint src/components/admin/ApiManagement.jsx
backend: node --test __tests__/apiManagement.test.js __tests__/workspaceHttp.test.js __tests__/workspacePersistence.test.js __tests__/workspaceSync.test.js
git diff --check
```

Backend result: 6 tests passed, 0 failed. The API Management HTTP test uses real Express authentication, temporary MongoDB, database constraints and a deterministic provider transport fixture. It verifies admin mutation denial, unique registrations, encrypted credentials, default denial, cross-portal isolation, field projection, approved writes, rejected write fields/types, configuration retesting, scheduled snapshot reads, webhook deduplication, MCP authorization, credential rotation/revocation, secret-free registry responses and legacy project-route passthrough.

The existing workspace HTTP, persistence and sync regression tests also passed. Backend tests required sandbox escalation to spawn Node/MongoDB processes. No real project-to-portal provider connection was tested; a passing fixture test is not evidence of provider compatibility or production readiness. The UI maintenance update adds fixture-based browser interaction and screenshot verification; authenticated live-provider browser tests remain outstanding.

Linting all three touched frontend files additionally reports existing `AdminSidebar.jsx` synchronous-effect-state lint failure and an existing `AppRoutes.jsx` effect-dependency warning outside the changed logic. The build emits existing large-bundle warnings. Tests emit an existing Mongoose reserved `collection` pathname warning.

## Outstanding work before full acceptance

1. Register and verify each real provider's URL, issued credential, modules, datasets, schema, response envelope and approved operations. Source repositories and contracts for every external project were not supplied. There is no automatic external-project database or schema discovery. The module intentionally starts without project connections.
2. Existing environment-backed adapters are now discovered and editable through the frontend. Law and Policy APIs remain separate. YarrowTech SRS resource authentication still requires contract verification before gateway data sharing. Existing legacy routes retain their own authorization; managing their configuration does not move all their requests under the new gateway.
3. The generic adapter currently supports static resource paths, bearer authentication and scalar object/array responses. Custom authentication headers, OAuth refresh, mTLS, pagination, dynamic path parameters, nested selected fields, required/nullable/enum schema constraints and provider-specific validation need contract-specific extensions.
4. Record-level row selectors and an interactive source-record browser are not implemented. Current grants restrict registered endpoint/module/dataset/method/operation and fields; provider endpoints must already enforce the intended record/tenant scope. Do not approve a broad endpoint when only selected records may be shared.
5. Scheduled/event delivery is filtered snapshot caching, not bidirectional project-database synchronization. Snapshot replacement resolves local cache conflicts. Multi-project merge rules, optimistic provider versions, reconciliation queues and cross-project conflict resolution are not implemented.
6. Mutation requests are not automatically retried. Provider-owned idempotency and conflict handling are required before approving create/update endpoints. Durable write idempotency/reconciliation is not implemented here.
7. Portal backends must consume the gateway using their own approved client credential and enforce their existing end-user authorization. This implementation does not add data widgets or credential distribution to every destination portal. A shared portal credential does not establish individual end-user record permissions.
8. Monitoring shows recent metadata events and last successful connection tests/fetches; it is not a historical analytics service or continuous health probe. Add deployment-specific retention, durable archival, pagination, alerting and capacity limits for growing registries/logs. Rate limiting currently uses the existing process-local default store; use a shared rate-limit store for a multi-instance rollout.
9. Add a managed encryption-key backup/rotation procedure, operational secret handling and production HTTPS validation. Index creation and actual deployment remain to be performed in the target environment.
10. Run authenticated browser/visual checks and real provider read/write/sync/MCP acceptance tests, followed by the wider existing portal test suite, before claiming all twelve acceptance criteria are met.
