# Finance Portal — Dispute, Refund, Non-Compliance & Control Tower

Design for review | Author: engineering | Date: 6 October 2026
Target: `d:\SANTU\Super-Admin-Portal` (MongoDB / Mongoose / Express / React + Vite)

---

## 0. What this document is, and what it is not

The brief this design answers reads as a greenfield Finance Portal specification. The
codebase is not greenfield. An inventory of all 4,871 lines of the existing finance layer
against the seven requested sections found that the large majority is already implemented
**and covered by 45 passing automated tests**.

This document therefore scopes the work to what is genuinely missing, and records what
already exists so that no one rebuilds it. Rewriting the working ledger would put 45
passing tests at risk for no functional gain.

### Baseline at time of writing

- `git` HEAD: `6ebdd58 PAYROLL REMOVE properly`
- Finance suites: **45 / 45 passing** (`finance*.test.js`, `vendorLedger.test.js`, `e2e.financeLawWorkflow.test.js`)
- Whole backend suite: **98 / 99** — the single failure is the pre-existing, unowned
  `hrIntegrity.test.js` project-overview case documented in checklist note 5. It is not finance.

Every number in this document was measured, not estimated.

---

## 1. Gap analysis — requested vs. existing

| Req | Requirement | State | Evidence |
|---|---|---|---|
| §1 | Double-entry ledger as single source of truth | **Exists** | `journal()` — `services/finance/operations.service.js:62`; refuses unbalanced or non-positive entries |
| §1 | Per-line dimensions (dept / project / cost centre / party) | **Exists** | `lineSchema` — `models/finance/JournalEntry.js:4-19` |
| §1 | Immutable audit log w/ actor, timestamp, before/after | **Exists** | `audit()` — `operations.service.js:27`; `models/finance/AuditLog.js` |
| §1 | Chart of Accounts writable by Finance Head only | **Exists** | `canControlFinance` on `POST/PUT /accounts` — `routes/finance.routes.js:64-65` |
| §A | Multi-line invoices, full lifecycle, credit/debit notes | **Exists** | `Invoice.items[]`; status enum incl. `partially_paid`; `InvoiceNote.type: credit\|debit` |
| §A | Configurable invoice-number prefix | **Missing** | Prefix is hardcoded `INV-` |
| §A | Negative invoices converted to credit notes | **Missing** | 2 known rows; see §7 |
| §B | Payments (partial/multi-invoice), overpay, reversal, dup refs | **Exists** | `createPayment` — `operations.service.js:179`; allocation loop guards all three |
| §B | Bank reconciliation | **Exists** | `POST /bank-transactions/import` |
| §B | Aged receivables 0-30/31-60/61-90/90+ | **Exists** | `GET /receivables/aging` |
| §B | Overdue escalation to Finance Head + PM | **Missing** | `notify.service.js` exists but has no overdue trigger |
| §B | Revenue recognition (accrual + cash) by dept/project | **Partial** | `/reports/revenue` is accrual + customer-scoped; no cash basis, no project split |
| §C | Expense claims, vendor bills, docs-before-verify | **Exists** | `Expense.documents[]`; 13-state `status` enum; `statusHistory[]` |
| §C | Submitter ≠ Verifier ≠ Approver | **Exists** | Distinct `submittedBy` / `verifiedBy` / `approvedBy`; enforced in workflow service |
| §C | Hard + soft budget control with Head override | **Exists** | `Budget.control: hard\|soft`, `tolerancePct`, `breachedAt` |
| §C | Split one expense across several projects/departments | **Missing** | `Expense` carries a single `departmentId`/`projectId` |
| §D | Fixed vs variable cost categories | **Exists** | `Expense.costType`; `Budget.allocatedFixed` / `allocatedVariable` |
| §D | Hierarchical budgets, Budget-vs-Actual, thresholds, versioning, runway | **Exists** | `Budget.scope`, `phasing[]`, `baseline`, `revision`, `adjustments[]`, `alertThreshold` |
| §E | Trial Balance, Departmental P&L, Vendor/Client ledger, Audit export | **Exists** | Routes 108, 116, `vendorLedger.service.js`, `/audit-logs/export` |
| §E | **Project P&L / contribution margin** | **Missing** | Dimensions exist on ledger lines; no report reads them by project |
| §E | **Cash Flow Statement** | **Missing** | — |
| §E | Budget vs Actual with variance | **Exists** | `GET /budgets/variance` |
| §F | **Refund workflow** | **Missing** | — |
| §F | **Dispute mechanism + payment freeze** | **Missing** | — |
| §F | **Debit notes to vendors/clients** | **Partial** | `InvoiceNote.type: 'debit'` stores them; no workflow or vendor-side issue path |
| §F | **Non-compliance tracking** | **Missing** | — |
| §3 | **Finance Control Tower** | **Missing** | — |

