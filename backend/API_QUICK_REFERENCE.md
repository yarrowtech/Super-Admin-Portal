# API Quick Reference Guide

## Base URL
```
http://localhost:5000/api
```

---

## 🔑 Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "employee",
  "phone": "1234567890",
  "department": "IT"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

---

## 👥 HR Module (`/dept/hr`)

### Dashboard
```http
GET /dept/hr/dashboard
Authorization: Bearer <hr_token>
```

### Applicants
```http
# List all applicants
GET /dept/hr/applicants?page=1&limit=10&status=pending

# Create applicant
POST /dept/hr/applicants
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@email.com",
  "phone": "9876543210",
  "position": "Developer",
  "department": "IT",
  "experience": 3,
  "skills": ["React", "Node.js"]
}

# Get single applicant
GET /dept/hr/applicants/:id

# Update applicant
PUT /dept/hr/applicants/:id
{
  "status": "interview",
  "interviewDate": "2025-12-25T10:00:00Z"
}

# Delete applicant
DELETE /dept/hr/applicants/:id
```

### Attendance
```http
# List attendance records
GET /dept/hr/attendance?employee=<employee_id>&startDate=2025-01-01

# Create attendance
POST /dept/hr/attendance
{
  "employee": "<employee_id>",
  "date": "2025-12-18",
  "checkIn": "2025-12-18T09:00:00Z",
  "status": "present"
}

# Update attendance
PUT /dept/hr/attendance/:id

# Get employee attendance
GET /dept/hr/attendance/employee/:employeeId
```

### Leave Management
```http
# List leave requests
GET /dept/hr/leave?status=pending

# Approve leave
PUT /dept/hr/leave/:id/approve

# Reject leave
PUT /dept/hr/leave/:id/reject
{
  "rejectionReason": "Insufficient leave balance"
}
```

### Notices
```http
# List notices
GET /dept/hr/notices?type=urgent&priority=high

# Create notice
POST /dept/hr/notices
{
  "title": "Company Holiday",
  "content": "Office closed on Dec 25",
  "type": "holiday",
  "priority": "high",
  "targetAudience": "all"
}

# Update notice
PUT /dept/hr/notices/:id

# Delete notice
DELETE /dept/hr/notices/:id
```

### Performance Reviews
```http
# List reviews
GET /dept/hr/performance?employee=<employee_id>

# Create review
POST /dept/hr/performance
{
  "employee": "<employee_id>",
  "reviewPeriod": {
    "startDate": "2025-01-01",
    "endDate": "2025-03-31"
  },
  "reviewType": "quarterly",
  "ratings": {
    "technical": 4,
    "communication": 5,
    "teamwork": 4
  }
}

# Update review
PUT /dept/hr/performance/:id
```

### Work Reports
```http
# List reports
GET /dept/hr/work-reports?status=submitted

# Review report
PUT /dept/hr/work-reports/:id/review
{
  "status": "approved",
  "feedback": "Great work!"
}
```

### Complaints
```http
# List complaints
GET /dept/hr/complaints?status=pending&priority=high

# Get complaint details
GET /dept/hr/complaints/:id

# Assign complaint
PUT /dept/hr/complaints/:id/assign
{
  "assignedTo": "<hr_user_id>"
}

# Resolve complaint
PUT /dept/hr/complaints/:id/resolve
{
  "solution": "Issue resolved",
  "actionTaken": "Provided new equipment"
}

# Add comment
POST /dept/hr/complaints/:id/comment
{
  "comment": "Following up on this issue"
}
```

---

## 💻 IT Module (`/dept/it`)

### Dashboard
```http
GET /dept/it/dashboard
Authorization: Bearer <it_token>
```

### Projects
```http
# List projects
GET /dept/it/projects?status=in-progress

# Create project
POST /dept/it/projects
{
  "name": "Mobile App Development",
  "description": "iOS and Android app",
  "projectManager": "<user_id>",
  "status": "planning",
  "priority": "high",
  "startDate": "2025-12-20",
  "deadline": "2026-03-20",
  "technologies": ["React Native", "Node.js"]
}

# Get project
GET /dept/it/projects/:id

# Update project
PUT /dept/it/projects/:id

# Delete project
DELETE /dept/it/projects/:id

# Add team member
PUT /dept/it/projects/:id/add-member
{
  "employee": "<user_id>",
  "role": "Frontend Developer"
}

# Update progress
PUT /dept/it/projects/:id/update-progress
{
  "progress": 75
}
```

