# All-portal URL and API audit ? 15 October 2026

Implemented and tested safe shared configuration fixes across the existing system. Full production acceptance remains incomplete: live provider contracts/access, production data checks, exhaustive endpoint schemas and every portal workflow have not been verified. Registration and source inventories must not be mistaken for successful business operations.

## A. System inventory

The repository contains one React/Vite frontend and one Express/Socket.IO backend, the existing central Mongoose/MongoDB connection (`MONGO_URI`), optional Redis cache (`REDIS_URL`, memory fallback), Cloudinary storage, and Render/Vercel deployment configuration. External project applications are not separate source trees here.

Discovered surfaces: Super Admin, Admin, CEO, Finance Manager/Employee, HR, IT, LAW, Media/Digital Asset Library, Sales, Manager, Employee, Outsourcing, Marketing Analytics/map, central Policy, portfolio hierarchy, shared dashboards/navigation/chat/notifications/profile/support/settings. Research routes exist but app explicitly leaves the retired portal unmounted; it was not restored.

HOUSE OF MUSA has MATEBID, BETTERPASS, EDIFYEIGHT, YARROWTECH, HIREME, ARTBLOCK and GREENBAR brands. Ten project workspaces are registered: YARROWTECH, MATEBID, EEC/EdifyEight, EHC, BETTERPASS, EFNBMMS, ESPORTSM, ERMS, EEC_B2B and SMARTFARMING. Workspace services/products/plans/subscriptions, CRM customers/users/support/analytics, settings/membership, integration/sync history and YarrowTech delivery/payment-read modules were already in the initial worktree. This task does not claim authorship of those existing changes.

Providers and external consumers: EdifyEight teachers/study materials, EFNBMMS admin management, YarrowTech SRS, an environment-selected marketing platform, Cloudinary, project SSO/launch destinations, Google Fonts/document viewer/images and OpenStreetMap tiles. No verified SRS webhook or payment-provider contract was discovered.

## B. URL configuration report

| Existing behavior / example URL | Correction | Environment / affected files | Status |
| --- | --- | --- | --- |
| Root `https://api.example.test///` concatenated with `/api/...` could retain repeated boundary slashes | Normalize to `https://api.example.test/api/...`; trim whitespace and all trailing root slashes | Existing `VITE_API_URL`, shared client and 16 other frontend consumers listed in section F | Resolver/client tests, build and browser checks passed |
| Production bundle silently defaulted to the user's `http://localhost:5000` when backend URL was absent | Build fails clearly if missing; development retains existing localhost default | `config/backend.js`, `backendUrl.mjs`, `vite.config.js` | Focused tests passed; configured production build passed |
| Malformed or credential/query/fragment-bearing public backend base was accepted | Fail clearly without echoing supplied values | Same frontend config | Unsafe-value tests passed |
| Outsourcing override stripped only one trailing slash | Trim whitespace and all trailing slashes while preserving distinct host | `VITE_OUTSOURCING_PORTAL_URL`, `services/outsourcing.js` | Final focused test passed |
| Renewal/request-id headers were not exposed through CORS | Expose existing `X-New-Token` and `x-request-id` to allowed origins | `backend/config/cors.js`, `backend/app.js` | Actual local HTTP CORS test passed; origin restrictions retained |
| App import started DB/bootstrap work before validation | Validate configuration before importing app | `backend/server.js` | Startup failure-order test passed |
| Deployment guide expected nonexistent `database.state` | Document actual health response: HTTP 200, `success:true`, `data.status:"ok"`; outage HTTP 503, status `"degraded"` | `docs/DEPLOYMENT.md` | Compared with actual handler |

URLs above are examples, not invented production replacements. No actual `.env` file was modified. `environment-presence.json` records only names/presence, never values. `url-references.csv` inventories source references with owner hints, location, environment category and verification status. Static/test/documentation URLs are included but not treated as verified live services. Asset and placeholder URLs were not rewritten.

Existing variable names and legacy `EFMBMMS_*` aliases remain. API versions and reverse-proxy prefixes are preserved. Callers append `/api` or `/api/v1`; configure `VITE_API_URL` as the backend root, without adding a redundant API suffix. An intentional reverse-proxy path prefix is retained. LAW/Policy-specific overrides remain protected. Explicit localhost values remain valid for local builds; production operators must select the actual hosted URL.