**Net new work:** two modules (§F, §3) and five smaller additions. Everything else stands.

### Resolved scope decisions (owner, 6 Oct 2026)

1. **Tax** — retire the tax *reports*, keep invoice tax *fields*. Delete
   `/reports/tax-summary`, `/reports/itr-summary`, `/tax/gst-return`, `/tax/tds-return`
   and the two CSV exports. **Keep** `ruleFor()` and `taxedAmounts()`: `ruleFor()` is
   load-bearing — it fails invoice creation with 422 when a non-zero GST rate has no
   active rule, and several of the 45 tests assert that. No new tax logic is built.
2. **Sequence** — this design is reviewed and approved before any code is written.
3. **Negative-invoice migration** — dry-run by default, `--apply` to commit, matching
   `auditFinanceAmounts.js` and `backfillFinanceJournals.js`.

---

## 2. Data model

Conventions followed from the existing models: `Finance`-prefixed model names, amounts
stored as decimals with minor-unit arithmetic via `services/finance/money.js`, `ObjectId`
dimension refs, compound indexes for the read paths that exist.

### 2.1 `FinanceDispute` — new (`models/finance/Dispute.js`)

A dispute freezes money movement on a document until it is resolved. It is deliberately
its own collection rather than a flag on `Invoice`, because a dispute has a lifecycle, a
timeline, participants and evidence of its own.

```js
{
  disputeNumber:  String,   // DSP-YYYYMM-#### , unique
  subjectType:    String,   // enum: 'invoice' | 'payment' | 'expense' | 'vendor_bill'
  subjectId:      ObjectId, // the frozen document
  raisedAgainst:  String,   // enum: 'client' | 'vendor' | 'internal'
  client:         ObjectId, // ref FinanceClient, nullable
  vendor:         ObjectId, // ref FinanceVendor, nullable

  status:         String,   // enum: 'open' | 'under_review' | 'resolved' | 'cancelled'
  resolution:     String,   // enum: null|'released'|'written_off'|'converted_to_debit_note'

  amountDisputed: Number,
  reason:         String,   // required, maxlength 2000 — written justification
  documents:      [{ label, url, sha256 }],   // attachment hash per §1

  // Dimensions — required so a dispute appears in departmental and project reporting
  departmentId:   ObjectId, // required
  projectId:      ObjectId, // nullable (overhead)
  costCenterId:   ObjectId,

  // Resolution artefacts
  debitNoteId:    ObjectId, // ref FinanceInvoiceNote when converted
  writeOffJournalId: ObjectId,

  timeline: [{                        // append-only
    from, to, action, comment,
    actor, actorRole, at,
    documents: [{ label, url, sha256 }],
  }],

  raisedBy, reviewedBy, resolvedBy: ObjectId,
  resolvedAt: Date,
}
```

Indexes:

```js
{ subjectType: 1, subjectId: 1, status: 1 }   // the freeze lookup — hot path
{ status: 1, createdAt: -1 }                  // Control Tower card
{ departmentId: 1, status: 1 }
{ projectId: 1, status: 1 }
{ disputeNumber: 1 } unique
```

The freeze is enforced by a **partial unique index** guaranteeing at most one active
dispute per subject, so two concurrent requests cannot both open one:

```js
{ subjectType: 1, subjectId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['open', 'under_review'] } } }
```

