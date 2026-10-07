## Portal-wise Feature & Completion Checklist

Prepared for: Manager review | Project: Super Admin Portal | Review date: 23 September 2026

Scope: Current local source code, including uncommitted changes. This document inventories features and provides acceptance checkboxes.

Status key: PRESENT [x] = route, page or component found in source. WORKING [ ] = runtime verification pending. COMPLETE [ ] = requirements acceptance pending. An empty box means unverified, not failed.

No feature has been marked working or complete. No live walkthrough, build, automated test run or business acceptance review was performed for this document.

How to verify each row: Open with the correct role, perform the primary action, confirm saved data after refresh where relevant, and check access restrictions. Record the result, tester, date and issue reference in Notes. Tick Working only after a pass; tick Complete after requirements are accepted.

Source basis: frontend/src/routes/AppRoutes.jsx and frontend/src/config/portalMenus.js; additional components listed in the evidence section. Presence alone does not establish full implementation or production readiness.

## 1. Super Admin

Location: /admin/super-admin

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 1.1 | Control-center dashboard | [x] | [ ] | [ ] | ________________ |
| 1.2 | Feature flags | [x] | [ ] | [ ] | ________________ |
| 1.3 | Portal access | [x] | [ ] | [ ] | ________________ |
| 1.4 | Company controls | [x] | [ ] | [ ] | ________________ |
| 1.5 | Project allocations | [x] | [ ] | [ ] | ________________ |
| 1.6 | System health | [x] | [ ] | [ ] | ________________ |

## 2. Admin

Location: /admin

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 2.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 2.2 | Users and roles | [x] | [ ] | [ ] | ________________ |
| 2.3 | Projects and hosted workspaces | [x] | [ ] | [ ] | ________________ |
| 2.4 | Departments | [x] | [ ] | [ ] | ________________ |
| 2.5 | Security | [x] | [ ] | [ ] | ________________ |
| 2.6 | System logs | [x] | [ ] | [ ] | ________________ |
| 2.7 | Reports | [x] | [ ] | [ ] | ________________ |
| 2.8 | Workflows | [x] | [ ] | [ ] | ________________ |
| 2.9 | Digital portfolios, categories and assets | [x] | [ ] | [ ] | ________________ |
| 2.10 | Legal registry | [x] | [ ] | [ ] | ________________ |
| 2.11 | Legal library | [x] | [ ] | [ ] | ________________ |
| 2.12 | Sales submissions | [x] | [ ] | [ ] | ________________ |
| 2.13 | Outsourcing dashboard | [x] | [ ] | [ ] | ________________ |
| 2.14 | Freelancers | [x] | [ ] | [ ] | ________________ |
| 2.15 | Outsourcing jobs | [x] | [ ] | [ ] | ________________ |
| 2.16 | Outsourcing contracts | [x] | [ ] | [ ] | ________________ |
| 2.17 | Outsourcing reports | [x] | [ ] | [ ] | ________________ |
| 2.18 | Outsourcing support | [x] | [ ] | [ ] | ________________ |
| 2.19 | EFNBMMS admin management | [x] | [ ] | [ ] | ________________ |
| 2.20 | EdifyEight workspace | [x] | [ ] | [ ] | ________________ |
| 2.21 | Support center | [x] | [ ] | [ ] | ________________ |
| 2.22 | Settings | [x] | [ ] | [ ] | ________________ |

## 3. CEO

Location: /ceo/dashboard

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 3.1 | Overview dashboard | [x] | [ ] | [ ] | ________________ |
| 3.2 | Project overview | [x] | [ ] | [ ] | ________________ |
| 3.3 | Revenue analytics | [x] | [ ] | [ ] | ________________ |
| 3.4 | Product insights | [x] | [ ] | [ ] | ________________ |
| 3.5 | Employee analytics | [x] | [ ] | [ ] | ________________ |
| 3.6 | Department insights | [x] | [ ] | [ ] | ________________ |
| 3.7 | Media analysis | [x] | [ ] | [ ] | ________________ |
| 3.7b | Marketing analytics | [x] | [x] | [ ] | **Added 7 October 2026.** Sidebar module + deep-link route `/ceo/marketing-analytics`; interactive India activity map (Leaflet, volume-sized markers, zoom clustering, heat bands), KPI cards, channel donut, state bar chart, campaign table, contact table and detail drawer. Reads an external marketing platform through `backend/integrations/marketingPlatform/*`; credentials stay server-side. 13 tests in `marketingAnalytics.test.js`. **Not yet exercised against a live platform** — see note 8 |
| 3.8 | Sales query analytics | [x] | [ ] | [ ] | ________________ |
| 3.9 | Reports | [x] | [ ] | [ ] | ________________ |
| 3.10 | Project updates | [x] | [ ] | [ ] | ________________ |
| 3.11 | Legal approval | [x] | [ ] | [ ] | ________________ |
| 3.12 | Chat | [x] | [ ] | [ ] | ________________ |
| 3.13 | Notifications | [x] | [ ] | [ ] | ________________ |
| 3.14 | Settings | [x] | [ ] | [ ] | ________________ |
| 3.15 | Support | [x] | [ ] | [ ] | ________________ |