Use existing Vite modes and separate development/testing/staging/production deployment values. No new port, production domain or database was assumed. New build validation is a deployment behavior change: configure the existing public backend URL before building.

## C. Endpoint report

`endpoints.csv` / `endpoints.json` list 1,166 mounted method/path registrations, including aliases/nested/helper routes. Fields include owning router, router source, handler names, inherited middleware, guard snippets and imported controller/service dependencies. `route-declarations.csv`, `dependencies.csv`, `database-models.csv`, `frontend-callers.csv`, `frontend-routes.csv` and `literal-client-connections.csv` provide supporting source locations and request-path evidence.

The tool loads actual Express routers without app/server startup and blocks Mongoose connections. Registration is verified; successful controller execution, request/response schemas, tenant isolation and authorization for every endpoint are not universally verified. Handler closures, dynamic frontend templates and resource-specific contracts still require manual tracing. Path/handler names indicate purpose; no response schemas were fabricated.

| Portal/router entrypoint | Method/path registrations including aliases |
| --- | ---: |
| `./routes/yarrowtech.routes` | 25 |
| `activityRoutes` | 1 |
| `adminRoutes` | 25 |
| `analyticsRoutes` | 2 |
| `attendanceRoutes` | 5 |
| `authRoutes` | 14 |
| `automationRoutes` | 1 |
| `ceoRoutes` | 96 |
| `chatRoutes` | 10 |
| `dashboardRoutes` | 2 |
| `departmentRoutes` | 14 |
| `edifyEightTeacherRoutes` | 12 |
| `efnbmmsRoutes` | 1 |
| `employeeDeptRoutes` | 19 |
| `employeePortalRoutes` | 18 |
| `externalAuthRoutes` | 5 |
| `financeRoutes` | 128 |
| `hrProfileRoutes` | 3 |
| `hrRoutes` | 112 |
| `itRoutes` | 65 |
| `lawRoutes` | 128 |
| `legalDocRoutes` | 26 |
| `logRoutes` | 2 |
| `managerRoutes` | 38 |
| `mediaRoutes` | 96 |
| `notificationRoutes` | 3 |
| `organizationWorkspaceRoutes` | 59 |
| `outsourcingRoutes` | 67 |
| `policyPublicRoutes` | 5 |
| `policyRoutes` | 33 |
| `portalSupportRoutes` | 9 |
| `portfolioHierarchyRoutes` | 58 |
| `portfolioRoutes` | 26 |
| `profileRoutes` | 5 |
| `projectAccessRoutes` | 8 |
| `projectOverviewRoutes` | 2 |
| `reportRoutes` | 2 |
| `salesRoutes` | 9 |
| `ssoRoutes` | 1 |
| `superAdminPortalRoutes` | 21 |
| `superAdminRoutes` | 10 |

`duplicate-registrations.json` records 30 exact duplicate method/path groups. Existing Policy `/api/v1/projects` and `/projects/:projectId` take precedence over workspace registrations; mounts were not reordered. YarrowTech integration duplicate handlers intentionally call `next()` for other providers. LAW task-link duplicates, department dashboards and Sales aliases need contract/consumer review before removal. No route was removed, renamed or invented.

SSO helpers `generateSsoToken` and `verifySsoToken` reference unregistered `/api/sso/generate-token` and `/api/sso/verify-token`. Repository search found definitions but no consumers. Active launch buttons use `POST /api/sso/token` or `POST /api/project-access/:projectCode`. Unused helpers were left unchanged because token contracts cannot be assumed equivalent. The connection CSV lists other unmatched literal definitions; it is not proof they are active broken workflows or use this backend.

## D. Integration report