### 2.2 `FinanceRefund` — new (`models/finance/Refund.js`)

```js
{
  refundNumber:   String,   // RFD-YYYYMM-#### , unique
  invoice:        ObjectId, // required, ref FinanceInvoice
  payment:        ObjectId, // required — refunds trace to the actual receipt
  amount:         Number,   // required, > 0, <= payment.amount not yet refunded
  reason:         String,   // required
  method:         String,   // enum: 'bank' | 'cash' | 'online' | 'adjustment'
  reference:      String,   // unique per payment — idempotency
  status:         String,   // enum: 'draft'|'submitted'|'approved'|'processed'|'rejected'
  documents:      [{ label, url, sha256 }],
  departmentId, projectId, costCenterId: ObjectId,
  journalEntryId: ObjectId, // the reversing entry, set on processing
  creditNoteId:   ObjectId, // ref FinanceInvoiceNote
  review:         reviewSchema,   // reuse existing maker-checker
  requestedBy, approvedBy, processedBy: ObjectId,
}
```

Index: `{ invoice: 1, createdAt: -1 }`, `{ payment: 1, reference: 1 }` unique partial.

### 2.3 `FinanceNonCompliance` — new (`models/finance/NonCompliance.js`)

```js
{
  ticketNumber:   String,   // NC-YYYYMM-#### , unique
  kind:           String,   // enum: 'missed_deadline' | 'budget_overrun'
                            //     | 'quality_deviation' | 'scope_deviation' | 'other'
  severity:       String,   // enum: 'low' | 'medium' | 'high' | 'critical'
  status:         String,   // enum: 'open' | 'acknowledged' | 'remediated' | 'waived'

  party:          String,   // enum: 'vendor' | 'client' | 'internal'
  vendor, client: ObjectId,
  contractRef:    String,   // free-text or Law-portal document id

  subjectType:    String,   // enum: 'invoice'|'expense'|'budget'|'project'|'vendor'
  subjectId:      ObjectId,

  description:    String,   // required
  financialImpact: Number,  // default 0 — quantified where known
  documents:      [{ label, url, sha256 }],

  departmentId:   ObjectId, // required
  projectId:      ObjectId,

  disputeId:      ObjectId, // set when escalated into a dispute
  timeline:       [...same shape as dispute...],
  raisedBy, acknowledgedBy, closedBy: ObjectId,
  dueBy, closedAt: Date,
}
```

Indexes: `{ status: 1, severity: 1, createdAt: -1 }`, `{ departmentId: 1, status: 1 }`,
`{ projectId: 1, status: 1 }`, `{ kind: 1, status: 1 }`.

### 2.4 `FinanceJustification` — new (`models/finance/Justification.js`)

Backs the Control Tower's "why was this cost incurred?" panel and the feedback loop where
a Project Manager or Department Head answers and Finance accepts, rejects or escalates.

```js
{
  subjectType:  String,   // enum: 'expense'|'invoice'|'budget'|'dispute'|'non_compliance'
  subjectId:    ObjectId,
  question:     String,   // what Finance asked
  askedBy:      ObjectId,
  responses: [{
    body:       String,
    documents:  [{ label, url, sha256 }],
    links: [{                      // the evidence joins §3 asks for
      kind: String,                // enum: 'task'|'time_log'|'change_request'|'quote'|'contract'
      refId: ObjectId,
      label: String,
    }],
    respondedBy, respondedByRole, at,
  }],
  outcome:      String,   // enum: 'pending'|'accepted'|'rejected'|'escalated'
  outcomeNote:  String,
  decidedBy:    ObjectId,
  decidedAt:    Date,
  departmentId, projectId: ObjectId,
}
```

Index: `{ subjectType: 1, subjectId: 1 }`, `{ outcome: 1, createdAt: -1 }`.

### 2.5 Changes to existing models