## 4. HR

Location: /hr

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 4.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 4.2 | Project overview | [x] | [ ] | [ ] | ________________ |
| 4.3 | Attendance | [x] | [ ] | [ ] | ________________ |
| 4.4 | Leave | [x] | [ ] | [ ] | ________________ |
| 4.5 | Recruitment | [x] | [ ] | [ ] | ________________ |
| 4.6 | Jobs | [x] | [ ] | [ ] | ________________ |
| 4.7 | Performance | [x] | [ ] | [ ] | ________________ |
| 4.8 | Communication | [x] | [ ] | [ ] | ________________ |
| 4.9 | Profiles | [x] | [ ] | [ ] | ________________ |
| 4.10 | Tasks and work updates | [x] | [ ] | [ ] | ________________ |
| 4.11 | Outsourcing | [x] | [ ] | [ ] | ________________ |
| 4.12 | Settings | [x] | [ ] | [ ] | ________________ |
| 4.13 | Support | [x] | [ ] | [ ] | ________________ |

## 5. IT

Location: /it/dashboard

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 5.1 | Overview | [x] | [ ] | [ ] | ________________ |
| 5.2 | Project overview | [x] | [ ] | [ ] | ________________ |
| 5.3 | Products and product workspace | [x] | [ ] | [ ] | ________________ |
| 5.4 | Tickets and ticket details | [x] | [ ] | [ ] | ________________ |
| 5.5 | Assets and asset details | [x] | [ ] | [ ] | ________________ |
| 5.6 | Security | [x] | [ ] | [ ] | ________________ |
| 5.7 | User access | [x] | [ ] | [ ] | ________________ |
| 5.8 | Changes | [x] | [ ] | [ ] | ________________ |
| 5.9 | Operations | [x] | [ ] | [ ] | ________________ |
| 5.10 | Tasks | [x] | [ ] | [ ] | ________________ |
| 5.11 | Attendance | [x] | [ ] | [ ] | ________________ |
| 5.12 | Team | [x] | [ ] | [ ] | ________________ |
| 5.13 | Messages | [x] | [ ] | [ ] | ________________ |
| 5.14 | Reports | [x] | [ ] | [ ] | ________________ |
| 5.15 | Activity | [x] | [ ] | [ ] | ________________ |
| 5.16 | Settings | [x] | [ ] | [ ] | ________________ |
| 5.17 | Support and support center | [x] | [ ] | [ ] | ________________ |

## 6. Manager

Location: /manager

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 6.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 6.2 | Projects | [x] | [ ] | [ ] | ________________ |
| 6.3 | Project overview | [x] | [ ] | [ ] | ________________ |
| 6.4 | Team | [x] | [ ] | [ ] | ________________ |
| 6.5 | Tasks | [x] | [ ] | [ ] | ________________ |
| 6.6 | Work reviews | [x] | [ ] | [ ] | ________________ |
| 6.7 | Attendance | [x] | [ ] | [ ] | ________________ |
| 6.8 | Leave | [x] | [ ] | [ ] | ________________ |
| 6.9 | Settings | [x] | [ ] | [ ] | ________________ |
| 6.10 | Support | [x] | [ ] | [ ] | ________________ |

## 7. Employee

