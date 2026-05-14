# Role-Wise Connection Guide (Top to Bottom)

This document explains how request flow is connected in the current codebase, role by role.

## 1) Global Request Flow

1. Frontend UI action (button/form/page event)
2. Frontend API call (`frontend/src/api/*.js` or `frontend/src/services/*.js`)
3. Backend entry in `backend/app.js` (`app.use('/api/...', routes.<...>)`)
4. Backend route file in `backend/routes/*.routes.js`
5. Middleware chain (`authenticate`, `authorize`, validation)
6. Controller method in `backend/controllers/<role>/*.controller.js`
7. Service call in `backend/services/*.service.js` (where used)
8. Model access in `backend/models/<domain>/*.js`
9. Response JSON back to frontend
10. Optional Socket.IO event (`backend/app.js` + `backend/sockets/*`)

## 2) Main Backend Mount Points

Defined in `backend/app.js`:

- `/api/auth` -> `routes.authRoutes`
- `/api/dept/admin` -> `routes.adminRoutes`
- `/api/dept/super-admin` -> `routes.superAdminRoutes`
- `/api/dept/ceo` -> `routes.ceoRoutes`
- `/api/dept/manager` -> `routes.managerRoutes`
- `/api/dept/hr` -> `routes.hrRoutes`
- `/api/dept/finance` -> `routes.financeRoutes`
- `/api/dept/employee` -> `routes.employeeDeptRoutes`
- `/api/employee` -> `routes.employeePortalRoutes`
- `/api/dept/it` -> `routes.itRoutes`
- `/api/dept/law` -> `routes.lawRoutes`
- `/api/dept/media` -> `routes.mediaRoutes`
- `/api/dept` -> `routes.departmentRoutes`
- `/api/notifications` -> `routes.notificationRoutes`
- `/api/chat` -> `routes.chatRoutes`
- `/api/reports` -> `routes.reportRoutes`

## 3) Role-Wise Connection Map

## Auth

- Frontend entry: `frontend/src/api/*` auth calls (login/register/me/logout usage from auth pages/context)
- Backend route: `backend/routes/auth.routes.js`
- Controller: `backend/controllers/auth/auth.controller.js`, `backend/controllers/auth/password.controller.js`
- Middleware: `backend/middlewares/auth.middleware.js`, `backend/middlewares/validate.middleware.js`
- Services/Utils: `backend/utils/generateToken.js`, `backend/utils/hashPassword.js`
- Models: `backend/models/auth/User.js`, `backend/models/auth/Token.js`

## Admin

- Frontend entry: `frontend/src/components/admin/*`, `frontend/src/api/admin.js`
- Backend route: `backend/routes/admin.routes.js` (`/dashboard`, `/users*`)
- Controller: `backend/controllers/admin/adminDashboard.controller.js`, `backend/controllers/admin/userManagement.controller.js`
- Middleware: `authenticate` + `authorize(ADMIN, HR)`
- Services: direct model/controller logic (no dedicated admin service yet)
- Models: `backend/models/auth/User.js`

## Super Admin

- Frontend target: `frontend/src/components/superAdmin/*` (structure planned)
- Backend route: `backend/routes/superAdmin.routes.js`
- Controller: `backend/controllers/superAdmin/superAdminDashboard.controller.js`
- Middleware: `authenticate` + `authorize(ADMIN)`
- Current status: endpoints are present, methods are placeholder (`501 Not implemented`)
- Models (intended): `backend/models/superAdmin/*`

## CEO

- Frontend entry: `frontend/src/components/ceo/*`, `frontend/src/api/ceo.js`
- Backend route: `backend/routes/ceo.routes.js`
- Controller: `backend/controllers/ceo/ceoDashboard.controller.js`
- Middleware: `authenticate` + `authorize(CEO, ADMIN)`
- Services: `backend/services/notification.service.js` (notification integration)
- Models: `backend/models/auth/User.js`, `backend/models/common/Project.js`, `backend/models/common/Task.js`, `backend/models/hr/StaffWorkReport.js`, `backend/models/finance/*`

## Manager

- Frontend entry: `frontend/src/components/manager/*`, `frontend/src/api/manager.js`
- Backend route: `backend/routes/manager.routes.js`
- Controller: `backend/controllers/manager/managerDashboard.controller.js`
- Middleware: `authenticate` + `authorize(MANAGER, ADMIN)`
- Services:
  - `backend/services/dashboard.service.js` (`buildManagerSnapshot`)
  - `backend/services/notification.service.js`
  - `backend/services/chat.service.js`
- Models:
  - `backend/models/manager/Team.js`
  - `backend/models/manager/ManagerNotification.js`
  - `backend/models/common/Task.js`
  - `backend/models/hr/Leave.js`
  - `backend/models/hr/StaffWorkReport.js`
- Realtime:
  - socket subscribe channel: `manager:<managerId>`
  - events: `manager:subscribe`, `manager:dashboard`, `manager:dashboard:error`

## HR

