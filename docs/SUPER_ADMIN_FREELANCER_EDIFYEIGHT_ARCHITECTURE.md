# Super Admin Freelancer to EdifyEight API Integration

## Requirement

The freelancer logs in only to the Super Admin Portal and works from:

```text
http://localhost:5173/outsourcing/projects
```

From the Projects page:

- `EdifyEight` opens teacher CRUD inside the Super Admin Portal.
- EdifyEight also opens Study Materials upload, edit, list, PDF open, and delete inside the same workspace.
- `EFNBMMS` remains separate and opens the existing admin-management flow.
- No separate sidebar item is required for EdifyEight Teachers.
- For now, freelancer users can open all project cards.

## Projects

### Project A: Super Admin Portal

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Database: `super_admin_portal`
- Responsibility:
  - Freelancer login
  - Project hub UI
  - EdifyEight teacher CRUD screen
  - Server-to-server gateway to Project B
  - Audit logging for create, read, update, delete actions

### Project B: EdifyEight

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:5001`
- Database: `eecb2c`
- Responsibility:
  - Own teacher records
  - Expose protected internal teacher API
  - Validate the Super Admin service token
  - Execute teacher CRUD in the EdifyEight database

## User Flow

```text
Freelancer
  |
  | logs in to Super Admin Portal
  v
Super Admin Projects page
/outsourcing/projects
  |
  | clicks EdifyEight card
  v
EdifyEight Teachers page
/outsourcing/edifyeight
  |
  | calls Project A backend with Super Admin JWT
  v
Project A backend gateway
/api/outsourcing/edifyeight/teachers
  |
  | calls Project B internal API with private service token
  v
Project B EdifyEight backend
/api/internal/teachers
  |
  | reads/writes teacher records
  v
MongoDB database: eecb2c
```

## API Boundary

Browser calls only Project A:

```text
GET    /api/outsourcing/edifyeight/teachers
GET    /api/outsourcing/edifyeight/teachers/:teacherId
POST   /api/outsourcing/edifyeight/teachers
PUT    /api/outsourcing/edifyeight/teachers/:teacherId
DELETE /api/outsourcing/edifyeight/teachers/:teacherId
GET    /api/outsourcing/edifyeight/teachers/stats
GET    /api/outsourcing/edifyeight/study-materials
POST   /api/outsourcing/edifyeight/study-materials
PUT    /api/outsourcing/edifyeight/study-materials/:materialId
DELETE /api/outsourcing/edifyeight/study-materials/:materialId
GET    /api/outsourcing/edifyeight/study-materials/stats
```

Project A calls Project B:

```text
GET    http://localhost:5001/api/internal/teachers
GET    http://localhost:5001/api/internal/teachers/:teacherId
POST   http://localhost:5001/api/internal/teachers
PUT    http://localhost:5001/api/internal/teachers/:teacherId
DELETE http://localhost:5001/api/internal/teachers/:teacherId
GET    http://localhost:5001/api/internal/teachers/stats
GET    http://localhost:5001/api/internal/study-materials
POST   http://localhost:5001/api/internal/study-materials
PUT    http://localhost:5001/api/internal/study-materials/:materialId
DELETE http://localhost:5001/api/internal/study-materials/:materialId
GET    http://localhost:5001/api/internal/study-materials/stats
```

## Environment

Project A backend:

```env
EDIFYEIGHT_API_URL=http://127.0.0.1:5001
EDIFYEIGHT_TEACHER_API_URL=http://127.0.0.1:5001/api/internal/teachers
EDIFYEIGHT_STUDY_MATERIAL_API_URL=http://127.0.0.1:5001/api/internal/study-materials
EDIFYEIGHT_API_TOKEN=<private-service-token>
```

Project B backend:

```env
SUPER_ADMIN_PORTAL_SERVICE_TOKEN=<same-private-service-token>
```

The current Project A code keeps legacy fallback variables for local compatibility, but new EdifyEight teacher code reads through `EDIFYEIGHT_*`.

## Access Rule For Now

Temporary open access:

- `admin`, `super_admin`, and `freelancer` can use EdifyEight teacher CRUD.
- Freelancer project cards are treated as accessible on `/outsourcing/projects`.

Later production hardening should replace the freelancer bypass with project permissions:

```text
edifyeight:teachers:read
edifyeight:teachers:create
edifyeight:teachers:update
edifyeight:teachers:delete
edifyeight:study-materials:read
edifyeight:study-materials:create
edifyeight:study-materials:update
edifyeight:study-materials:delete
```

## EFNBMMS Separation

EFNBMMS is not used for EdifyEight teacher CRUD.

EFNBMMS remains on the existing route:

```text
/outsourcing/efnbmms-admin-management
/api/outsourcing/efnbmms/admin-management
```