| Model | Change | Why |
|---|---|---|
| `Invoice` | add `disputeId: ObjectId`, `refundedTotal: Number` (default 0) | freeze lookup without a join; refund headroom check |
| `Payment` | add `disputeId: ObjectId`, `refundedTotal: Number` | same |
| `Expense` | add `allocations: [{ departmentId, projectId, costCenterId, amount }]` | §C multi-project split. `departmentId`/`projectId` stay as the primary/first allocation for backward compatibility; `allocations` is authoritative when non-empty and must sum to `amount` |
| `Expense` | add `disputeId`, `nonComplianceId` | cross-links |
| `Account` | add `prefix` config — **no**; instead new `FinanceSetting` key-value doc | invoice prefix is org config, not an account property |
| `FinanceSetting` | **new**, `{ key, value, updatedBy, updatedAt }`, Head-write-only | holds `invoice.prefix`, `creditNote.prefix`, escalation thresholds |

No existing field is removed or re-typed. Every addition is additive and nullable, so
current documents stay valid and the 45 tests keep passing.

---

## 3. API surface

All routes mount under `/api/dept/finance` (existing pattern, `routes/finance.routes.js`).
Guards reuse the file's existing middleware: `canWriteFinance` (blocks CEO/HR) and
`canControlFinance` (Finance Head / admin / super-admin only).

### 3.1 Disputes

| Method | Path | Guard | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/disputes` | authenticated | `?status,subjectType,departmentId,projectId,page,limit` | `{ items[], pagination, counts }` | employee sees own dept; head sees all |
| GET | `/disputes/:id` | authenticated | — | `{ dispute, subject, timeline[] }` | |
| POST | `/disputes` | `canWriteFinance` | `{ subjectType, subjectId, raisedAgainst, amountDisputed, reason, documents[], departmentId, projectId? }` | `201 { dispute }` | **freezes the subject**; 409 if already frozen |
| PATCH | `/disputes/:id/review` | `canControlFinance` | `{ comment, documents[] }` | `200 { dispute }` | `open → under_review` |
| POST | `/disputes/:id/resolve` | `canControlFinance` | `{ resolution, comment, documents[] }` | `200 { dispute, debitNote?, journalEntry? }` | `resolution` ∈ `released\|written_off\|converted_to_debit_note`; unfreezes |
| POST | `/disputes/:id/cancel` | `canControlFinance` | `{ comment }` | `200 { dispute }` | unfreezes, no financial effect |

`reason` is mandatory on create and `comment` mandatory on every transition — §F requires
written justification. Missing either is a `422`.

### 3.2 Refunds

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/refunds` | authenticated | filters as above |
| GET | `/refunds/:id` | authenticated | |
| POST | `/refunds` | `canWriteFinance` | validates `amount <= payment.amount - payment.refundedTotal`; 409 if the invoice or payment is frozen by a dispute |
| POST | `/refunds/:id/submit` | `canWriteFinance` | into maker-checker via existing `reviewSchema` |
| POST | `/refunds/:id/decision` | `canControlFinance` | `{ decision: approve\|return, note }` |
| POST | `/refunds/:id/process` | `canControlFinance` | posts the reversing journal + credit note, sets `processed` |

### 3.3 Non-compliance

| Method | Path | Guard |
|---|---|---|
| GET | `/non-compliance` | authenticated |
| GET | `/non-compliance/:id` | authenticated |
| POST | `/non-compliance` | `canWriteFinance` |
| PATCH | `/non-compliance/:id/acknowledge` | `canWriteFinance` |
| POST | `/non-compliance/:id/close` | `canControlFinance` — `{ status: remediated\|waived, comment }` |
| POST | `/non-compliance/:id/escalate` | `canControlFinance` — creates a linked dispute |