Location: /employee

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 7.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 7.2 | Project overview | [x] | [ ] | [ ] | ________________ |
| 7.3 | Projects | [x] | [ ] | [ ] | ________________ |
| 7.4 | Tasks | [x] | [ ] | [ ] | ________________ |
| 7.5 | Attendance | [x] | [ ] | [ ] | ________________ |
| 7.6 | Leave | [x] | [ ] | [ ] | ________________ |
| 7.7 | Documents | [x] | [ ] | [ ] | ________________ |
| 7.8 | Team | [x] | [ ] | [ ] | ________________ |
| 7.9 | Profile | [x] | [ ] | [ ] | ________________ |
| 7.10 | Chat | [x] | [ ] | [ ] | ________________ |
| 7.11 | Jobs | [x] | [ ] | [ ] | ________________ |
| 7.12 | Settings | [x] | [ ] | [ ] | ________________ |
| 7.13 | Support | [x] | [ ] | [ ] | ________________ |

## 8. Finance

Location: /finance/dashboard

Verification basis for this section (1 October 2026, payroll rows revised 6 October 2026): `npm run verify:finance-portal` logs in as a real finance head and a real finance employee over HTTP and exercises the endpoint table in that script — all returned 200, with a finance employee refused a head-only chart-of-accounts write (403) and an unauthenticated request refused (401). **Running the suite:** use `npm test` in `backend/`. It caps Node's test concurrency at 2 because every suite boots its own in-memory MongoDB replica set; past roughly 18 suites a fully parallel run exhausts the machine and tests fail on timeouts rather than on logic. `npm run test:serial` runs them one at a time if a machine is still too small.

Automated suites, re-run 6 October 2026 after the Control Tower / Risk & Recovery build: **88 finance tests pass** (`backend/__tests__/finance*.test.js`, `vendorLedger.test.js`, `e2e.financeLawWorkflow.test.js`) — up from 45, with 43 added across `financeDispute`, `financeRefund`, `financeNonCompliance` and `financeControlTower`. The whole backend suite is **169 of 169 as at 7 October 2026** — the HR project-overview failure carried in review note 5 since 1 October has been fixed and is described there.

The payroll probe and the salary-profile 403 check were removed with the feature; the access-control gate now probes a head-only account write instead.

Working is ticked where an endpoint returned a correct authenticated response AND the behaviour behind it is covered by a named automated test. Rows reachable but not covered by a finance-specific test are left unticked. Complete stays unticked throughout: that is a business acceptance decision, not a technical one.

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 8.1 | Overview | [x] | [x] | [ ] | `/dashboard` 200. KPIs from server aggregates; `reports agree with each other and with the ledger` |
| 8.2 | Department profiles / project overview | [x] | [x] | [ ] | `/departments` 200; departmental P&L test |
| 8.3 | Invoices and invoice details | [x] | [x] | [ ] | `invoice maths…`, `multi-line invoice with mixed GST slabs…`, `draft to issued to part-paid to credit-noted…` |
| 8.4 | Payments | [x] | [x] | [ ] | `partial payments, duplicate references, overpayment and reversal`; `bank reconciliation…`; overdue-invoice escalation to the finance head and the project manager runs nightly (`financeOverdueEscalation.test.js`, 10 cases) |
| 8.5 | Expenses | [x] | [x] | [ ] | `expenses: documents before verification, separate approver, budget cannot be exceeded`; plus `a split expense must account for the whole amount, and posts one debit per allocation` and `an unsplit expense still posts a single debit line` — one cost can be split across departments/projects, and approval posts one debit line per share |
| 8.6 | Budgets | [x] | [x] | [ ] | Budget utilisation/alert assertions in the expenses test; audited adjustments |
| 8.7 | Payroll | — | — | — | Removed 6 October 2026. Payroll management (runs, salary profiles, payslips, PF/PT withholding, the HR payroll-sync and hr-trigger endpoints) was deleted from the portal at the owner's direction. No replacement; HR holds no payroll implementation of its own. |
| 8.8 | Accounting | [x] | [x] | [ ] | `unbalanced journal entries cannot be submitted; balanced ones post on approval` |
| 8.9 | Tasks | [x] | [ ] | [ ] | `/tasks`, `/attendance`, `/members` 200. Shared department module; no finance-specific test |
| 8.10 | Leave | [x] | [ ] | [ ] | Personal records via `/api/dept/employee/leave` 200, not a finance route. Untested here |
| 8.11 | Documents | [x] | [ ] | [ ] | Personal records via `/api/employee/documents` 200, not a finance route. Untested here |
| 8.12 | Team | [x] | [ ] | [ ] | `/team` 200. Shared collab module; no finance-specific test |
| 8.13 | Messages | [x] | [ ] | [ ] | `/chat/threads` 200. Shared collab module; no finance-specific test |
| 8.14 | Reports | [x] | [x] | [ ] | `/reports/trial-balance`, `/reports/departmental-pnl` 200; ledger-consistency test. Project P&L / contribution margin and a cash flow statement added 6 Oct 2026; tax-liability reports retired (see note 6) |
| 8.15 | Compliance | [x] | [x] | [ ] | `tax rules: effective dates, overlap, immutability and head-only configuration`. Tax-rule configuration retained; tax *reporting* removed |
| 8.16 | Vendor and client directory | [x] | [x] | [ ] | 9 vendor-ledger tests incl. concurrent-overspend and duplicate-reference rollback |
| 8.17 | Activity | [x] | [x] | [ ] | `/audit-logs` 200; audit entries asserted across the financial tests |
| 8.18 | Approvals | [x] | [x] | [ ] | `queue: head sees the whole team…`; `submitting an invoice notifies the head…` |
| 8.19 | Settings | [x] | [x] | [ ] | `/settings` 200; `PUT /settings` is head-only and validates every key. Drives document prefixes and Control Tower thresholds |
| 8.20 | Support | [x] | [ ] | [ ] | Static page; no endpoint and no test |
| 8.21 | Disputes and refunds | [x] | [x] | [ ] | `financeDispute.test.js` (10), `financeRefund.test.js` (10). Raising a dispute freezes payment on the subject; refunds are capped at the unrefunded receipt and re-checked at processing |
| 8.22 | Non-compliance tracking | [x] | [x] | [ ] | `financeNonCompliance.test.js` (11), incl. escalation into a payment-freezing dispute and the department-scoped justification guard |
| 8.23 | Finance Control Tower | [x] | [x] | [ ] | `financeControlTower.test.js` (12), incl. the card/drill-down agreement invariant and graceful degradation when one aggregation fails |

