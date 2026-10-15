# Historical Workspace Audit

For the current scoped YarrowTech implementation and verification, see
[YARROWTECH_IMPLEMENTATION.md](YARROWTECH_IMPLEMENTATION.md). The initial audit
below predates subsequent implementation and integration verification.

## Architecture and hierarchy

The existing React/Vite frontend and Express/Mongoose backend remain in place.
HOUSE_OF_MUSA and its seven brands come from utils/projectAccess.js. Project
codes remain the workspace authorization identity. Existing common/Project
ObjectIds and policy API identities have not been migrated or replaced.
The YarrowTech brand contains several projects; those are child projects,
not automatically product records owned by the YARROWTECH project.

## Central persistence

WorkspaceRecord stores service, product, customer, subscription, plan and ticket
records in the existing MongoDB connection. Each record has immutable
organizationId, brandId, projectId and kind. Product/customer references are
checked against the same authorized project before insertion. External mapping
fields and a partial unique index prevent duplicate provider identifiers.
Externally owned records reject local updates and cancellation.

This is an additive collection. No existing records are deleted or rewritten.
Indexes are declared in the schema; production rollout must create and verify
them using the deployment's index procedure before importing external data.
No production migration or provider request was executed.

## Module inventory

| Module | Frontend | Internal API under /api/v1 | Source / database | Status |
| --- | --- | --- | --- | --- |
| Directory | /admin/projects | existing /api/my-projects and workspace catalog | existing project registry and access metadata | Preserved |
| Workspace | /admin/projects/:projectCode | /projects/:projectId/workspace, /modules | existing registry | Existing configuration; not persisted workspace configuration |
| Services | /yarrowtech/services | GET/POST /projects/:projectId/services; GET/PATCH /services/:id | WorkspaceRecord service | Persistent API and read UI |
| Products | /yarrowtech/products and /:productId | GET/POST /projects/:projectId/products; GET/PATCH /products/:id; GET /products/:id/workspace | WorkspaceRecord product | Persistent API and read UI |
| Subscriptions | /yarrowtech/subscriptions and product subscriptions | GET/POST /subscriptions; GET /subscriptions/:id; POST /subscriptions/:id/cancel; GET /products/:id/subscriptions | WorkspaceRecord subscription | Internal subscription records; no billing engine |
| Plans | No dedicated editor | GET /products/:id/plans; POST /projects/:projectId/plans | WorkspaceRecord plan | Basic records; no price/currency/billing validation |
| Customers | /yarrowtech/crm/customers | GET/POST /projects/:projectId/customers; GET/PATCH /customers/:id | WorkspaceRecord customer | Persistent API and read UI |
| Support | /yarrowtech/crm/support | GET/POST /projects/:projectId/support/tickets; GET/PATCH /support/tickets/:id | WorkspaceRecord ticket | Persistent API and read UI |
| Users | /yarrowtech/crm/users | GET /projects/:projectId/users | User metadata.projectAssignments | Exact active projectCode assignments only; legacy assignment forms omitted |
| Analytics | /yarrowtech/crm/analytics | GET /projects/:projectId/analytics | scoped WorkspaceRecord aggregation | Counts by kind/status |
| Integrations | /yarrowtech/admin/integrations | integration detail/status/capabilities | server environment inventory | Project authorization enforced; unverified |

Resource lists are paginated (page, limit; default 25, maximum 100) and return
{success:true,data:{items,total,page,limit}}. Detail/mutation responses return
{success:true,data:record}. Mutations require admin privileges or workspace.write.
Database unavailability raises HTTP 503 and never returns fabricated empty data.
The UI displays the first page and total; pagination controls and mutation forms
remain to be implemented. Existing policy /projects routes take precedence;
new workspace resource paths do not replace the policy contracts.

## Provider inventory and configuration

Existing server adapters: edifyEightTeacher.service.js,
edifyEightStudyMaterial.service.js, efnbmmsAdminManagement.service.js and
efnbmmsProxy.service.js. Their existing routes and authentication are preserved.
Inventory reads EFNBMMS_ADMIN_MANAGEMENT_API_URL / EFNBMMS_API_TOKEN and
EDIFYEIGHT_TEACHER_API_URL / EDIFYEIGHT_STUDY_MATERIAL_API_URL /
EDIFYEIGHT_API_TOKEN. Some existing adapters additionally support base-URL
fallbacks; the workspace inventory does not yet reconcile these fallbacks.
MONGO_URI remains the central database configuration.

No external URL, scopes, pagination, rate limits, webhook signature or write
contract has been independently verified. No secret values appear in this
report or workspace responses. Provider inbound/outbound synchronization,
durable jobs/outbox, retries, cursors, conflict reconciliation, audit records,
webhook verification and connection testing remain incomplete. Existing 501
handlers remain disabled rather than reporting successful remote operations.

## Verification

The focused workspace unit tests verify isolation, operation permissions,
database query scoping, outage handling and deduplication index declaration.
workspacePersistence.test.js exercises real disposable MongoDB persistence,
cross-project references/access, cancellation and duplicate external IDs.
The backend regression run passed 230 tests. The separately executed disposable
MongoDB persistence test passed. The frontend production build and targeted lint
passed. A subsequent focused run covers the final revoked-assignment fix.
Production database persistence, logged-in browser workflows and
live provider inbound/outbound synchronization require separate verification.

## Remaining acceptance gaps

Persistent organization/brand/workspace configuration, full membership migration,
project ObjectId resolution, complete UI editors/pagination, resource-specific
business schemas, billing lifecycle, audit logs and reliable provider sync are
not complete. The requested complete-system acceptance criteria are not met.