| Provider | Existing base and implemented resource paths | Existing auth and sync | Verification / remaining blocker |
| --- | --- | --- | --- |
| EdifyEight teachers | `EDIFYEIGHT_TEACHER_API_URL` and existing base fallbacks; root GET/POST, `/:id` GET/PUT/DELETE, `/stats` GET | Server Bearer plus `x-service-token`; inbound snapshot/outbound update jobs; 25-second timeout | Source and disposable/fake-provider tests only. Need actual deployed resource URL, official schema/version/pagination/rate limits and authorized staging read/write access |
| EdifyEight study materials | `EDIFYEIGHT_STUDY_MATERIAL_API_URL` with existing fallbacks; root GET/POST, `/:id` PUT/DELETE, `/stats` and `/metadata` GET | Same server credentials, multipart operations and sync jobs; 25-second timeout | Source/regression evidence only. Need actual deployment contract and staging upload/write verification |
| EFNBMMS | `EFNBMMS_ADMIN_MANAGEMENT_API_URL`, legacy `EFMBMMS_*` aliases; configured resource root/suffixes | Server Bearer plus `x-service-token`; inbound admin-management snapshots; no invented outbound capability | Exact base/resource URL, credentials and documented response/pagination remain required |
| YarrowTech SRS | Existing default `https://api.yarrowtech.in` or `SRS_API_BASE_URL`; business resource paths unknown | `SRS_API_KEY`, `SRS_CLIENT_ID`, `SRS_SIGNING_SECRET`, `SRS_WEBHOOK_SECRET` remain server-side; protocol unknown | Business sync remains HTTP 409 `YARROWTECH_CONTRACT_UNVERIFIED`. Host reachability is not authenticated API verification. Need official signing/auth/resource/webhook contract and replacement credentials where previously exposed |
| Marketing platform | `MARKETING_PLATFORM_BASE_URL`; leads path default `leads`, campaigns separately configurable | Existing Bearer or `X-API-Key`; read-only analytics; 12-second default timeout, page size 500, cap 40 pages | Provider identity/official contract absent. Implemented defaults are unverified provider assumptions; capped pagination may truncate data |
| Cloudinary | SDK-managed hosts; existing cloud name/key/secret | Server SDK upload/download/delete | Mocked/local regression evidence only; live uploads/deletes not run |
| Project SSO/launch | Existing `*_PORTAL_URL`, `/api/sso/token`, project-access and external-auth routes | Existing session/service-token contracts | Remote launch/access not verified. EHC registry fallback domain needs deployment-owner confirmation before any change |

