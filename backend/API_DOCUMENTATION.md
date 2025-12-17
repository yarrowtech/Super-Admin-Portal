# Super Admin Portal API Documentation

## Overview
A comprehensive multi-department backend system with role-based access control supporting 8 different roles: ADMIN, CEO, IT, LAW, HR, MEDIA, FINANCE, and MANAGER.

### Register a New User
**POST** `/api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "admin",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "department": "Administration"
}
```
**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Login
**POST** `/api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Get Current User
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

### Update Profile
**PUT** `/api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321"
}
```

### Change Password
**PUT** `/api/auth/change-password`

**Headers:**
```
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

---

## Roles & Permissions

### Available Roles
1. **ADMIN** - Full system access
2. **CEO** - Executive oversight
3. **IT** - Technical infrastructure management
4. **LAW** - Legal and compliance
5. **HR** - Human resources management
6. **MEDIA** - Content and marketing
7. **FINANCE** - Financial operations
8. **MANAGER** - Team management

### Role Hierarchy (Higher = More Permissions)
- ADMIN: 100
- CEO: 90
- IT, LAW, HR, MEDIA, FINANCE: 50
- MANAGER: 40

### Permissions by Role

#### ADMIN
- manage_all_users
- manage_all_departments
- view_all_data
- system_settings
- audit_logs

#### CEO
- view_all_departments
- approve_budgets
- strategic_decisions
- company_reports

#### IT
- manage_tech_infrastructure
- system_access
- technical_support
- security_management

#### LAW
- legal_documents
- compliance_management
- contract_review
- legal_advice

#### HR
- manage_employees
- recruitment
- payroll_access
- performance_reviews
- leave_management

#### MEDIA
- content_management
- social_media
- public_relations
- marketing_campaigns

#### FINANCE
- financial_records
- budget_management
- expense_approval
- financial_reports
- invoice_management

#### MANAGER
- team_management
- project_oversight
- task_assignment
- team_reports

---

## API Endpoints

### ADMIN Routes
**Base URL:** `/api/dept/admin`
**Required Role:** ADMIN

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get admin dashboard statistics |
| GET | `/users` | Get all users (with pagination) |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |
| POST | `/users/:id/toggle-status` | Toggle user active status |

#### Example: Get All Users with Filters
**GET** `/api/dept/admin/users?page=1&limit=10&role=hr&search=john`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `role` - Filter by role
- `isActive` - Filter by active status (true/false)
- `search` - Search by name or email

---

### CEO Routes
**Base URL:** `/api/dept/ceo`
**Required Role:** CEO

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get CEO dashboard |
| GET | `/reports` | Get company-wide reports |

---

### IT Routes
**Base URL:** `/api/dept/it`
**Required Role:** IT

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get IT dashboard |
| GET | `/systems` | Get system status |
| GET | `/support-tickets` | Get support tickets |

---

### HR Routes
**Base URL:** `/api/dept/hr`
**Required Role:** HR

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get HR dashboard |
| GET | `/employees` | Get all employees |
| GET | `/recruitment` | Get recruitment data |
| GET | `/leave-management` | Get leave requests |

---

### FINANCE Routes
**Base URL:** `/api/dept/finance`
**Required Role:** FINANCE

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get Finance dashboard |
| GET | `/reports` | Get financial reports |
| GET | `/budgets` | Get budget information |
| GET | `/invoices` | Get invoices |

---

### LAW Routes
**Base URL:** `/api/dept/law`
**Required Role:** LAW

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get Legal dashboard |
| GET | `/contracts` | Get contracts |
| GET | `/compliance` | Get compliance data |

---

### MEDIA Routes
**Base URL:** `/api/dept/media`
**Required Role:** MEDIA

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get Media dashboard |
| GET | `/campaigns` | Get marketing campaigns |
| GET | `/content` | Get content library |

---

### MANAGER Routes
**Base URL:** `/api/dept/manager`
**Required Role:** MANAGER

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get Manager dashboard |
| GET | `/team` | Get team members |
| GET | `/projects` | Get projects |

---

## Security Features

### 1. JWT Authentication
- All protected routes require valid JWT token
- Tokens expire after 7 days
- Token includes userId, email, and role

### 2. Role-Based Access Control (RBAC)
- Three middleware types:
  - `requireAuth` - Validates JWT token
  - `allowRoles(...roles)` - Restricts to specific roles
  - `allowRolesOrAdmin(...roles)` - Allows specific roles + ADMIN

### 3. Password Security
- Passwords hashed using bcryptjs (10 salt rounds)
- Minimum 6 characters required
- Password field excluded from queries by default

### 4. Input Validation
- Email format validation
- Required field validation
- Role validation against predefined roles

### 5. Error Handling
- Consistent error response format
- Detailed error messages in development
- Generic messages in production

---

## Example Usage

### Complete Flow Example

#### 1. Register a new HR user
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "secure123",
    "role": "hr",
    "firstName": "Sarah",
    "lastName": "Johnson",
    "department": "Human Resources"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "hr@company.com",
    "password": "secure123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### 3. Access HR Dashboard
```bash
curl -X GET http://localhost:5000/api/dept/hr/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 4. Try to access ADMIN route (will fail)
```bash
curl -X GET http://localhost:5000/api/dept/admin/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

Response:
```json
{
  "success": false,
  "error": "Forbidden - HR role does not have access to this resource"
}
```

---

## Project Structure

```
backend/
├── config/
│   ├── db.js                 # MongoDB connection
│   └── roles.js              # Role definitions & permissions
├── models/
│   └── User.js               # User model
├── middleware/
│   ├── requireAuth.js        # JWT authentication
│   └── allowRoles.js         # Role authorization
├── controllers/
│   ├── authController.js     # Auth operations
│   └── dept/                 # Department controllers
│       ├── admin.controller.js
│       ├── ceo.controller.js
│       ├── it.controller.js
│       ├── hr.controller.js
│       ├── finance.controller.js
│       ├── law.controller.js
│       ├── media.controller.js
│       └── manager.controller.js
├── routes/
│   ├── auth.routes.js        # Auth routes
│   └── dept/                 # Department routes
│       ├── admin.routes.js
│       ├── ceo.routes.js
│       ├── it.routes.js
│       ├── hr.routes.js
│       ├── finance.routes.js
│       ├── law.routes.js
│       ├── media.routes.js
│       └── manager.routes.js
├── .env                      # Environment variables
├── server.js                 # Main server file
└── package.json              # Dependencies
```

---

## Testing the API

You can test the API using:
- **Postman** - Import the endpoints
- **curl** - Command line testing
- **Thunder Client** (VS Code extension)
- **REST Client** (VS Code extension)

### Health Check
```bash
curl http://localhost:5000/health
```

### Root Endpoint
```bash
curl http://localhost:5000/
```

---

## Next Steps

1. **Extend Controllers**: Add more functionality to department controllers
2. **Add Models**: Create additional models for department-specific data
3. **File Upload**: Implement file upload for profile images
4. **Email Service**: Add email notifications
5. **Logging**: Implement comprehensive logging system
6. **Rate Limiting**: Add rate limiting for API endpoints
7. **API Documentation**: Generate Swagger/OpenAPI docs
8. **Unit Tests**: Add test coverage
9. **Audit Logs**: Track all admin actions

---

## Support

For issues or questions, please refer to the codebase or contact the development team.
