# Central Policy API Integration Guide

## Document purpose

This is the single integration document for all current and future projects consuming policies from the Super Admin Portal.

The policy system is centralized. Super Admin creates, versions, publishes, assigns, and audits policies. Each project only checks policy requirements and records an authenticated user's explicit agreement.

## Separate project-data APIs and policy APIs

This policy API does **not** replace the existing project-data APIs. For example, an EdifyEight project can continue using its EdifyEight API for teachers and study material, while EFNBMMS continues using its own API for admin-management data.

Use two independent frontend variables when the endpoints differ:

```env
# Existing project operational-data API — do not change it for policy work.
VITE_API_URL=https://project-specific-api.example.com

# Central Super Admin Policy API — used only for policy endpoints.
VITE_POLICY_API_URL=https://super-admin-api.example.com
VITE_POLICY_PROJECT_ID=<canonical-project-id>
```

Only policy calls use `VITE_POLICY_API_URL`. Existing project services continue to use `VITE_API_URL`.

## Core rules

1. Use the canonical MongoDB `projectId` provided by Super Admin.
2. Never use a project name, project code, or `All Projects` as a policy relationship key.
3. Never create a separate policy, version, section, consent, or acceptance database in a project.
4. Never treat browser storage as proof of acceptance.
5. Never send `userId`, role, or permissions in a policy API request. The API derives them from the authenticated session.
6. Render policy content supplied by the API. Do not hard-code policy content in a project frontend.

## Required information from Super Admin

Before integration, Super Admin supplies:

```text
Central API URL:
Canonical projectId:
Approved production frontend URL:
Approved staging frontend URL (if applicable):
Authentication integration owner:
```

Example `projectId` only:

```text
66c8f742d940f235c1a739aa
```

## Environment configuration

### Central policy backend