- Frontend entry: `frontend/src/components/hr/*`, `frontend/src/api/hr.js`
- Backend route: `backend/routes/hr.routes.js`
- Controller: `backend/controllers/hr/hrDashboard.controller.js`
- Middleware: `authenticate` + `authorize(HR, ADMIN)`
- Services/Utils: `backend/utils/shiftRules.js` used for attendance computation
- Models:
  - `backend/models/auth/User.js`
  - `backend/models/hr/Attendance.js`
  - `backend/models/hr/Leave.js`
  - `backend/models/hr/EmployeeRecord.js`
  - `backend/models/hr/StaffWorkReport.js`
  - `backend/models/common/Task.js`
  - `backend/models/common/Notification.js`

## Employee

- Frontend entry: `frontend/src/components/employee/*`, `frontend/src/api/employee.js`
- Backend routes:
  - `backend/routes/employee.routes.js` (employee portal APIs)
  - `backend/routes/employee.dept.routes.js` (department-style employee APIs)
- Controllers:
  - `backend/controllers/employee/employeeDashboard.controller.js`
  - `backend/controllers/employee/employeeProjects.controller.js`
  - `backend/controllers/employee/employeeTasks.controller.js`
  - `backend/controllers/employee/employeeDocuments.controller.js`
  - `backend/controllers/employee/employeeChat.controller.js`
  - `backend/controllers/employee/employeeNotification.controller.js`
  - `backend/controllers/employee/employeeAttendance.controller.js`
  - `backend/controllers/employee/employeeLeave.controller.js`
- Services:
  - `backend/services/dashboard.service.js`
  - `backend/services/project.service.js`
  - `backend/services/task.service.js`
  - `backend/services/report.service.js`
  - `backend/services/chat.service.js`
  - `backend/services/notification.service.js`
- Models:
  - `backend/models/common/Task.js`
  - `backend/models/common/Project.js`
  - `backend/models/hr/Attendance.js`
  - `backend/models/hr/Leave.js`
  - `backend/models/hr/StaffWorkReport.js`
  - `backend/models/common/Chat.js`
  - `backend/models/common/Message.js`
- Realtime:
  - chat rooms via `joinThread`/`leaveThread`
  - events: `chat:message`, `chat:typing`, `chat:seen`

## Finance

- Frontend entry: `frontend/src/components/finance/*`, `frontend/src/api/finance.js`
- Backend route: `backend/routes/finance.routes.js`
- Controller: `backend/controllers/finance/financeDashboard.controller.js`
- Middleware: `authenticate`
- Services: controller-heavy + `backend/services/finance.service.js` summary helper
- Models:
  - `backend/models/finance/Invoice.js`
  - `backend/models/finance/Expense.js`
  - `backend/models/finance/Budget.js`
  - `backend/models/finance/Payroll.js`
  - `backend/models/finance/Vendor.js`
  - `backend/models/finance/Payment.js`
  - `backend/models/finance/Compliance.js`

## Department Roles (IT / Media / Law / Sales / Other)

- Frontend entry: `frontend/src/components/it/*` and role dashboards
- Backend routes:
  - `backend/routes/it.routes.js`
  - `backend/routes/media.routes.js`
  - `backend/routes/law.routes.js`
  - `backend/routes/department.routes.js` (aggregated dashboards)
- Controllers:
  - `backend/controllers/department/it.controller.js`
  - `backend/controllers/department/media.controller.js`
  - `backend/controllers/department/law.controller.js`
  - `backend/controllers/department/sales.controller.js`
  - `backend/controllers/department/otherDepartment.controller.js`
- Middleware: `authenticate` + role authorize (for dedicated routes)
- Models:
  - `backend/models/department/*`
  - `backend/models/common/Project.js`
  - `backend/models/common/Notification.js`

## Common (Cross-Role)

- Notification APIs: `backend/routes/notification.routes.js` -> `backend/controllers/common/notification.controller.js`
- Chat APIs: `backend/routes/chat.routes.js` -> `backend/controllers/common/chat.controller.js` -> `backend/services/chat.service.js`
- Report APIs: `backend/routes/report.routes.js` -> `backend/controllers/common/reports.controller.js`
- Shared middleware:
  - `backend/middlewares/auth.middleware.js`
  - `backend/middlewares/role.middleware.js`
  - `backend/middlewares/permission.middleware.js`
  - `backend/middlewares/validate.middleware.js`
  - `backend/middlewares/error.middleware.js`
  - `backend/middlewares/audit.middleware.js`

## 4) Socket Layer (Current)

Live socket logic is in `backend/app.js`:

- Chat:
  - `joinThread`
  - `leaveThread`
  - `chat:typing`
  - `chat:seen`
- Manager realtime:
  - `manager:subscribe`
  - `manager:unsubscribe`
  - emits `manager:dashboard`
- HR room:
  - `hr:subscribe`
  - `hr:unsubscribe`

`backend/sockets/*` exists as structure files; core runtime wiring is currently in `app.js`.

## 5) Recommended “Top-to-Bottom” Pattern for New Role Endpoint

1. Add route in `backend/routes/<role>.routes.js`
2. Add controller method in `backend/controllers/<role>/<name>.controller.js`
3. Add/extend service in `backend/services/<domain>.service.js`
4. Use models only from `backend/models/*`
5. Apply middleware in route (`authenticate`, `authorize`, validation)
6. If realtime needed, emit through socket layer (`app.js` or socket service)
7. Frontend calls endpoint through `frontend/src/api/<role>.js`
