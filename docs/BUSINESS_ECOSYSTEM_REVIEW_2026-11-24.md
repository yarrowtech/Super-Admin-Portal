# Business ecosystem review — 24 November 2026

## Assessment

The portal has broad departmental coverage and is a strong starting point for an integrated business suite. Its next stage should prioritize shared business identities, reliable handoffs and consistent controls. Adding more independent screens will not by itself produce an integrated ERP.

Scope: source review of frontend routing/navigation, Super Admin controls, backend role and authentication configuration, customer/task models, approval service, startup validation, package configuration and the existing all-portal audit. This is an architectural assessment, not exhaustive testing of every screen or endpoint. The October audit is historical evidence; its endpoint counts and provider verification status were not revalidated here. No production database or external provider was accessed, and `.env` values were not read or changed.

## Portal coverage and priorities

| Area | Existing source evidence | Next business improvement |
| --- | --- | --- |
| Super Admin | `SuperAdminControlCenter.jsx`, feature/access/company controls and project allocations | Separate business oversight from configuration; show failures explicitly |
| Admin | User management, departments, reports, workflows and support routes | Give every cross-department process an accountable owner |
| CEO | Executive dashboard, analytics and reporting controllers | Agree metric definitions, scope, currency and freshness before consolidating KPIs |
| CRM / Sales | CRM clients, contacts, follow-ups, status history and sales submissions | Link accepted opportunities to contracts, delivery and billing |
| Finance | Separate client model; invoices, payments, journal entries, budgets, review and control tower | Reconcile customer identity with CRM; preserve ledger controls during integration |
| HR | Recruitment, attendance, leave, performance and employee records | Connect approved hires to access provisioning and onboarding tasks |
| IT | Tickets, assets, access, changes and operations navigation | Link employee lifecycle to asset/access ownership and offboarding |
| Legal / Policy | Documents, contracts, compliance and disputes | Connect contract approval and renewal obligations to delivery and collections |
| Media | Project, asset library, campaigns and approval surfaces | Tie approved deliverables to contracts and billing milestones |
| Manager / Employee | Project work, shared tasks, attendance and communication | Define one accountable task owner and consistent handoff status |
| Outsourcing | Freelancer jobs, contracts, milestones, time logs and payments | Link accepted work and contractual milestones to approved payable records |
| Project workspaces / portfolio | Project registry, organization workspace and portfolio hierarchy | Define canonical organization/project identifiers and explicit mappings |
| Support / collaboration | Shared support, chat, notifications and audit services | Carry customer, project and source-record references across conversations |
| External integrations | Workspace sync, API management and provider adapters | Verify provider contracts and failure recovery in staging before enabling automation |

Presence in source establishes implementation surfaces, not production completeness or permission correctness.

## Findings with implementation implications

1. **Customer identity is fragmented.** `backend/models/crm/CRMClient.js` uses a CRM client ID and optional project reference; `backend/models/finance/Client.js` defines a different FinanceClient with name/contact fields. Introduce an explicit reviewed mapping to a canonical customer. Do not automatically merge by name or email: shared inboxes, missing emails and duplicate businesses require reconciliation.
2. **Approvals need a common contract.** `backend/services/approvalEngine.service.js` is built on the Finance approval model, while other departments expose their own review surfaces. Inventory actual states, authority and separation-of-duty rules before creating a shared inbox. The inbox must route decisions through each owning service, with record-level authorization and atomic decisions.
3. **Project identity already has multiple representations.** Allocation code accepts project names/codes/IDs, while common tasks reference MongoDB Project IDs. Preserve those contracts and add explicit lookup/mapping rather than replacing IDs across collections.
4. **Failed control-center requests were presented as empty data.** The page uses `Promise.allSettled` without reporting individual rejections. This increment reports failed sections and removes fallback zero counts and a misleading healthy dashboard KPI when the response is absent. Failed list sections still clear their previous contents; the global error names the unavailable sections.
5. **Cross-company isolation needs acceptance evidence.** Role and portal guards exist, but this review does not establish organization-level isolation across every query, export, websocket and integration. Define the actual legal-company/brand/project hierarchy before introducing multi-company accounting or consolidated reporting.
6. **Integration readiness cannot be inferred from configuration.** The existing audit records unverified provider contracts, including YarrowTech. Recheck current contracts, pagination, idempotency, signatures and reconciliation against authorized staging systems. Keep credentials server-side.
7. **Do not rebuild working foundations.** Shared tasks, auth/session controls, audit logging, cache infrastructure, integration sync and Finance workflows already exist. Extend these deliberately rather than adding competing systems.

## Recommended delivery sequence