### 3.4 Justification / feedback loop

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/justifications?subjectType&subjectId` | authenticated | |
| POST | `/justifications` | `canWriteFinance` | Finance asks the question |
| POST | `/justifications/:id/respond` | authenticated + dept/project stakeholder | PM / Dept Head answers with evidence links |
| POST | `/justifications/:id/decide` | `canControlFinance` | `{ outcome: accepted\|rejected\|escalated, note }` |

`/respond` is the one route open to non-finance roles. It is scoped by
`services/finance/departmentAccess.js` — a responder must own the subject's department or
project. Everything else in this module stays finance-only.

### 3.5 Control Tower

| Method | Path | Guard | Response |
|---|---|---|---|
| GET | `/control-tower` | authenticated | `{ cards[5], generatedAt }` |
| GET | `/control-tower/:card` | authenticated | `{ card, items[], pagination, filter }` drill-down |
| GET | `/control-tower/summary-pack` | authenticated | narrative + attachment manifest for CEO/Manager export |

Card shape — one object per §3 traffic light:

```json
{
  "key": "budget_health",
  "status": "amber",
  "headline": "3 budgets above 85%",
  "metrics": { "total": 24, "amber": 3, "red": 1 },
  "drilldown": { "path": "/control-tower/budget_health", "filter": { "fiscalYear": "2026" } }
}
```

Cards: `budget_health`, `payment_delays`, `open_disputes`, `non_compliance`,
`overdue_invoices`. Status thresholds come from `FinanceSetting`, not hardcoded, so
Finance can tune them without a deploy.

### 3.6 New reports (§E)

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/reports/project-pnl` | authenticated | revenue, direct cost, contribution margin per project, from posted ledger lines by `lines.projectId` |
| GET | `/reports/cash-flow` | authenticated | operating / investing / financing from cash-account (`1000`) movements |

Both accept the standard filter set required by §E: `from`, `to`, `departmentId`,
`projectId`, `costCenterId`, `status`.

### 3.7 Retired (tax reports)

`DELETE` these route lines and their controller exports; keep `ruleFor()`/`taxedAmounts()`:

- `GET /reports/tax-summary`, `GET /reports/itr-summary`
- `GET /tax/gst-return`, `GET /tax/gst-return/export`
- `GET /tax/tds-return`, `GET /tax/tds-return/export`

`GET/POST/PATCH /tax-rules` **stay** — they configure the rates `ruleFor()` validates
against, and removing them would leave invoicing with rates nobody can maintain.

---

## 4. Service-layer logic

New file `services/finance/dispute.service.js`; new `services/finance/controlTower.service.js`.
Both follow the existing style: a `transaction()` wrapper, `fail(status, msg)` for errors,
`audit()` on every write.

### 4.1 Dispute state machine

```
            ┌──────────── cancel ───────────┐
            ▼                               │
  (create) open ──review──► under_review ───┴──resolve──► resolved
                                                           ├─ released
                                                           ├─ written_off
                                                           └─ converted_to_debit_note
```

Rules, all enforced server-side:

1. **Create** requires `reason`, at least one document, and a valid `departmentId`.
2. **Freeze on create** — writes `disputeId` onto the subject inside the same transaction.
3. Only `open → under_review → resolved` and `{open, under_review} → cancelled` are legal.
   Anything else is `409`.
4. **Resolve** requires a `comment` and branches:
   - `released` — clears `disputeId`, no ledger effect.
   - `written_off` — posts a balanced entry crediting receivables `1100`, debiting a
     write-off expense account, carrying the dispute's dimensions.
   - `converted_to_debit_note` — creates a `FinanceInvoiceNote{type:'debit'}` and posts
     the matching entry.
5. Every transition appends to `timeline[]`; the array is never rewritten.

### 4.2 Payment freeze enforcement

The insertion point is the existing allocation loop in `createPayment`
(`operations.service.js:198`, immediately after the invoice is loaded):

```js
const inv = await Invoice.findById(invoiceId).session(session);
if (!inv || ...) fail(404, 'Invoice not found');
// NEW — a disputed invoice cannot receive money until the dispute is resolved.
if (inv.disputeId) fail(409, 'Invoice is under dispute; resolve the dispute before recording payment');
```

Same guard added to `addVendorLedgerEntry` for vendor-side bills. This is three lines in
two places rather than a new middleware, because the check must run **inside** the
transaction that reads the invoice — a middleware-level check would race.

### 4.3 Refund posting

A refund reverses a receipt, so it must be the mirror of the original, not a fresh debit:

```
Dr  Sales revenue / Customer advances        (amount)
  Cr Cash and bank (1000)                    (amount)
```