Configure these values in the API host or secret manager. Never commit real values.

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
CORS_ORIGIN=https://super-admin.example.com,https://project.example.com
JWT_SECRET=<long-random-secret>
JWT_REFRESH_SECRET=<different-long-random-secret>
CACHE_ENABLED=true
REDIS_URL=redis://<host>:6379
```

`CORS_ORIGIN` must contain each exact project frontend origin allowed to call the central authenticated API.

### Project frontend

```env
VITE_API_URL=https://api.example.com
VITE_POLICY_API_URL=https://super-admin-api.example.com
VITE_POLICY_PROJECT_ID=66c8f742d940f235c1a739aa
```

`VITE_POLICY_PROJECT_ID` is required for a standalone project application. The central Super Admin Portal leaves it blank because the user selects a project dynamically.

Never place JWT secrets, database credentials, server API keys, or Cloudinary secrets in a `VITE_` variable.

## API base and authentication

```text
https://<central-api-domain>/api/v1
```

Every call uses the existing central access token:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

## APIs used by project teams

| Purpose | Method | Endpoint |
| --- | --- | --- |
| Verify configured project | GET | `/projects/:projectId` |
| Check policy requirements after login | GET | `/projects/:projectId/policy-requirements` |
| Submit explicit agreement | POST | `/policies/:policyId/accept` |
| Optional legal/policy page | GET | `/projects/:projectId/policies/active` |
| Optional acceptance history | GET | `/users/me/policy-acceptances` |

Super Admin-only management endpoints are intentionally excluded from project integrations.

## Step-by-step project integration

### Step 1 — Verify project configuration

After authentication, verify the configured canonical project ID:

```http
GET /api/v1/projects/66c8f742d940f235c1a739aa
Authorization: Bearer <access-token>
```

Expected response (`200`):

```json
{
  "success": true,
  "data": {
    "_id": "66c8f742d940f235c1a739aa",
    "name": "Example Project",
    "projectCode": "EXAMPLE",
    "status": "in-progress"
  }
}
```

If this returns `PROJECT_NOT_FOUND`, contact Super Admin. Do not substitute a project name or code.

### Step 2 — Check requirements before protected routes

Call this immediately after login and before opening the project dashboard:

```http
GET /api/v1/projects/66c8f742d940f235c1a739aa/policy-requirements
Authorization: Bearer <access-token>
```

Example response (`200`):

```json
{
  "success": true,
  "data": {
    "projectId": "66c8f742d940f235c1a739aa",
    "items": [
      {
        "_id": "POLICY_ID",
        "policyCode": "PRIVACY-001",
        "title": "Privacy Policy",
        "type": "PRIVACY_POLICY",
        "requiresAcceptance": true,
        "accepted": false,
        "outstanding": true,
        "currentVersion": {
          "_id": "POLICY_VERSION_ID",
          "versionNumber": 2,
          "title": "Privacy Policy",
          "summary": "Updated data retention wording.",
          "sections": [
            {
              "key": "information-we-collect",
              "title": "Information We Collect",
              "content": "Approved policy content.",
              "order": 0,
              "enabled": true
            }
          ]
        }
      }
    ],
    "outstanding": [{ "_id": "POLICY_ID" }]
  }
}
```

Use this rule only:

```js
const mayAccessProject = (response.data.outstanding || []).length === 0;
```

If `mayAccessProject` is false, do not load protected project pages.

### Step 3 — Show the policy agreement

For every outstanding policy:

1. Display `currentVersion.title` and `currentVersion.versionNumber`.
2. Sort `currentVersion.sections` by `order` ascending.
3. Display every enabled section.
4. Render content as text or sanitized rich text. Never inject content as trusted HTML.
5. Require an explicit action such as **I have read and agree**.

### Step 4 — Record agreement

After explicit user action only:

```http
POST /api/v1/policies/POLICY_ID/accept
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "projectId": "66c8f742d940f235c1a739aa"
}
```

The server records the authenticated user, exact immutable policy version, project ID, timestamp, and audit metadata. It rejects acceptance for an unauthorized project or an unpublished policy/version.

### Step 5 — Re-check and continue

After a successful acceptance, request policy requirements again. Open the dashboard only when `outstanding` is empty.

This means policy re-acceptance works automatically: when Super Admin publishes a newer version requiring re-acceptance, it becomes outstanding without any project code or data migration.

## Optional read-only policy page

For a project Privacy, Terms, or Legal page:

```http
GET /api/v1/projects/66c8f742d940f235c1a739aa/policies/active
Authorization: Bearer <access-token>
```

Render returned policy versions and sections. Do not cache another user's acceptance status in a shared cache.

## API error handling

| HTTP status | Code | Required application behaviour |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | End the local session and return to login. |
| 403 | `PROJECT_ACCESS_DENIED` | Deny access and show a support contact. Never retry a different project ID. |
| 404 | `PROJECT_NOT_FOUND` | Stop the integration and ask Super Admin to verify configuration. |
| 409 | `POLICY_NOT_PUBLISHED` | Re-fetch requirements. Do not store a local acceptance. |
| 429 | — | Retry with bounded exponential backoff. |
| 5xx | — | Show a retryable service error; do not allow policy-gated access by default. |

## Pre-production checklist

- [ ] Canonical `projectId` is configured in the project environment.
- [ ] API URL uses HTTPS, not localhost.
- [ ] Project production origin is included in central API `CORS_ORIGIN`.
- [ ] Requirements are checked before protected routes.
- [ ] Agreement is explicit and content comes from the API.
- [ ] Acceptance is submitted without a frontend `userId`.
- [ ] Requirements are rechecked after acceptance.
- [ ] An unauthorized user cannot access another project's policy requirements.
- [ ] A new mandatory version blocks a previously accepted user until re-accepted.

## Super Admin responsibilities

Super Admin is the only owner of policy CRUD, workflow, assignments, versioning, and audit APIs. Project teams must request a policy change or assignment through Super Admin rather than creating their own policy implementation.