| Priority | Deliverable | Acceptance condition |
| --- | --- | --- |
| 1 | Business vocabulary and ownership | Document company, brand, project, customer, vendor, employee and department ownership; review identifier mappings |
| 1 | Customer reconciliation | Dry-run duplicate/conflict report; reviewed mapping; existing invoices retain their original references and financial history |
| 1 | Access and operational baseline | Positive/negative access checks for each role; cross-company/project denial tests; restore rehearsal and visible service failures |
| 2 | Lead-to-cash pilot | One accepted CRM opportunity links to an approved contract, project and invoice without duplicate records; authorized retries are safe |
| 2 | Shared approval inbox | Existing department rules remain authoritative; decisions are audited; concurrent decisions cannot both win |
| 2 | Hire-to-delivery pilot | Approved onboarding links employee, access requests, assets and tasks; offboarding revokes access with an audit trail |
| 3 | Reliable automation | Durable events/outbox, idempotent consumers, bounded retries, dead-letter handling and replay visibility for selected handoffs |
| 3 | Consolidated reporting | Every metric has source, definition, time range, currency and freshness; failed sources do not become zero |
| 4 | Additional ERP domains | Validate business demand for purchasing, inventory, warehouse, payroll and tax/localization; this review does not establish their completeness |

Use vertical pilots with business sign-off before expanding across all companies. Financial reporting, payroll and tax changes need separately specified jurisdiction and accounting requirements.

## Implemented in this increment

- Added a searchable business workspace directory inside the existing `/admin/super-admin` page, with 12 links to existing routes.
- Added expandable planning guidance for lead-to-cash, hire-to-delivery and request-to-settlement. Proposed journeys are explicitly labeled and do not imply working automation.
- Made partial control-center request failures visible and replaced unknown dashboard KPI fallbacks with unavailable/unknown states.
- Preserved existing route guards, business APIs, database models and environment configuration.

This increment is the navigation and assessment foundation. Customer reconciliation, shared approvals, automation and enterprise-wide acceptance remain future implementation work; the portal should not yet be described as equivalent to a mature ERP suite.

## Validation

- Frontend production build passed; Vite reports large bundle chunks, including the document export library.
- New `BusinessEcosystem.jsx` passes ESLint.
- Targeted lint of the control center reports its existing synchronous state updates from the mount effect and missing `load` dependency. That effect was present before this increment and remains unchanged.
- `npm run validate:structure` cannot run because the package script references a missing `frontend/scripts/validate-structure.mjs` file.
- `git diff --check` passed. Browser interaction, live role access, production workflows and external integrations were not tested in this increment.

## Role and portal corrections

The follow-up implementation places the ecosystem directory in the **active** `SuperAdminDashboard.jsx`. The original insertion into `SuperAdminControlCenter.jsx` was in an inactive component; its page export previously concealed this by using the name `SuperAdminControlCenterPage`. The active export is now named `SuperAdminDashboardPage`.

- Frontend and backend now share non-sensitive default portal policy from `backend/config/portalAccessPolicy.json`. This location is included in the backend's configured deployment root.
- Super Admin can enter department portals by default, inherits Admin action permissions and passes Admin-capable role guards. Specialist-only gates and record/project checks remain authoritative. Explicit stored portal denials override defaults, including Super Admin denials.
- `/api/auth/portal-access` returns the authenticated user's current effective portal rules without caching. Login, session bootstrap and window focus load this snapshot for navigation. Backend portal middleware reads current rules independently. Deploy frontend and backend together because the frontend now requires this endpoint.
- Portal access is an additional restriction, not a job-role assignment. A portal setting cannot bypass a page's role guard or an API's action/record checks. Selected cross-portal API defaults (HR to Admin, CEO to Media, Legal employees to Employee) are preserved without providing those users a different role's full workspace.
- Both default-route callers use one implementation. Finance employees land in Finance; Finance Manager and Legal Head mappings are explicit. A revoked landing portal falls back to another permitted role-compatible workspace, or `/access-denied` if none exists.
- Freelancers no longer automatically bypass EdifyEight teacher/study-material permission checks. They require direct or EEC-assigned action permissions; unrelated project grants do not count. Frontend wildcard handling now matches the backend. Existing broad project-workspace visibility is a separate policy and was not changed.
- Auth responses now include effective action permissions so granted controls can be rendered accurately.

These corrections retain the existing single primary user role and project permissions. Multiple company-scoped role memberships and an active-company switcher are a separate product feature requiring a scoped data and authorization design; they are not introduced by this fix.

Follow-up validation: 33 selected access, permission, role-allocation, project-scope and user-management checks pass. Targeted ESLint for the changed access helpers, Auth context and new UI components passes. Production build passes. No production credentials, account assignments or database records were changed; live browser/account acceptance remains outstanding.