Known gaps in this portal, carried forward rather than hidden:

1. Two invoices hold negative amounts (`INV-202601-4584`, `INV-202601-8248`, −1000 each). A converter now exists: `npm run audit:negative-invoices` reports what it would change (dry run, confirmed to find exactly these two), and `npm run migrate:negative-invoices` converts each into a credit note, voids the invoice at zero and posts a balanced correcting entry. Idempotent via `sourceKey`. **Not yet run against any database** — take a backup first; this remains a business decision.
2. The GST/TDS seed rates are the common defaults. Verify against current statute before filing. (PF and Professional Tax, and the `FINANCE_PF_RATE_BP` / `FINANCE_PF_WAGE_CEILING` / `FINANCE_PT_DISABLED` settings, went with payroll on 6 October 2026 — see row 8.7.)
3. Income-tax TDS on salary no longer applies; it went with payroll on 6 October 2026. TDS on vendor/customer invoices is unaffected and still driven by the configured tax rules.
4. External filing integrations (GSTN, TRACES) are not connected. Tax *reporting* was removed on 6 October 2026 at the owner's direction: `/reports/tax-summary`, `/reports/itr-summary`, `/tax/gst-return`, `/tax/tds-return` and their CSV exports are gone. Tax *rules* (`/tax-rules`) and invoice GST/TDS fields are deliberately kept — `ruleFor()` in `operations.service.js` refuses an invoice whose non-zero GST rate has no active rule, and the invoice-maths tests assert it. No tax calculation or tax reporting was added.
5. Rows 8.9–8.13 and 8.20 are reachable but rely on shared modules owned outside finance; they need their own tests before anyone ticks Working. (8.19 Settings now has its own head-only write path and validation, so it is ticked.)
6. The Control Tower's traffic-light thresholds and all document prefixes are stored in `FinanceSetting` and editable by the Finance Head via `PUT /settings`. Defaults are in `services/finance/settings.service.js`; an unknown key is rejected rather than silently stored.
7. Four design questions were resolved during the 6 October build and are recorded here because they are reversible: bad debt posts to a new account **5800** (5200 was already Rent in the seeded chart); the dispute freeze blocks *incoming payment* on a disputed invoice and *outgoing payment* on a disputed vendor, but does **not** block issuing new invoices to a disputed client; a Project Manager or Department Head may answer a justification for their own department (`POST /justifications/:id/respond` is the only finance route open to a non-finance role); and `missed_deadline` non-compliance is raised manually, not auto-detected from project task dates.

## 9. Law