Guards: refund amount ≤ `payment.amount − payment.refundedTotal`; the period must be open
(`openPeriod`); `reference` unique per payment for idempotency; the invoice must not be
frozen. On success, increment `payment.refundedTotal` and `invoice.refundedTotal` in the
same transaction.

### 4.4 Budget check reuse

Non-compliance of kind `budget_overrun` is **detected**, not re-implemented: the existing
`budgetSnapshot()` / `refreshBudget()` in `workflows.service.js` already compute
utilisation and `breachedAt`. The Control Tower reads those; a `budget_overrun` ticket is
raised from the existing breach signal rather than a second calculation. One source of
truth for budget state.

### 4.5 Control Tower aggregation

Five independent aggregations, run with `Promise.allSettled` so one slow or failing card
cannot blank the dashboard — the same pattern the existing Reports page uses:

| Card | Source | Amber | Red |
|---|---|---|---|
| `budget_health` | `Budget` + `budgetSnapshot` | any ≥ `alertThreshold` | any `breachedAt` set |
| `payment_delays` | `Invoice` where `balanceDue>0 && dueDate<now` | 1-5 overdue | > 5 or any > 90 days |
| `open_disputes` | `FinanceDispute` status `open\|under_review` | ≥ 1 open | any > 30 days old |
| `non_compliance` | `FinanceNonCompliance` status `open` | any `medium`/`high` | any `critical` |
| `overdue_invoices` | aging buckets 61-90 / 90+ | 61-90 non-empty | 90+ non-empty |

Thresholds read from `FinanceSetting` with the table above as defaults.

### 4.6 Overdue escalation (§B)

A nightly job (the repo already uses `node-cron`) finds invoices crossing an overdue
threshold and calls `notify.service.js` for the Finance Head plus the project's manager.
It follows the service's existing contract: best-effort, wrapped, never throwing into the
financial write. A `notifiedAt` watermark on the invoice prevents repeat notification for
the same threshold — the same pattern `Budget.alertedAt` already uses.

---

## 5. Frontend structure

Follows the existing layout: pages exported from
`frontend/src/components/finance/FinanceWorkspacePages.jsx`, lazily re-exported from
`frontend/src/pages/index.js`, routed in `frontend/src/routes/AppRoutes.jsx` under
`/finance/dashboard/*`, and listed in `frontend/src/config/portalMenus.js`.

| Route | Component | Menu section |
|---|---|---|
| `/finance/dashboard/control-tower` | `FinanceControlTowerPage` | Overview (first item) |
| `/finance/dashboard/disputes` | `FinanceDisputesPage` | Risk & Recovery *(new section)* |
| `/finance/dashboard/disputes/:id` | `FinanceDisputeDetailPage` | — |
| `/finance/dashboard/refunds` | `FinanceRefundsPage` | Risk & Recovery |
| `/finance/dashboard/non-compliance` | `FinanceNonCompliancePage` | Risk & Recovery |

New shared components (`frontend/src/components/finance/`):

- `ControlTowerCards.jsx` — the five traffic lights; green/amber/red must not rely on
  colour alone (icon + text label, for accessibility).
- `DisputeTimeline.jsx` — append-only timeline with attachments.
- `JustificationPanel.jsx` — the ask/respond/decide thread with evidence links; reused on
  the dispute, expense and non-compliance detail pages.
- `EvidenceLinkPicker.jsx` — attaches tasks / time logs / change requests / quotes.
- `AllocationSplitter.jsx` — multi-project expense split; enforces client-side that the
  rows sum to the total before enabling submit (server re-validates).

API client methods are added to `frontend/src/services/finance.js`, matching the existing
`financeApi.*` naming. Reads go through the existing `apiClient.get` cache; all dispute,
refund and non-compliance reads pass `{ cache: false }`, since a frozen-document state
must never be served stale.

---

## 6. Automated tests to add

Extending `backend/__tests__/`, in the existing `node --test` style. The 45 current tests
must stay green — these are additions, not rewrites.

**`financeDispute.test.js`** (new, ~10 cases)