### Support Tickets
```http
# List tickets
GET /dept/it/support-tickets?priority=critical&status=open

# Create ticket
POST /dept/it/support-tickets
{
  "title": "Network connectivity issue",
  "description": "Unable to connect to VPN",
  "category": "network",
  "priority": "high",
  "requester": "<user_id>"
}

# Get my assigned tickets
GET /dept/it/support-tickets/my-tickets

# Get ticket details
GET /dept/it/support-tickets/:id

# Update ticket
PUT /dept/it/support-tickets/:id

# Assign ticket
PUT /dept/it/support-tickets/:id/assign
{
  "assignedTo": "<it_user_id>"
}

# Resolve ticket
PUT /dept/it/support-tickets/:id/resolve
{
  "solution": "VPN credentials updated"
}

# Close ticket
PUT /dept/it/support-tickets/:id/close

# Add comment
POST /dept/it/support-tickets/:id/comment
{
  "comment": "Investigating the issue",
  "isInternal": false
}
```

---

## 👤 Employee Module (`/dept/employee`)

### Dashboard
```http
GET /dept/employee/dashboard
Authorization: Bearer <employee_token>
```

### Tasks
```http
# List my tasks
GET /dept/employee/tasks?status=in-progress

# Get task details
GET /dept/employee/tasks/:id

# Update task status
PUT /dept/employee/tasks/:id/status
{
  "status": "completed",
  "progress": 100
}

# Add comment to task
POST /dept/employee/tasks/:id/comment
{
  "comment": "Task completed successfully"
}
```

### Attendance
```http
# Check in
POST /dept/employee/attendance/check-in
{
  "location": "office"
}

# Check out
PUT /dept/employee/attendance/check-out

# View my attendance
GET /dept/employee/attendance?startDate=2025-12-01&endDate=2025-12-31
```

### Leave Requests
```http
# Request leave
POST /dept/employee/leave
{
  "leaveType": "sick",
  "startDate": "2025-12-20",
  "endDate": "2025-12-22",
  "totalDays": 3,
  "reason": "Medical appointment"
}

# View my leaves
GET /dept/employee/leave?status=approved

# Cancel leave
PUT /dept/employee/leave/:id/cancel
```

### Work Reports
```http
# Submit report
POST /dept/employee/work-reports
{
  "reportType": "daily",
  "title": "Daily Report - Dec 18",
  "description": "Completed tasks for today",
  "tasksCompleted": [
    {
      "task": "Bug fixes",
      "hoursSpent": 3,
      "status": "completed"
    }
  ],
  "challenges": "None",
  "nextDayPlan": "Start new feature"
}

# View my reports
GET /dept/employee/work-reports?reportType=daily
```

### Notices
```http
# View notices
GET /dept/employee/notices?type=urgent

# Mark notice as read
PUT /dept/employee/notices/:id/mark-read
```

### Performance
```http
# View my performance reviews
GET /dept/employee/performance

# Acknowledge review
PUT /dept/employee/performance/:id/acknowledge
{
  "employeeComments": "Thank you for the feedback"
}
```

---

## 🔍 Common Query Parameters

### Pagination
```
?page=1&limit=10
```

### Filtering
```
?status=pending
?priority=high
?category=hardware
?role=employee
?department=IT
```

### Date Ranges
```
?startDate=2025-01-01&endDate=2025-12-31
```

### Sorting (implicit in controllers)
- Most endpoints sort by creation date (newest first)
- Tasks sort by priority and due date
- Tickets sort by priority

---

## 📋 Status Values Reference

### Applicant Status
- `pending`, `screening`, `interview`, `offered`, `hired`, `rejected`

### Attendance Status
- `present`, `absent`, `late`, `half-day`, `on-leave`

### Leave Status
- `pending`, `approved`, `rejected`, `cancelled`

### Leave Types
- `sick`, `casual`, `annual`, `maternity`, `paternity`, `unpaid`, `other`

### Task Status
- `pending`, `in-progress`, `review`, `completed`, `cancelled`

### Project Status
- `planning`, `in-progress`, `on-hold`, `completed`, `cancelled`

### Ticket Status
- `open`, `in-progress`, `waiting`, `resolved`, `closed`, `cancelled`

### Priority Levels
- `low`, `medium`, `high`, `critical`

### Notice Types
- `general`, `urgent`, `event`, `policy`, `holiday`, `meeting`

### Ticket Categories
- `hardware`, `software`, `network`, `access`, `email`, `application`, `other`

### Complaint Categories
- `workplace`, `harassment`, `discrimination`, `safety`, `equipment`, `management`, `other`

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid token or token expired"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Server error",
  "details": "Error details (dev mode only)"
}
```

---

## 🧪 Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User",
    "role": "employee"
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Authenticated Request
```bash
curl -X GET http://localhost:5000/api/dept/employee/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

---

## 📝 Notes

1. **All authenticated endpoints require** the `Authorization: Bearer <token>` header
2. **Tokens expire after 7 days** - use the refresh token endpoint if needed
3. **Role-based access** - endpoints will return 403 if the user doesn't have the required role
4. **Pagination** - Default is page=1, limit=10 if not specified
5. **Dates** - Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)

---

**Last Updated**: 2025-12-18