Location: /law

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 9.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 9.2 | Project overview | [x] | [ ] | [ ] | ________________ |
| 9.3 | Assigned legal work | [x] | [ ] | [ ] | ________________ |
| 9.4 | Outsourcing contracts | [x] | [ ] | [ ] | ________________ |
| 9.5 | Agreements | [x] | [ ] | [ ] | ________________ |
| 9.6 | Work-on-hire contracts | [x] | [ ] | [ ] | ________________ |
| 9.7 | Third-party contracts | [x] | [ ] | [ ] | ________________ |
| 9.8 | Legal documents | [x] | [ ] | [ ] | ________________ |
| 9.9 | Approved library | [x] | [ ] | [ ] | ________________ |
| 9.10 | Privacy and policy | [x] | [ ] | [ ] | ________________ |
| 9.11 | Policy API | [x] | [ ] | [ ] | ________________ |
| 9.12 | IP and copyright | [x] | [ ] | [ ] | ________________ |
| 9.13 | Disputes and fraud | [x] | [ ] | [ ] | ________________ |
| 9.14 | Tasks | [x] | [ ] | [ ] | ________________ |
| 9.15 | Attendance | [x] | [ ] | [ ] | ________________ |
| 9.16 | Team | [x] | [ ] | [ ] | ________________ |
| 9.17 | Messages | [x] | [ ] | [ ] | ________________ |
| 9.18 | Jobs | [x] | [ ] | [ ] | ________________ |
| 9.19 | Leave | [x] | [ ] | [ ] | ________________ |
| 9.20 | Settings | [x] | [ ] | [ ] | ________________ |
| 9.21 | Support | [x] | [ ] | [ ] | ________________ |

## 10. Media - team and head

Location: /media/dashboard; /media/head

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 10.1 | Team dashboard | [x] | [ ] | [ ] | ________________ |
| 10.2 | Project details | [x] | [ ] | [ ] | ________________ |
| 10.3 | Asset review | [x] | [ ] | [ ] | ________________ |
| 10.4 | Content management | [x] | [ ] | [ ] | ________________ |
| 10.5 | Head dashboard | [x] | [ ] | [ ] | ________________ |
| 10.6 | Head project workspace | [x] | [ ] | [ ] | ________________ |
| 10.7 | Project alerts and pending approvals | [x] | [ ] | [ ] | ________________ |
| 10.8 | Marketing plan edit history | [x] | [ ] | [ ] | ________________ |
| 10.9 | Sales overview | [x] | [ ] | [ ] | ________________ |
| 10.10 | Marketing overview | [x] | [ ] | [ ] | ________________ |

## 11. Sales

Location: /media/sales

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 11.1 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 11.2 | Queries | [x] | [ ] | [ ] | ________________ |
| 11.3 | Submissions | [x] | [ ] | [ ] | ________________ |
| 11.4 | Project overview | [x] | [ ] | [ ] | ________________ |
| 11.5 | Tasks | [x] | [ ] | [ ] | ________________ |
| 11.6 | Team | [x] | [ ] | [ ] | ________________ |
| 11.7 | Messages | [x] | [ ] | [ ] | ________________ |
| 11.8 | Attendance | [x] | [ ] | [ ] | ________________ |
| 11.9 | Profile | [x] | [ ] | [ ] | ________________ |
| 11.10 | Settings | [x] | [ ] | [ ] | ________________ |
| 11.11 | Support | [x] | [ ] | [ ] | ________________ |

## 12. Outsourcing

Location: /outsourcing

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 12.1 | Dedicated login | [x] | [ ] | [ ] | ________________ |
| 12.2 | Dashboard | [x] | [ ] | [ ] | ________________ |
| 12.3 | Projects and hosted workspaces | [x] | [ ] | [ ] | ________________ |
| 12.4 | EFNBMMS admin management | [x] | [ ] | [ ] | ________________ |
| 12.5 | EdifyEight workspace | [x] | [ ] | [ ] | ________________ |
| 12.6 | EdifyEight teachers | [x] | [ ] | [ ] | ________________ |
| 12.7 | Jobs | [x] | [ ] | [ ] | ________________ |
| 12.8 | Contracts | [x] | [ ] | [ ] | ________________ |
| 12.9 | Time logs | [x] | [ ] | [ ] | ________________ |
| 12.10 | Tasks | [x] | [ ] | [ ] | ________________ |
| 12.11 | Assigned legal work | [x] | [ ] | [ ] | ________________ |
| 12.12 | Attendance | [x] | [ ] | [ ] | ________________ |
| 12.13 | Recruitment | [x] | [ ] | [ ] | ________________ |
| 12.14 | Profile | [x] | [ ] | [ ] | ________________ |
| 12.15 | Activity | [x] | [ ] | [ ] | ________________ |
| 12.16 | Payments | [x] | [ ] | [ ] | ________________ |
| 12.17 | Settings | [x] | [ ] | [ ] | ________________ |
| 12.18 | Support | [x] | [ ] | [ ] | ________________ |