1. creating a dispute freezes the invoice and refuses a second active dispute (409)
2. a payment against a disputed invoice is refused and leaves no writes
3. a vendor ledger entry against a disputed bill is refused
4. dispute without a reason or without a document is refused (422)
5. illegal transitions are refused (`open → resolved` without review; re-resolving)
6. `released` unfreezes and posts no journal entry
7. `written_off` posts a balanced entry carrying the dispute's department and project
8. `converted_to_debit_note` creates the note and a balanced matching entry
9. an employee cannot resolve a dispute (403); the head can
10. the timeline is append-only — a resolve never rewrites earlier rows

**`financeRefund.test.js`** (new, ~8 cases)

1. refund cannot exceed the unrefunded remainder of the payment (409)
2. two refunds with the same reference against one payment — second refused (idempotency)
3. refund on a disputed invoice refused (409)
4. processing posts a balanced reversing entry and increments both `refundedTotal` fields
5. refund in a closed financial period refused (409)
6. maker-checker: submitter cannot approve their own refund (403)
7. rejected refund posts nothing
8. concurrent refunds cannot jointly exceed the payment (transaction guard)

**`financeControlTower.test.js`** (new, ~6 cases)

1. all five cards are returned even when one aggregation throws (`allSettled`)
2. a breached budget drives `budget_health` red; a threshold crossing drives amber
3. a 90+ day invoice drives `overdue_invoices` red
4. a critical non-compliance drives its card red
5. each card's `drilldown.filter` returns the same row set it counted (the number the
   card shows and the list it opens must agree)
6. a finance employee's tower is scoped to their department; the head sees all

**`financeNonCompliance.test.js`** (new, ~5 cases) — create/acknowledge/close transitions,
escalation creating a linked dispute, employee cannot close (403), `budget_overrun` reads
the existing breach signal rather than recomputing.

**`financeJustification.test.js`** (new, ~5 cases) — Finance asks; a stakeholder of the
subject's department can respond; a stranger cannot (403); accept/reject/escalate recorded
with actor; escalate creates a dispute.

**Additions to existing suites**

- `financeModules.test.js` — project P&L contribution margin ties to posted ledger lines;
  cash-flow statement ties to cash-account movements; multi-allocation expense splits
  across two projects and sums to the total.
- `financeRegression.test.js` — removing the tax-report routes leaves invoice GST/TDS
  fields and `ruleFor()` validation intact (the guard against decision 1 regressing).

**Verification script** — `scripts/verifyFinancePortal.js` gains probes for
`/control-tower`, `/disputes`, `/refunds`, `/non-compliance`, and loses nothing. The
head-only 403 probe stays as is.

Projected total: **45 → ~84** finance tests.

---

## 7. Migration & data cleanup

### 7.1 Negative invoices → credit notes

`scripts/convertNegativeInvoices.js`, dry-run by default, `--apply` to commit.

Known affected rows (from `scripts/auditFinanceAmounts.js`): `INV-202601-4584` and
`INV-202601-8248`, −1000 each.

For each invoice with `total < 0`:

1. Record the original figures in the audit log (`action: 'negative_invoice_converted'`).
2. Create a `FinanceInvoiceNote{ type: 'credit', amount: abs(total), reason: '<migration>' }`.
3. Set the invoice's `total`/`balanceDue` to 0 and status to `void`.
4. Post a balanced correcting journal entry, with a `sourceKey` so a re-run is a no-op —
   the `sourceKey` unique partial index already guarantees idempotency.

The script prints a per-row plan and a `SKIP` line for anything that would not balance,
mirroring `backfillFinanceJournals.js`. It must be run against a backup first; it is not
wired into any startup path.

### 7.2 Schema migration

None required. Every model change in §2.5 is an additive, nullable field — Mongoose will
read existing documents unchanged. `Expense.allocations` is authoritative only when
non-empty, so historical single-dimension expenses keep working untouched.

### 7.3 Index build

The new indexes in §2.1-2.4 are on new collections, so they build empty. The two additive
indexes on `Invoice`/`Payment` (`disputeId`) should be created with `background: true` on
a populated database.