Public documentation search found the [EdifyEight public site](https://edifyeight.com/), but no usable internal teacher/study-material specification or official SRS contract. Search absence does not prove documentation is unavailable. Earlier YarrowTech documentation records a public host probe; this task did not repeat or claim it as current authenticated verification. No external business request was issued.

Existing workspace sync persists scoped external IDs, deduplication/job keys, status/history, allowlisted fields and reconciliation. Disposable tests cover inbound/outbound behavior and isolation, not actual provider write idempotency, webhook authenticity or pagination. No signing algorithm, webhook endpoint, retry protocol or success response was invented.

## E. Database report

`backend/config/db.js` retains the single `MONGO_URI`, 5-second server-selection and 45-second socket timeout. No new database, collection, schema, migration, production index or database credential was introduced. Redis remains optional cache. `database-models.csv` inventories connection/schema/index/ref references.

Model families include auth/User/Session; organization/project/portfolio; common tasks/chat/support; HR; IT; Finance; LAW/legal/Policy; Media library/marketing; and workspace configuration/records/membership/sync/YarrowTech settings/deliveries/payment reads. Existing workspace organization/brand/project/kind scoping, relationship validation and deduplication were exercised with disposable MongoDB. Finance tests exercise transactional ledger/payment integrity and role/department restrictions; HR/Media/manager/project middleware tests passed.

Production records, permissions/indexes and full schema relationships were not validated on a live database. No seed or migration script was executed. Canonical MongoDB ObjectIds, registry project codes and Policy identity are distinct existing contracts; no uniformity migration was attempted. No verified database defect required a change in this increment.

## F. Change report

`baseline.json` preserves the initial branch/status and source hashes, including substantial pre-existing workspace/YarrowTech changes. These remain intact. `patch-baseline-verification.json` verifies the reconstructed pre-task source against 21 baseline file hashes. `task-changes.patch` isolates this task from earlier app/server edits and passes a reverse dry-run.

| File modified or added by this task | Reason |
| --- | --- |
| `frontend/src/hooks/useOutsourcingSocket.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/hooks/useSupportUnread.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/services/client.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/services/hr.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/services/manager.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/services/outsourcing.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/utils/logger.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/pages/ceo/CEOChatPage.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/features/hr/hooks/useHrDashboard.js` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/admin/AdminSidebar.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/admin/AdminSupportCenter.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/ceo/CEODashboard.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/common/PortalChat.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/it/ITPortal.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/outsourcing/OutsourcingPages.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/shared/PortalSettingsPage.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/components/shared/PortalSupportPage.jsx` | Use centralized existing VITE_API_URL resolution; preserve paths, methods, auth and business logic. |
| `frontend/src/config/backend.js` | Central public backend URL configuration. |
| `frontend/src/config/backendUrl.mjs` | Pure safe URL validation/normalization. |
| `backend/server.js` | Validate before app import; retain prior job lifecycle changes. |
| `backend/config/cors.js` | Expose existing token/request-id response headers. |
| `backend/app.js` | Wire CORS exposed response headers; retain prior router changes. |
| `frontend/vite.config.js` | Validate the existing backend URL during builds. |
| `frontend/.env.example` | Document public/server settings without changing actual environment values. |
| `backend/.env.example` | Document public/server settings without changing actual environment values. |
| `docs/DEPLOYMENT.md` | Correct health response documentation. |
| `backend/__tests__/urlConfiguration.test.js` | Seven focused URL/client/refresh/CORS/startup/override regressions. |
| `backend/scripts/auditPortalConfiguration.cjs` | Reproducible source/router/environment/model inventory without DB connection. |

Additional artifacts under `docs/all-portal-audit`: README, baseline, changed-files, task-only patch and baseline verification, test-results, verification, endpoints CSV/JSON, mounts, duplicate registrations, URL/environment/dependency/database/route/frontend caller and connection inventories. These support review rather than runtime behavior. Existing browser harness screenshots in `backend/artifacts/workspace` were refreshed by verification. No files/routes were removed; no dependency upgrades were made.

## G. Test report

| Executed check | Actual result |
| --- | --- |
| Baseline backend `npm test` | 237 passed, 0 failed |
| Baseline frontend build | Passed |
| Post-change full backend `npm test` | 243 passed, 0 failed; before seventh focused test/final override adjustment |
| Final `node --test __tests__/urlConfiguration.test.js` | 7 passed, 0 failed, covers final override adjustment |
| Final frontend `npm run build` | Passed; existing large-chunk warning remains |
| `node scripts/verifyWorkspaceUi.cjs` | Passed authenticated persistence/refresh/isolation/audit, all ten workspaces, YarrowTech detail/settings/integrations, linked clients/deliveries, desktop/mobile and no runtime errors |
| Audit generator | 1,166 mounted registrations; no database connection; 86 protected source hashes unchanged |
| Full lint / final ESLint API run | Fails: 160 errors, 22 warnings; changed-file comparison found zero introduced finding groups/counts |
| `git diff --check` | Passed |
| `git apply --reverse --check docs/all-portal-audit/task-changes.patch` | Passed; no rollback applied |

The full suite includes LAW/Finance end-to-end and LAW document/access regressions. No exhaustive dedicated Policy API suite was found; unchanged source/mounts do not prove every production operation. Shared client tests preserve API version paths, refresh endpoint, credentials and project headers. Browser interception forwards API calls only to its disposable local backend, so this is not production connectivity verification. Existing Mongoose reserved-field warnings remain.

Not run: actual deployment environment server startup; production database reads/writes; live provider authentication, writes, sync, signatures or webhooks; live Cloudinary; every portal page/button; complete endpoint request/response schema, authorization and tenant-isolation matrix; live OAuth/SSO redirects. No manual production workflow is claimed verified. Full-system acceptance remains incomplete.

## H. Risks and rollback

- Provider contracts, appropriate replacement credentials and staging access block live integration acceptance. Supplying SRS credentials does not verify its protocol or enable business sync.
- Backend roots must be deployed reachable roots; avoid redundant `/api` prefixes. Separate reverse-proxy prefixes remain intact. Actual environment values were not changed or independently validated.
- Existing strict startup validation requires EFNBMMS URL/token even if a deployment does not use it, plus MongoDB and sufficiently long JWT secrets in production. This requirement was preserved. Production `CORS_ORIGIN` must be explicit; its existing fallback is localhost.
- Duplicate registrations, dead helper definitions, pagination completeness and all-handler tenant isolation need contract-specific review. Protected contracts and legacy aliases were retained.
- Full lint remains failing. Existing hook/unused-variable/duplicate-key/fast-refresh issues were not repaired through unrelated changes. Bundle-size warnings remain.
- No production index/data migration or provider retry/conflict repair was verified. Local success does not certify production readiness.

Rollback: first run the task-patch reverse dry-run above. If it applies cleanly, use `git apply --reverse docs/all-portal-audit/task-changes.patch`. This retains earlier app/server/workspace edits; do not reset the dirty worktree or restore whole shared files. Keep audit artifacts if useful. Later edits may invalidate the patch: review failing hunks rather than force it. Rebuild/redeploy the prior frontend and restart the prior backend. No database rollback is required for this task.

## I. Protected-area verification

`verification.json` lists 86 compared LAW/Policy-related paths and `protectedChanged: []`. LAW/Policy business routes, controllers, schemas, services, API clients and dedicated configuration were not edited. App mounts were not added, removed or reordered by this task; workspace/YarrowTech mount additions visible relative to HEAD were already in the baseline.

Shared auth middleware, roles/permissions, token issuance/validation contracts and Session schema remain unchanged. Shared frontend URL resolution and CORS exposure do affect LAW/Policy transport, and the report does not claim otherwise. Focused client tests, unchanged protected hashes and existing LAW regression tests supply compatibility evidence with the limits described above. Other portals received URL-resolution imports only, without intentional business-logic changes.

## J. Deployment instructions

No deployment was performed. Preserve actual secret-manager values and the current production database. Do not copy placeholder example secrets over existing values. Use separate Vite/deployment values for development, testing, staging and production.

| Existing variable | Value/requirement |
| --- | --- |
| `VITE_API_URL` | Required at frontend build; actual backend root. Local default is development-only `http://localhost:5000`; choose the real hosted root for production |
| `VITE_OUTSOURCING_PORTAL_URL` | Optional separate outsourcing backend root; otherwise central backend |
| `VITE_POLICY_API_URL`, `VITE_POLICY_PROJECT_ID`, `VITE_POLICY_CONSUMER_API_URL` | Preserve current standalone Policy configuration/contract |
| Backend `PORT` | Existing default 5000, or hosting-provided port; never assumed equal across providers |
| `MONGO_URI` | Existing intended MongoDB connection; server-only |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Existing distinct server secrets, at least 32 characters for strict production validation |
| `CORS_ORIGIN` | Exact comma-separated deployed frontend origins without paths |
| `EFNBMMS_ADMIN_MANAGEMENT_API_URL`, `EFNBMMS_API_TOKEN` | Existing documented resource URL/server token required by strict startup; legacy aliases remain |
| `EDIFYEIGHT_API_URL`, `EDIFYEIGHT_TEACHER_API_URL`, `EDIFYEIGHT_STUDY_MATERIAL_API_URL`, `EDIFYEIGHT_API_TOKEN` | Existing documented bases/resource roots and server credential; retain existing fallbacks |
| `SRS_API_BASE_URL`, `SRS_API_KEY`, `SRS_CLIENT_ID`, `SRS_SIGNING_SECRET`, `SRS_WEBHOOK_SECRET` | Existing SRS server configuration only; business contract still blocked |
| `MARKETING_PLATFORM_BASE_URL`, `MARKETING_PLATFORM_TOKEN` or `MARKETING_PLATFORM_API_KEY` | Actual documented provider and one server credential; existing path/page/timeout overrides in backend example |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Existing server upload configuration |
| `REDIS_URL`, `CACHE_ENABLED` | Existing optional cache settings |
| `WORKSPACE_SYNC_AUTOMATIC`, `WORKSPACE_SYNC_POLL_SECONDS` | Preserve actual settings; code defaults automatic processing true and enforces minimum 60-second polling. Example disables automatic processing; review provider contracts before enabling |
| Existing `*_PORTAL_URL`, `OUTSOURCING_SHARED_SECRET` | Preserve current launch/SSO settings and confirm target domains in staging |

Backend: retain Render root `backend`, existing `npm install` build, `npm start`, health path `/health`. Frontend: run `npm run build` from `frontend`, deploy `dist` with existing Vercel SPA rewrites. Backend environment/CORS changes require restart; frontend URL changes require rebuild/redeploy. No migration, seed or new database is needed for these fixes.

Post-deployment checks: confirm `/health` HTTP 200 with `success:true` and `data.status:"ok"`; authorized login; browser requests have one intended API prefix; refresh headers are readable; allowed-origin CORS and Socket.IO work; one read page per portal; negative role/project access. In staging, create/edit a disposable workspace record, refresh and verify persistence/cross-project denial. Verify LAW/Policy with their existing clients before rollout. Test documented provider reads before authorized staging writes, and never treat a public host probe as successful synchronization.
