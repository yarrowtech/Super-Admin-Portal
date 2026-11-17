# MCP Connection Guide

How to connect the agentic analytics product to this portal's data.

The portal exposes a **read-only MCP server**. The analytics product is the
client: you paste this portal's MCP URL and an access key into its
"Add a connected system" dialog, and its agents can then read portal data
through five tools.

---

## 1. Architecture

```
Analytics product  ──POST /mcp──▶  Super Admin Portal  ──▶  MongoDB
  (MCP client)      Bearer key       (MCP server)           (read only)
```

- Transport: **Streamable HTTP**, stateless (no sticky sessions, scales horizontally).
- Auth: portal-issued access key as `Authorization: Bearer <key>`.
- Every tool is annotated `readOnlyHint: true`. There are no write tools.

---

## 2. Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/mcp` | POST | Bearer key | The MCP endpoint itself |
| `/mcp/info` | GET | none | Liveness probe — confirms the URL is right |
| `/api/v1/mcp-keys` | GET/POST | super admin session | List / issue keys |
| `/api/v1/mcp-keys/:id/revoke` | PATCH | super admin session | Revoke a key |
| `/api/v1/mcp-keys/scopes` | GET | super admin session | Valid scope domains |

---

## 3. Issue an access key

As a super admin:

```bash
curl -X POST https://<portal-host>/api/v1/mcp-keys \
  -H "Authorization: Bearer <your portal JWT>" \
  -H "Content-Type: application/json" \
  -d '{"label":"Analytics product - production"}'
```

Response contains `data.plaintext`:

```
sap_mcp_<keyId>_<secret>
```

**This is shown once and is not recoverable.** Only its SHA-256 hash is stored.

Optional fields:
- `scopes`: restrict to domains, e.g. `["crm","finance"]`. Omit or pass `[]` for full access.
- `expiresAt`: ISO date after which the key stops working.

Revoke takes effect on the next request; nothing is cached.

---

## 4. Fill in the connection dialog

| Field | Value |
|---|---|
| **Name** | Any label, e.g. `Super Admin Portal` |
| **MCP URL** | `https://<portal-host>/mcp` |
| **Data access key** | The `sap_mcp_...` key from step 3 |
| **Auth header** | Leave **empty** (defaults to `Authorization: Bearer`) |
| **Agents** | Tick whichever agents should read portal data |

If that product insists on a custom header name, the endpoint also accepts
`X-MCP-Key: <key>`.

---

## 5. Available tools

| Tool | Purpose |
|---|---|
| `list_datasets` | Discover what data exists. Call this first. |
| `describe_dataset` | Field names, types and refs for one dataset. |
| `query_dataset` | Fetch rows with a Mongo-style filter. Max 200/call, page with `skip`. |
| `count_dataset` | Just a total — far cheaper than fetching rows. |
| `aggregate_dataset` | Group by a field, compute count/sum/avg/min/max. |

46 datasets across 7 domains: `crm`, `delivery`, `people`, `finance`,
`outsourcing`, `portfolio`, `operations`.

---

## 6. Security properties

- **Read-only.** No tool writes, updates or deletes. The query service only ever
  calls `find`, `countDocuments` and a fixed-shape `aggregate` pipeline.
- **Credentials are stripped.** Passwords, tokens, API keys, OTPs and 2FA secrets
  are removed from every response, globally and per dataset. Covered by a test
  that asserts a seeded plaintext password never appears in output.
- **Dangerous operators are rejected.** `$where`, `$function`, `$accumulator`,
  `$lookup`, `$out`, `$merge` and `$graphLookup` are blocked, so a caller cannot
  execute JS server-side or traverse into collections outside the registry.
- **The exposure surface is one file.** `services/mcp/mcpDatasets.js` is the only
  way to widen what is readable — review that file, not the whole codebase.
- **Keys are hashed.** Only SHA-256 of the secret is stored, compared in constant
  time. Revocation is immediate.
- **Rate limited.** 120 requests/minute per key.
- **Results are capped.** 200 rows per call, 500 aggregate buckets.

### Deployment requirements

- `/mcp` must be reachable over **HTTPS**. Keys are bearer credentials — plain
  HTTP would expose them.
- If a WAF or proxy sits in front, allow `POST /mcp` with a JSON body and let the
  `Authorization` header through.
- The route is mounted ahead of the portal CORS allow-list on purpose: MCP
  clients are server-side agents, not browsers, so the origin list does not
  apply. Auth is by key alone.

### Operational note

This grants an external system broad read access to production data — CRM,
finance, HR and audit logs included. Recommended practice:

1. Issue a **separate key per consumer**, never a shared one.
2. Start **scoped** (`{"scopes":["crm"]}`) and widen only when needed.
3. Set `expiresAt` and rotate.
4. Watch `lastUsedAt` / `useCount` on each key; revoke anything idle or unexpected.

Every tool call is logged with the key id, tool name and duration.

---

## 7. Verify the connection

```bash
# 1. Is the URL right? (no auth needed)
curl https://<portal-host>/mcp/info

# 2. Does the key work?
curl -X POST https://<portal-host>/mcp \
  -H "Authorization: Bearer sap_mcp_..." \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expect the five tools. `401` means no key reached the server; `403` means the
key is invalid, expired or revoked.

Automated coverage: `node --test __tests__/mcpEndpoint.test.js`