### 7.4 Removal of tax reports

Routes and controller exports deleted per §3.7. Frontend: remove the Reports page's
tax-summary/ITR cards and the GST/TDS filing panel. **Keep** the tax-rules admin UI.
Expected test impact: the suites that assert tax *report* output need their assertions
removed; the suites that assert invoice GST *maths* must keep passing unchanged — that
distinction is the acceptance criterion for this step.

---

## 8. Updated Section 8 checklist rows

Recommendation on completion of the above. `Working` is proposed as tickable only where an
endpoint returns correctly **and** a named automated test covers the behaviour, matching
the rule already stated in that section. `Complete` stays unticked throughout — it is a
business acceptance decision, not a technical one.

| ID | Feature | Present | Working | Complete | Notes / evidence |
|---|---|---|---|---|---|
| 8.3 | Invoices and invoice details | [x] | [x] | [ ] | existing tests + configurable prefix; negative invoices converted (§7.1) |
| 8.4 | Payments | [x] | [x] | [ ] | existing tests + `a payment against a disputed invoice is refused` |
| 8.5 | Expenses | [x] | [x] | [ ] | existing tests + multi-project allocation split |
| 8.14 | Reports | [x] | [x] | [ ] | + project P&L / contribution margin, cash-flow statement; tax reports retired (§3.7) |
| 8.15 | Compliance | [x] | [x] | [ ] | retains tax-rule configuration; tax *reporting* removed |
| **8.21** | **Disputes & refunds** | [ ]→[x] | [ ]→[x] | [ ] | **new** — `financeDispute.test.js`, `financeRefund.test.js` |
| **8.22** | **Non-compliance tracking** | [ ]→[x] | [ ]→[x] | [ ] | **new** — `financeNonCompliance.test.js` |
| **8.23** | **Finance Control Tower** | [ ]→[x] | [ ]→[x] | [ ] | **new** — `financeControlTower.test.js` incl. card/drill-down agreement |

Rows 8.1, 8.2, 8.6, 8.8, 8.16-8.18 are unchanged by this work. Rows 8.9-8.13 and
8.19-8.20 remain untickable for the reason already recorded in note 5 — they are shared
modules owned outside finance and still have no finance-specific tests. Row 8.7 (Payroll)
stays retired per the 6 October decision.

---

## 9. Build order

Each step ends green — the suite passes before the next begins.

1. **`FinanceSetting` + invoice prefix** — smallest change, unblocks §A.
2. **Dispute module** — model, service, routes, the three-line freeze guards, tests.
   Highest value: it is the only item that changes existing money-movement behaviour.
3. **Refund module** — depends on the dispute freeze being in place.
4. **Non-compliance** — standalone; escalation link needs the dispute module.
5. **Justification** — needed by the Control Tower's analytics panel.
6. **Control Tower** — mostly aggregation over 2-5; build last so every card has real data.
7. **New reports** — project P&L, cash flow.
8. **Tax-report retirement** — last, so its test-assertion churn does not interleave with
   new-feature failures and confuse diagnosis.
9. **Frontend** — per module, as each backend step lands.
10. **Migration script** — written early, run when you choose.

## 10. Open questions for the owner

1. **Write-off account code.** §4.1 `written_off` needs an expense account. The seeded
   chart has `5000 Operating expenses`; a dedicated `5200 Bad debt written off` would
   report better. Add it to the seed, or reuse `5000`?
2. **Dispute freeze scope.** The design freezes *incoming payments* on a disputed invoice.
   Should it also block **issuing new invoices** to a client with an open dispute, or is
   that too aggressive commercially?
3. **Justification responders.** §3.4 `/respond` opens one route to non-finance roles
   (PM / Dept Head), scoped by department. Confirm that is acceptable, or keep the whole
   module finance-only and have Finance transcribe responses.
4. **Non-compliance source.** Should `missed_deadline` auto-raise from project task
   due-dates (an integration into the Projects module), or stay manually raised by Finance?
   Auto-raising is more useful and more invasive.
