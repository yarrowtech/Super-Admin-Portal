# YarrowTech Implementation

## Scope and Audit

The existing application uses React, React Router, TanStack Query, Express and
Mongoose with the central MongoDB connection. The worktree already contained
organization/workspace and other-provider changes from earlier requests. This
increment adds YarrowTech functionality without reverting those changes.

LAW and Policy implementation, authentication, models, API clients and
configuration were not edited for this increment. The YarrowTech router is
mounted after the existing Policy router, preserving its precedence. Other
provider adapters were not edited in this increment.

The initial YarrowTech audit found persistent basic records and scoped CRUD,
but incomplete admin routes, incorrect client/project aliases, missing product
settings and archive handlers, and no verified SRS client protocol. The changes
below address the internal workflow gaps. External SRS operations remain blocked.

## Routes and Data Flow

The canonical base is `/admin/projects/YARROWTECH`. Existing `/yarrowtech/...`
links remain supported. All routes require the existing authenticated Admin
portal guard; the backend independently checks project and operation access.

| Frontend Suffix | Internal API under /api/v1 | Service / Persistence | External API |
| --- | --- | --- | --- |
| /overview | /projects/YARROWTECH/overview | organizationWorkspace / WorkspaceRecord and configuration | Unverified |
| /services | GET/POST /projects/YARROWTECH/services | workspaceRecords / WorkspaceRecord | Unverified |
| /services/:id | GET/PATCH /services/:id | workspaceRecords / WorkspaceRecord | Unverified |
| /services/:id | GET/PATCH /services/:id/settings; POST /services/:id/archive | yarrowtechOperations / resource details and record history | Unverified |
| /services/clients | /projects/YARROWTECH/service-clients | yarrowtechOperations / linked customer records | Unverified |
| /services/projects | GET/POST /projects/YARROWTECH/service-projects; PATCH /service-projects/:id | yarrowtechOperations / YarrowtechServiceProject | Unverified |
| /products | GET/POST /projects/YARROWTECH/products | workspaceRecords / WorkspaceRecord | Unverified |
| /products/:id | GET/PATCH /products/:id; GET /products/:id/workspace; POST /products/:id/archive | workspaceRecords and yarrowtechOperations / WorkspaceRecord | Unverified |
| /products/:id/settings | GET/PATCH /products/:id/settings | yarrowtechOperations / YarrowtechResourceDetails | Unverified |
| /products/:id/users | GET/POST /products/:id/users | workspaceRecords / WorkspaceProductMember and existing User | Unverified |
| /products/:id/plans | /products/:id/plans; POST /projects/YARROWTECH/plans | workspaceRecords / plan records | Unverified |
| /products/:id/subscriptions | /products/:id/subscriptions | workspaceRecords / product-scoped subscriptions | Unverified |
| /subscriptions and /subscriptions/:id | GET/POST /subscriptions; GET/PATCH /subscriptions/:id; POST /subscriptions/:id/cancel | workspaceRecords / internal subscription records | Unverified |
| /subscriptions/:id | /subscriptions/:id/payments | yarrowtechOperations / YarrowtechPayment | No verified payment provider |
| /crm/users | /projects/YARROWTECH/users | workspaceRecords / existing project assignments | Existing local identities |
| /crm/customers and /:id | GET/POST /projects/YARROWTECH/customers; GET/PATCH /customers/:id | workspaceRecords / customer records | Unverified |
| /crm/support and /:id | GET/POST /projects/YARROWTECH/support/tickets; GET/PATCH /support/tickets/:id | workspaceRecords / ticket records | Unverified |
| /crm/analytics | /projects/YARROWTECH/analytics | scoped record aggregation | Local counts |
| /crm/activity | /projects/YARROWTECH/activity and /audit-logs | scoped histories from records, settings, deliveries, memberships and integration jobs | Local audit |
| /integrations and /integrations/yarrowtech-srs | /projects/YARROWTECH/integrations; /integrations/yarrowtech-srs; /status; /capabilities | yarrowtechApi / configuration presence and stored connection checks | Base URL only verified |
| /sync-jobs and /sync-history | /projects/YARROWTECH/sync-history; /integrations/yarrowtech-srs/sync-jobs | WorkspaceSyncJob | SRS enqueue blocked |
| /settings | PATCH /projects/YARROWTECH/workspace | WorkspaceConfiguration | Internally owned |