## 13. Shared features

Location: Across authorized portals

| ID | Feature | Present | Working | Complete | Notes / evidence / owner |
|---|---|---|---|---|---|
| 13.1 | Login and role-based redirects | [x] | [ ] | [ ] | ________________ |
| 13.2 | Protected portal access | [x] | [ ] | [ ] | ________________ |
| 13.3 | Portal workflow loading | [x] | [ ] | [ ] | ________________ |
| 13.4 | Portal-entry and page-view tracking | [x] | [ ] | [ ] | ________________ |
| 13.5 | Authenticated portfolio viewer | [x] | [ ] | [ ] | ________________ |

## Review notes and pending checks

1. Manager access currently targets IT managers plus admin roles; it is not a general manager portal for every department.

2. Manager menu configuration includes /manager/work-board, /manager/outsourcing, /manager/products, /manager/reports and /manager/chat, without corresponding explicit routes in AppRoutes.jsx. Confirm whether this configuration is used before treating these as user-visible defects.

3. frontend/package.json declares validate:structure using scripts/validate-structure.mjs, but that file was absent during review. Restore or update it before relying on this validation command.

4. Law contracts, documents and compliance intentionally use a catch-all route with internal section selection. Missing individual routes are not by themselves defects. Check head/member permissions.

5. Automated tests and portal checklist scripts exist in backend/__tests__ and backend/scripts. **Updated 7 October 2026: the suite runs at 169 of 169 — fully green.** The long-standing failure, `project overview pages count only accessible persisted projects and never double-skip` in `hrIntegrity.test.js`, was an access-control defect, not a broken test: `projectOverviewScope` treated *any* user with no per-project assignment records as unrestricted, so an individual contributor could list every project in the company. Oversight roles genuinely need that fallback (without it every project lookup 404s for department heads), so the fix gates it on `ROLE_HIERARCHY >= 50`: heads, managers, HR, CEO and admins keep full visibility, while IT/Finance/Law employees, media sales/marketing and freelancers now see only the projects they manage or are a team member of. Verified across all 16 roles — none matches nothing, so no role lost access. A new test, `an unassigned oversight role still sees every project; an unassigned contributor does not`, pins the distinction. Portals other than Finance remain otherwise unverified for this document.

6. Finance, employee, routing and menu files contain local modifications. Reconfirm behavior against the exact build submitted for approval.

7. EFNBMMS, EdifyEight and Policy API integrations require verification against configured external services.

8. **CEO > Marketing Analytics (row 3.7b) has no live data source yet.** Marketing work happens in a separate platform; this module only reads from it. With `MARKETING_PLATFORM_BASE_URL` and a credential unset (the current state), the API returns `MARKETING_PLATFORM_NOT_CONFIGURED` and the page shows a "platform not connected" state rather than any placeholder figures. The adapter at `backend/integrations/marketingPlatform/mapper.js` reads each field under several plausible upstream names so a vendor's own naming does not require a frontend change, and endpoint paths are environment-overridable — but the integration has been verified only against tests, never against a live platform, so the first real connection may still need a path or field-alias adjustment. Credentials are server-side only: no platform URL or token appears in the frontend source or the built bundle (audited).

## Evidence references

All portal routes: frontend/src/routes/AppRoutes.jsx

Portal menu definitions: frontend/src/config/portalMenus.js

Super Admin controls: frontend/src/components/admin/SuperAdminControlCenter.jsx

CEO internal sections: frontend/src/components/ceo/CEOPortal.jsx

Media team features: frontend/src/components/media/MediaDashboard.jsx

Media head features: frontend/src/components/media/head/MediaHeadDashboard.jsx

Additional backend endpoint review: backend/routes/ceo.routes.js and backend/routes/superAdmin.portal.routes.js

## Acceptance record

Test environment / build: ____________________

Tested by / date: ____________________

Open issues / owner / target date: ____________________

Manager approval / date: ____________________

Overall decision: [ ] Accepted  [ ] Accepted with issues  [ ] Pending verification
