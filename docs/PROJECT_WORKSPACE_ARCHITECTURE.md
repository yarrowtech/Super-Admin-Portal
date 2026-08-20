# Project Workspace Architecture

## Hierarchy

The backend is the authoritative source for the workspace hierarchy:

```text
HOUSE OF MUSA
├── MATEBID
├── THE BETTER PASS
├── EDIFYEIGHT
├── YARROWTECH
│   ├── EEC-B2B
│   ├── EFNBMMS
│   ├── ESPORTSM
│   ├── ERMS
│   ├── EHC
│   └── SMARTFARMING
├── HIREME
├── ARTBLOCK
└── GREENBAR
```

`GET /api/workspace` and `GET /api/workspace/catalog` return this hierarchy with the authenticated user's project-level access envelope. Existing `/api/my-projects`, project-permission, project-role, and SSO endpoints remain supported.

## Authorization

- Admin, Super Admin, and Freelancer roles have organization-wide workspace access.
- Assignment metadata remains available for role, status, and reporting context, but does not restrict these three roles.
- Project API routes enforce authorization on the backend. Frontend visibility is informational only.
- EdifyEight action access is permission-based, for example `edifyeight:teachers:read`.
- Live-system tokens and service credentials remain backend-only.

## Frontend flow

Both Admin and Freelancer portals use the same catalog service and shared hierarchy component. Failure of the hierarchy request does not prevent the compatibility project list from loading.

## Adding an integration

1. Add the hosted system to `backend/utils/projectAccess.js` with its `brandCode`.
2. Add only the environment-variable name to `.env.example`; never add a secret value.
3. Implement the backend adapter/proxy and apply workspace authorization middleware.
4. Keep the frontend dependent on the workspace API response rather than embedding service credentials or private endpoints.
5. Add authorization, expired-assignment, upstream-failure, and compatibility tests.
