# CEO Agent ↔ ERP Integration — ERP Side Status

Response to *"CEO Agent ↔ ERP Integration — What the ERP Project Needs to Build"*.

The ERP side is **built and tested**. This document records what was
implemented, the endpoint details the spec asked us to send over, and the two
places where our system does not match the spec's assumptions.

---

## 1. Status against the spec's summary table

| Piece | Owner | Status |
|---|---|---|
| Login button backend route (mint token, redirect) | ERP | ✅ Built |
| `ERP_SSO_SECRET` provisioned on both sides | Both | ⏳ Needs the shared value agreeing |
| `GET /api/customers` | ERP | ✅ Built |
| `GET /api/orders` | ERP | ✅ Built |
| `GET /api/products` | ERP | ⚠️ **Not applicable — see §4** |
| `POST /api/marketing-results` | ERP | ✅ Built |
| ERP data API key issuance | ERP | ✅ Built |

---

## 2. Single sign-on

**Launch route:** `GET /api/ceo-agent/launch` (portal session required).
It mints the token server-side and issues a 302 to
`${CEO_AGENT_URL}/sso/erp?token=...`. No token logic exists in frontend code.

A JSON variant, `POST /api/ceo-agent/launch-url`, returns `{ url }` for a
button that opens CEO Agent in a new tab. The token is still minted entirely
server-side.

Token format is exactly as specified:

```
base64url(JSON payload) + "." + base64url(HMAC_SHA256(ERP_SSO_SECRET, payload))
```

`exp` is epoch **milliseconds**, `Date.now() + 5*60*1000`. Verified by a test
that asserts the value is 13 digits, and by a second test that re-implements
the spec's algorithm independently and compares signatures.

### `erpOrgId` — please read

The spec asks for the company's internal DB id. **Our portal is a
single-company operations system, not a per-company multi-tenant ERP**, so no
such row exists to point at.

We therefore take `erpOrgId` from a configured env var, `ERP_ORG_ID`, set once
to a random permanent value. If it is not set, the launch route returns 503
rather than deriving a fallback — a derived value would work in testing and
then silently provision a second, empty CEO Agent org the first time it
changed.

Practically: **you will see exactly one `erpOrgId` from us**, stable forever.

### To go live

1. Agree one `ERP_SSO_SECRET` (`openssl rand -hex 32`); set it on both servers.
2. We set `CEO_AGENT_URL` to your host.
3. Confirm the consent screen shows the right company and user name.

Config probe: `GET /api/ceo-agent/status` reports which of these are set.

---

## 3. Data sync API

**Auth:** `Authorization: Bearer <ERP_DATA_API_KEY>` — separate from
`ERP_SSO_SECRET`, as the spec recommends. `X-API-Key` also accepted.
Compared in constant time. Rate limit 120 req/min.

**Pagination:** page-number style, `?page=1&page_size=50`. Max page size 200.
Every response carries:

```json
{ "success": true, "data": [...],
  "pagination": { "page":1, "pageSize":50, "total":0, "totalPages":1, "hasMore":false } }
```

Start with `GET /api/capabilities` — it reports which sections are available
and the pagination/rate-limit facts above, so your connector can adapt rather
than hard-code.

### 3a. `GET /api/customers?updated_since=<ISO8601>&page=<n>`

Backed by our **CRM clients**. Incremental sync on `updatedAt`, ascending, so
paging while syncing is stable. An unparseable date returns 400 rather than
silently returning the whole table.

| Field | Notes |
|---|---|
| `id` | stable CRM client id |
| `name` / `company` | company name (same value) |
| `email`, `phone` | |
| `contactPerson`, `website` | extra context |
| `status` | CRM lifecycle status |
| `segment` | `media` or `marketing` |
| `tags` | array built from source / priority / channel |
| `owner` | portal user id, or null |
| `lastContactedAt` | |
| `createdAt`, `updatedAt` | ISO8601 |

### 3b. `GET /api/orders?since=<ISO8601>&page=<n>`

Backed by our **finance invoices**. We have invoices, not retail orders — the
mapping is faithful but the semantics are B2B billing.

| Field | Notes |
|---|---|
| `id` | invoice id |
| `reference` | human-readable invoice number |
| `customerId` | links to 3a; **may be null** on an unlinked invoice |
| `customerName` | denormalised, always present |
| `amount`, `currency` | numeric; currency defaults to `INR` |
| `status` | mapped to your vocabulary — see below |
| `sourceStatus` | our raw status, see below |
| `createdAt`, `dueDate` | ISO8601 |
| `items[]` | `{ productId, name, qty, price, amount }` |