Record lists support pagination, search and relevant status filters. Detail IDs
are checked against YARROWTECH even when the actor can access another project.
Service projects explicitly reference an existing YarrowTech service and customer;
owners and team members must have access to YarrowTech. Delivery tasks and status
are persisted. Service-project requests support idempotency keys and optimistic
revision checks. Product identifiers have a scoped unique index.

## Ownership and Payments

Internal records are managed locally and have atomic record history. Archiving
preserves records and marks them inactive with archivedAt; archived records are
read-only. Subscription prices are snapshots of their selected plans.

Local saves do not create subscriptions or charges on an external platform.
Payment history reads stored provider transaction records. There is no endpoint
that fabricates paid transactions. No payment webhook or payment-success logic
has been invented. Notification settings are saved preferences, not confirmation
that notification delivery infrastructure or a provider notification API exists.

## SRS Contract Verification

The supplied base `https://api.yarrowtech.in` responded HTTP 200 to an
unauthenticated public GET. This verifies host reachability only. Public
documentation probes at /openapi.json, /swagger.json, /api-docs and /docs returned
404. These discovery candidates are not registered business-resource paths.

No authenticated SRS resource request was made. The following remain unknown:
API version, resource paths, authentication headers, client identification,
request-signing algorithm, canonical request/body hashing, timestamp/nonce rules,
pagination, rate limits, write capabilities and webhook signature/replay format.

The SRS integration returns status blocked and no claimed provider capabilities.
Its test action performs only a public host probe and preserves that blocked
status. Sync returns HTTP 409 YARROWTECH_CONTRACT_UNVERIFIED and creates no job.
No unverified webhook receiver is exposed. Existing jobs for other providers are
not evidence of working YarrowTech synchronization.

## Configuration and Migration

The isolated config/yarrowtech.js reads SRS_API_BASE_URL, SRS_API_KEY,
SRS_CLIENT_ID, SRS_SIGNING_SECRET and SRS_WEBHOOK_SECRET. Credentials stay on the
server. Public responses include only URL, configuration presence and blockers.
Previously exposed credentials must be rotated at the provider and replaced in
secure server-side configuration before production use. Provider rotation was
not performed by this implementation.

The additive models are YarrowtechResourceDetails, YarrowtechServiceProject and
YarrowtechPayment, using the existing MongoDB connection and scoped indexes.
WorkspaceRecord gains an optional archivedAt field. No existing LAW, Policy,
other-project or production business records were migrated or deleted.

## Verification

Run from backend:

```powershell
node --test __tests__/yarrowtechOperations.test.js
node scripts/verifyWorkspaceUi.cjs
```

The focused tests cover settings persistence, linked clients and deliveries,
archive behavior, project isolation, payment reads, audit events, blocked SRS
sync and credential-free public probes. The browser harness uses disposable
MongoDB, actual authenticated HTTP handlers and the production frontend bundle.
It never forwards mutations to production services.

Run frontend build and targeted lint from frontend:

```powershell
npm run build
npx eslint src/components/yarrowtech src/services/organizationWorkspace.js src/routes/AppRoutes.jsx
```

Verified results for this increment:

- Full backend suite: 237 passed, zero failed.
- Focused YarrowTech suite: two passed, zero failed.
- Production frontend build passed; existing large-chunk warning remains.
- Targeted frontend lint: zero errors, one existing AppRoutes hook warning.
- Browser harness passed authenticated persistence, refresh, project isolation,
  audit history, all ten workspaces, canonical YarrowTech detail routes, linked
  clients/deliveries and desktop/mobile layouts, with no runtime errors.
- git diff --check passed.

Broad repository lint
has previously reported unrelated failures; a passing targeted check does not
mean repository-wide lint is clean.

## Remaining Blocker

Official SRS documentation or provider source code is required before connecting
authenticated inbound/outbound business operations. Replacement credentials and
the documented webhook/payment contracts are also required for production
verification. The full external-integration acceptance criteria are not met.