Status mapping:

| Ours | Yours |
|---|---|
| `draft`, `sent`, `overdue` | `placed` |
| `paid` | `paid` |
| `void` | `cancelled` |

Two caveats worth your attention:

- **`overdue` collapses into `placed`.** Your four-value vocabulary cannot
  express it. We send `sourceStatus` alongside so you can recover the
  distinction — worth using, since overdue invoices are a strong signal.
- **We never emit `refunded`.** Refunds are a separate record type here, not an
  invoice state.
- **`items[].productId` is always null** — invoice lines are free-text
  descriptions with a rate, not catalogue references. See §4.

### 3c. `POST /api/marketing-results`

Accepts the spec's payload shape. Also accepts an optional `campaignName`.

Two effects per call: a communication row on each targeted client's timeline,
and campaign attribution (`campaignId`, `campaignSource`, `marketingChannel`,
`lastContactedAt`) stamped on the client record — fields our CRM schema already
had, so results surface on existing screens without new UI.

Channels outside our CRM's vocabulary (`linkedin`, `instagram`, `whatsapp`, …)
are stored as type `message` with the real channel preserved in the subject
line and in `marketingChannel`, so nothing is lost.

Response reports what was skipped rather than failing the batch:

```json
{ "success": true,
  "data": { "campaignId":"camp-001", "recordedFor":2, "communicationsCreated":2,
            "skipped": { "unknownCustomerIds":[], "invalidCustomerIds":[] } } }
```

Please reconcile against `skipped` — a customer id we don't recognise is
reported, not silently dropped.

---

## 4. `GET /api/products` — not applicable

**This system has no product or inventory model.** It is a business-operations
portal (CRM, finance, HR, projects, legal), not a commerce ERP. There is no
catalogue, no SKU and no stock level anywhere in it.

The endpoint exists and returns **501** with `code: "CAPABILITY_NOT_AVAILABLE"`.
We chose that over an empty `200`, which would be indistinguishable from a
company that genuinely holds zero stock, and over a 404, which you would have
to guess about.

If CEO Agent has promo-targeting features that assume inventory, they will not
have data from us. Building a product catalogue here would mean inventing a
module the business does not currently use — worth a conversation before anyone
builds it.

---

## 5. Answers to the spec's open questions

> Does an API like this already exist for other integrations?

Partly. The portal has existing integration surfaces (EFNBMMS policy API,
EdifyEight, outsourcing SSO). None matched this shape, so these endpoints are
new, but the SSO route follows the house pattern — 5-minute expiry and a
`Token` record per handoff for audit.

Separately, this portal also exposes a **read-only MCP server** at `/mcp` for
agentic clients (46 datasets across CRM, delivery, people, finance,
outsourcing, portfolio and operations). If CEO Agent can consume MCP, that is a
far richer path than these four REST endpoints. See `MCP_CONNECTION_GUIDE.md`.

> Confirm real field names/types.

Done — §3a–3c above are generated from the live schemas, not guessed.

> Is results write-back wanted now or can it wait?

Built now. It was the least work on our side, not the most, because our CRM
already had campaign attribution fields.

> Confirm pagination style and rate limits.

Page-number, max page size 200, 120 req/min. Also reported by
`GET /api/capabilities`.

---

## 6. Config

```bash
ERP_SSO_SECRET=     # shared with CEO Agent; openssl rand -hex 32
CEO_AGENT_URL=      # e.g. https://ceo-agent.example.com
ERP_ORG_ID=         # openssl rand -hex 16 — set ONCE, never change
ERP_ORG_NAME=Yarrowtech
ERP_DATA_API_KEY=   # for the data endpoints; distinct from ERP_SSO_SECRET
```

All four endpoints must be served over **HTTPS** — both credentials are bearer
secrets.

---

## 7. Tests

`node --test __tests__/ceoAgentIntegration.test.js` — 22 tests covering the
HMAC scheme against an independent implementation, expiry in milliseconds,
tampered/expired/wrong-secret rejection, API-key auth, the customer and order
mappings, incremental sync, pagination caps, the products 501, write-back into
the CRM, unsupported-channel folding, and unknown-id reporting.

Full suite: 347 passing.
