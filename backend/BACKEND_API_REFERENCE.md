# Backend API Reference

Generated from: backend/swagger-output.json
Generated at: 2026-04-23 13:07:06
Base URL: http://localhost:<PORT>
Swagger UI: /api-docs
Swagger JSON: /api-docs.json
Total API operations: 260

Legend: Auth = Yes means JWT bearer token is required.

## Admin (7)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/admin/dashboard | Yes | GET Admin Dashboard |
| GET | /api/dept/admin/users | Yes | GET Admin Users |
| POST | /api/dept/admin/users | Yes | POST Admin Users |
| DELETE | /api/dept/admin/users/{id} | Yes | DELETE Admin Users Id |
| GET | /api/dept/admin/users/{id} | Yes | GET Admin Users Id |
| PUT | /api/dept/admin/users/{id} | Yes | PUT Admin Users Id |
| POST | /api/dept/admin/users/{id}/toggle-status | Yes | POST Admin Users Id Toggle Status |

## Auth (8)

| Method | Path | Auth | Summary |
|---|---|---|---|
| PUT | /api/auth/change-password | Yes | PUT Change Password |
| POST | /api/auth/login | No | POST Login |
| POST | /api/auth/logout | Yes | POST Logout |
| GET | /api/auth/me | Yes | GET Me |
| PUT | /api/auth/profile | Yes | PUT Profile |
| POST | /api/auth/refresh-token | No | POST Refresh Token |
| POST | /api/auth/register | No | POST Register |
| POST | /api/auth/verify-token | No | POST Verify Token |

## CEO (7)

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | /api/dept/ceo/alert | Yes | POST Ceo Alert |
| GET | /api/dept/ceo/dashboard | Yes | GET Ceo Dashboard |
| GET | /api/dept/ceo/employees | Yes | GET Ceo Employees |
| GET | /api/dept/ceo/notifications | Yes | GET Ceo Notifications |
| PUT | /api/dept/ceo/notifications/mark-all-read | Yes | PUT Ceo Notifications Mark All Read |
| PUT | /api/dept/ceo/notifications/{id}/read | Yes | PUT Ceo Notifications Id Read |
| GET | /api/dept/ceo/reports | Yes | GET Ceo Reports |

## Chat (5)

| Method | Path | Auth | Summary |
|---|---|---|---|
| POST | /api/chat/groups | Yes | POST Groups |
| GET | /api/chat/threads | Yes | GET Threads |
| POST | /api/chat/threads | Yes | POST Threads |
| GET | /api/chat/threads/{threadId}/messages | Yes | GET Threads ThreadId Messages |
| POST | /api/chat/threads/{threadId}/messages | Yes | POST Threads ThreadId Messages |

## Department (2)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/other/dashboard | Yes | GET Other Dashboard |
| GET | /api/dept/sales/dashboard | Yes | GET Sales Dashboard |

## Employee (31)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/employee/attendance | Yes | GET Employee Attendance |
| POST | /api/dept/employee/attendance/check-in | Yes | POST Employee Attendance Check In |
| PUT | /api/dept/employee/attendance/check-out | Yes | PUT Employee Attendance Check Out |
| PUT | /api/dept/employee/attendance/location | Yes | PUT Employee Attendance Location |
| GET | /api/dept/employee/dashboard | Yes | GET Employee Dashboard |
| GET | /api/dept/employee/leave | Yes | GET Employee Leave |
| POST | /api/dept/employee/leave | Yes | POST Employee Leave |
| PUT | /api/dept/employee/leave/{id}/cancel | Yes | PUT Employee Leave Id Cancel |
| GET | /api/dept/employee/notices | Yes | GET Employee Notices |
| PUT | /api/dept/employee/notices/{id}/mark-read | Yes | PUT Employee Notices Id Mark Read |
| GET | /api/dept/employee/performance | Yes | GET Employee Performance |
| PUT | /api/dept/employee/performance/{id}/acknowledge | Yes | PUT Employee Performance Id Acknowledge |
| GET | /api/dept/employee/tasks | Yes | GET Employee Tasks |
| GET | /api/dept/employee/tasks/{id} | Yes | GET Employee Tasks Id |
| POST | /api/dept/employee/tasks/{id}/comment | Yes | POST Employee Tasks Id Comment |
| PUT | /api/dept/employee/tasks/{id}/status | Yes | PUT Employee Tasks Id Status |
| GET | /api/dept/employee/work-reports | Yes | GET Employee Work Reports |
| POST | /api/dept/employee/work-reports | Yes | POST Employee Work Reports |
| POST | /api/employee/chat/groups | Yes | POST Chat Groups |
| GET | /api/employee/chat/threads | Yes | GET Chat Threads |
| POST | /api/employee/chat/threads | Yes | POST Chat Threads |
| GET | /api/employee/chat/threads/{threadId}/messages | Yes | GET Chat Threads ThreadId Messages |
| POST | /api/employee/chat/threads/{threadId}/messages | Yes | POST Chat Threads ThreadId Messages |
| GET | /api/employee/dashboard | Yes | GET Dashboard |
| GET | /api/employee/documents | Yes | GET Documents |
| POST | /api/employee/notify-manager/task-review/{taskId} | Yes | POST Notify Manager Task Review TaskId |
| GET | /api/employee/projects | Yes | GET Projects |
| POST | /api/employee/projects/tasks | Yes | POST Projects Tasks |
| DELETE | /api/employee/projects/tasks/{taskId} | Yes | DELETE Projects Tasks TaskId |
| GET | /api/employee/tasks | Yes | GET Tasks |
| GET | /api/employee/team | Yes | GET Team |

## Finance (44)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/finance/accounts | Yes | GET Finance Accounts |
| POST | /api/dept/finance/accounts | Yes | POST Finance Accounts |
| PUT | /api/dept/finance/accounts/{id} | Yes | PUT Finance Accounts Id |
| GET | /api/dept/finance/budgets | Yes | GET Finance Budgets |
| POST | /api/dept/finance/budgets | Yes | POST Finance Budgets |
| PUT | /api/dept/finance/budgets/{id} | Yes | PUT Finance Budgets Id |
| GET | /api/dept/finance/clients | Yes | GET Finance Clients |
| POST | /api/dept/finance/clients | Yes | POST Finance Clients |
| PUT | /api/dept/finance/clients/{id} | Yes | PUT Finance Clients Id |
| GET | /api/dept/finance/compliance | Yes | GET Finance Compliance |
| POST | /api/dept/finance/compliance | Yes | POST Finance Compliance |
| PUT | /api/dept/finance/compliance/{id} | Yes | PUT Finance Compliance Id |
| GET | /api/dept/finance/cost-centers | Yes | GET Finance Cost Centers |
| POST | /api/dept/finance/cost-centers | Yes | POST Finance Cost Centers |
| PUT | /api/dept/finance/cost-centers/{id} | Yes | PUT Finance Cost Centers Id |
| GET | /api/dept/finance/dashboard | Yes | GET Finance Dashboard |
| GET | /api/dept/finance/expenses | Yes | GET Finance Expenses |
| POST | /api/dept/finance/expenses | Yes | POST Finance Expenses |
| PUT | /api/dept/finance/expenses/{id} | Yes | PUT Finance Expenses Id |
| GET | /api/dept/finance/invoice-notes | Yes | GET Finance Invoice Notes |
| GET | /api/dept/finance/invoices | Yes | GET Finance Invoices |
| POST | /api/dept/finance/invoices | Yes | POST Finance Invoices |
| PUT | /api/dept/finance/invoices/{id} | Yes | PUT Finance Invoices Id |
| POST | /api/dept/finance/invoices/{id}/notes | Yes | POST Finance Invoices Id Notes |
| GET | /api/dept/finance/journals | Yes | GET Finance Journals |
| POST | /api/dept/finance/journals | Yes | POST Finance Journals |
| PUT | /api/dept/finance/journals/{id} | Yes | PUT Finance Journals Id |
| POST | /api/dept/finance/journals/{id}/post | Yes | POST Finance Journals Id Post |
| GET | /api/dept/finance/payments | Yes | GET Finance Payments |
| POST | /api/dept/finance/payments | Yes | POST Finance Payments |
| PUT | /api/dept/finance/payments/{id} | Yes | PUT Finance Payments Id |
| GET | /api/dept/finance/payrolls | Yes | GET Finance Payrolls |
| POST | /api/dept/finance/payrolls | Yes | POST Finance Payrolls |
| PUT | /api/dept/finance/payrolls/{id} | Yes | PUT Finance Payrolls Id |
| GET | /api/dept/finance/reports | Yes | GET Finance Reports |
| POST | /api/dept/finance/reports | Yes | POST Finance Reports |
| GET | /api/dept/finance/reports/balance-sheet | Yes | GET Finance Reports Balance Sheet |
| GET | /api/dept/finance/reports/itr-summary | Yes | GET Finance Reports Itr Summary |
| GET | /api/dept/finance/reports/profit-loss | Yes | GET Finance Reports Profit Loss |
| GET | /api/dept/finance/reports/tax-summary | Yes | GET Finance Reports Tax Summary |
| GET | /api/dept/finance/reports/trial-balance | Yes | GET Finance Reports Trial Balance |
| GET | /api/dept/finance/vendors | Yes | GET Finance Vendors |
| POST | /api/dept/finance/vendors | Yes | POST Finance Vendors |
| PUT | /api/dept/finance/vendors/{id} | Yes | PUT Finance Vendors Id |

## Health (1)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /health | No | GET Health |

## HR (98)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/hr/applicants | Yes | GET Hr Applicants |
| POST | /api/dept/hr/applicants | Yes | POST Hr Applicants |
| DELETE | /api/dept/hr/applicants/{id} | Yes | DELETE Hr Applicants Id |
| GET | /api/dept/hr/applicants/{id} | Yes | GET Hr Applicants Id |
| PUT | /api/dept/hr/applicants/{id} | Yes | PUT Hr Applicants Id |
| GET | /api/dept/hr/appraisal-cycles | Yes | GET Hr Appraisal Cycles |
| POST | /api/dept/hr/appraisal-cycles | Yes | POST Hr Appraisal Cycles |
| DELETE | /api/dept/hr/appraisal-cycles/{id} | Yes | DELETE Hr Appraisal Cycles Id |
| PUT | /api/dept/hr/appraisal-cycles/{id} | Yes | PUT Hr Appraisal Cycles Id |
| GET | /api/dept/hr/appraisals | Yes | GET Hr Appraisals |
| POST | /api/dept/hr/appraisals | Yes | POST Hr Appraisals |
| DELETE | /api/dept/hr/appraisals/{id} | Yes | DELETE Hr Appraisals Id |
| PUT | /api/dept/hr/appraisals/{id} | Yes | PUT Hr Appraisals Id |
| GET | /api/dept/hr/attendance | Yes | GET Hr Attendance |
| POST | /api/dept/hr/attendance | Yes | POST Hr Attendance |
| GET | /api/dept/hr/attendance/employee/{employeeId} | Yes | GET Hr Attendance Employee EmployeeId |
| PUT | /api/dept/hr/attendance/{id} | Yes | PUT Hr Attendance Id |
| GET | /api/dept/hr/biometrics | Yes | GET Hr Biometrics |
| POST | /api/dept/hr/biometrics | Yes | POST Hr Biometrics |
| DELETE | /api/dept/hr/biometrics/{id} | Yes | DELETE Hr Biometrics Id |
| PUT | /api/dept/hr/biometrics/{id} | Yes | PUT Hr Biometrics Id |
| GET | /api/dept/hr/complaints | Yes | GET Hr Complaints |
| GET | /api/dept/hr/complaints/{id} | Yes | GET Hr Complaints Id |
| PUT | /api/dept/hr/complaints/{id}/assign | Yes | PUT Hr Complaints Id Assign |
| POST | /api/dept/hr/complaints/{id}/comment | Yes | POST Hr Complaints Id Comment |
| PUT | /api/dept/hr/complaints/{id}/resolve | Yes | PUT Hr Complaints Id Resolve |
| GET | /api/dept/hr/dashboard | Yes | GET Hr Dashboard |
| GET | /api/dept/hr/departments | Yes | GET Hr Departments |
| POST | /api/dept/hr/departments | Yes | POST Hr Departments |
| DELETE | /api/dept/hr/departments/{id} | Yes | DELETE Hr Departments Id |
| PUT | /api/dept/hr/departments/{id} | Yes | PUT Hr Departments Id |
| GET | /api/dept/hr/designations | Yes | GET Hr Designations |
| POST | /api/dept/hr/designations | Yes | POST Hr Designations |
| DELETE | /api/dept/hr/designations/{id} | Yes | DELETE Hr Designations Id |
| PUT | /api/dept/hr/designations/{id} | Yes | PUT Hr Designations Id |
| GET | /api/dept/hr/employee-documents | Yes | GET Hr Employee Documents |
| POST | /api/dept/hr/employee-documents | Yes | POST Hr Employee Documents |
| DELETE | /api/dept/hr/employee-documents/{id} | Yes | DELETE Hr Employee Documents Id |
| PUT | /api/dept/hr/employee-documents/{id} | Yes | PUT Hr Employee Documents Id |
| GET | /api/dept/hr/employees | Yes | GET Hr Employees |
| POST | /api/dept/hr/employees | Yes | POST Hr Employees |
| PUT | /api/dept/hr/employees/{id} | Yes | PUT Hr Employees Id |
| POST | /api/dept/hr/employees/{id}/toggle-status | Yes | POST Hr Employees Id Toggle Status |
| GET | /api/dept/hr/exit-interviews | Yes | GET Hr Exit Interviews |
| POST | /api/dept/hr/exit-interviews | Yes | POST Hr Exit Interviews |
| DELETE | /api/dept/hr/exit-interviews/{id} | Yes | DELETE Hr Exit Interviews Id |
| PUT | /api/dept/hr/exit-interviews/{id} | Yes | PUT Hr Exit Interviews Id |
| GET | /api/dept/hr/holidays | Yes | GET Hr Holidays |
| POST | /api/dept/hr/holidays | Yes | POST Hr Holidays |
| DELETE | /api/dept/hr/holidays/{id} | Yes | DELETE Hr Holidays Id |
| PUT | /api/dept/hr/holidays/{id} | Yes | PUT Hr Holidays Id |
| GET | /api/dept/hr/interviews | Yes | GET Hr Interviews |
| POST | /api/dept/hr/interviews | Yes | POST Hr Interviews |
| DELETE | /api/dept/hr/interviews/{id} | Yes | DELETE Hr Interviews Id |
| PUT | /api/dept/hr/interviews/{id} | Yes | PUT Hr Interviews Id |
| GET | /api/dept/hr/jobs | Yes | GET Hr Jobs |
| POST | /api/dept/hr/jobs | Yes | POST Hr Jobs |
| DELETE | /api/dept/hr/jobs/{id} | Yes | DELETE Hr Jobs Id |
| PUT | /api/dept/hr/jobs/{id} | Yes | PUT Hr Jobs Id |
| GET | /api/dept/hr/leave | Yes | GET Hr Leave |
| GET | /api/dept/hr/leave-policies | Yes | GET Hr Leave Policies |
| POST | /api/dept/hr/leave-policies | Yes | POST Hr Leave Policies |
| DELETE | /api/dept/hr/leave-policies/{id} | Yes | DELETE Hr Leave Policies Id |
| PUT | /api/dept/hr/leave-policies/{id} | Yes | PUT Hr Leave Policies Id |
| POST | /api/dept/hr/leave/request | Yes | POST Hr Leave Request |
| PUT | /api/dept/hr/leave/{id}/approve | Yes | PUT Hr Leave Id Approve |
| PUT | /api/dept/hr/leave/{id}/reject | Yes | PUT Hr Leave Id Reject |
| GET | /api/dept/hr/notices | Yes | GET Hr Notices |
| POST | /api/dept/hr/notices | Yes | POST Hr Notices |
| DELETE | /api/dept/hr/notices/{id} | Yes | DELETE Hr Notices Id |
| PUT | /api/dept/hr/notices/{id} | Yes | PUT Hr Notices Id |
| GET | /api/dept/hr/offers | Yes | GET Hr Offers |
| POST | /api/dept/hr/offers | Yes | POST Hr Offers |
| DELETE | /api/dept/hr/offers/{id} | Yes | DELETE Hr Offers Id |
| PUT | /api/dept/hr/offers/{id} | Yes | PUT Hr Offers Id |
| GET | /api/dept/hr/performance | Yes | GET Hr Performance |
| POST | /api/dept/hr/performance | Yes | POST Hr Performance |
| PUT | /api/dept/hr/performance/{id} | Yes | PUT Hr Performance Id |
| GET | /api/dept/hr/policies | Yes | GET Hr Policies |
| POST | /api/dept/hr/policies | Yes | POST Hr Policies |
| DELETE | /api/dept/hr/policies/{id} | Yes | DELETE Hr Policies Id |
| PUT | /api/dept/hr/policies/{id} | Yes | PUT Hr Policies Id |
| GET | /api/dept/hr/policy-acknowledgements | Yes | GET Hr Policy Acknowledgements |
| POST | /api/dept/hr/policy-acknowledgements | Yes | POST Hr Policy Acknowledgements |
| DELETE | /api/dept/hr/policy-acknowledgements/{id} | Yes | DELETE Hr Policy Acknowledgements Id |
| GET | /api/dept/hr/support-tickets | Yes | GET Hr Support Tickets |
| POST | /api/dept/hr/support-tickets | Yes | POST Hr Support Tickets |
| PUT | /api/dept/hr/support-tickets/{id} | Yes | PUT Hr Support Tickets Id |
| PUT | /api/dept/hr/support-tickets/{id}/assign | Yes | PUT Hr Support Tickets Id Assign |
| PUT | /api/dept/hr/support-tickets/{id}/close | Yes | PUT Hr Support Tickets Id Close |
| POST | /api/dept/hr/support-tickets/{id}/comment | Yes | POST Hr Support Tickets Id Comment |
| PUT | /api/dept/hr/support-tickets/{id}/resolve | Yes | PUT Hr Support Tickets Id Resolve |
| GET | /api/dept/hr/tasks | Yes | GET Hr Tasks |
| POST | /api/dept/hr/tasks | Yes | POST Hr Tasks |
| PUT | /api/dept/hr/tasks/{id} | Yes | PUT Hr Tasks Id |
| PUT | /api/dept/hr/tasks/{id}/close | Yes | PUT Hr Tasks Id Close |
| GET | /api/dept/hr/work-reports | Yes | GET Hr Work Reports |
| PUT | /api/dept/hr/work-reports/{id}/review | Yes | PUT Hr Work Reports Id Review |

## IT (17)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/it/dashboard | Yes | GET It Dashboard |
| GET | /api/dept/it/projects | Yes | GET It Projects |
| POST | /api/dept/it/projects | Yes | POST It Projects |
| DELETE | /api/dept/it/projects/{id} | Yes | DELETE It Projects Id |
| GET | /api/dept/it/projects/{id} | Yes | GET It Projects Id |
| PUT | /api/dept/it/projects/{id} | Yes | PUT It Projects Id |
| PUT | /api/dept/it/projects/{id}/add-member | Yes | PUT It Projects Id Add Member |
| PUT | /api/dept/it/projects/{id}/update-progress | Yes | PUT It Projects Id Update Progress |
| GET | /api/dept/it/support-tickets | Yes | GET It Support Tickets |
| POST | /api/dept/it/support-tickets | Yes | POST It Support Tickets |
| GET | /api/dept/it/support-tickets/my-tickets | Yes | GET It Support Tickets My Tickets |
| GET | /api/dept/it/support-tickets/{id} | Yes | GET It Support Tickets Id |
| PUT | /api/dept/it/support-tickets/{id} | Yes | PUT It Support Tickets Id |
| PUT | /api/dept/it/support-tickets/{id}/assign | Yes | PUT It Support Tickets Id Assign |
| PUT | /api/dept/it/support-tickets/{id}/close | Yes | PUT It Support Tickets Id Close |
| POST | /api/dept/it/support-tickets/{id}/comment | Yes | POST It Support Tickets Id Comment |
| PUT | /api/dept/it/support-tickets/{id}/resolve | Yes | PUT It Support Tickets Id Resolve |

## Law (3)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/law/compliance | Yes | GET Law Compliance |
| GET | /api/dept/law/contracts | Yes | GET Law Contracts |
| GET | /api/dept/law/dashboard | Yes | GET Law Dashboard |

## Manager (22)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/manager/completed-tasks | Yes | GET Manager Completed Tasks |
| GET | /api/dept/manager/dashboard | Yes | GET Manager Dashboard |
| GET | /api/dept/manager/employee-work | Yes | GET Manager Employee Work |
| GET | /api/dept/manager/employee-work/stats | Yes | GET Manager Employee Work Stats |
| PUT | /api/dept/manager/employee-work/{workId}/approve | Yes | PUT Manager Employee Work WorkId Approve |
| PUT | /api/dept/manager/employee-work/{workId}/reject | Yes | PUT Manager Employee Work WorkId Reject |
| GET | /api/dept/manager/leave | Yes | GET Manager Leave |
| PUT | /api/dept/manager/leave/{id}/approve | Yes | PUT Manager Leave Id Approve |
| PUT | /api/dept/manager/leave/{id}/reject | Yes | PUT Manager Leave Id Reject |
| GET | /api/dept/manager/notifications | Yes | GET Manager Notifications |
| PUT | /api/dept/manager/notifications/mark-all-read | Yes | PUT Manager Notifications Mark All Read |
| PUT | /api/dept/manager/notifications/{id}/read | Yes | PUT Manager Notifications Id Read |
| GET | /api/dept/manager/project-teams | Yes | GET Manager Project Teams |
| POST | /api/dept/manager/project-teams | Yes | POST Manager Project Teams |
| GET | /api/dept/manager/projects | Yes | GET Manager Projects |
| GET | /api/dept/manager/tasks | Yes | GET Manager Tasks |
| POST | /api/dept/manager/tasks | Yes | POST Manager Tasks |
| PUT | /api/dept/manager/tasks/{id} | Yes | PUT Manager Tasks Id |
| PUT | /api/dept/manager/tasks/{id}/close | Yes | PUT Manager Tasks Id Close |
| PUT | /api/dept/manager/tasks/{id}/reassign | Yes | PUT Manager Tasks Id Reassign |
| GET | /api/dept/manager/team | Yes | GET Manager Team |
| GET | /api/dept/manager/work-reports | Yes | GET Manager Work Reports |

## Media (3)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/media/campaigns | Yes | GET Media Campaigns |
| GET | /api/dept/media/content | Yes | GET Media Content |
| GET | /api/dept/media/dashboard | Yes | GET Media Dashboard |

## Notification (3)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/notifications/ | Yes | GET Health |
| PUT | /api/notifications/mark-all-read | Yes | PUT Mark All Read |
| PUT | /api/notifications/{id}/read | Yes | PUT Id Read |

## Reports (1)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/reports/ | Yes | GET Health |

## Super Admin (8)

| Method | Path | Auth | Summary |
|---|---|---|---|
| GET | /api/dept/super-admin/company-controls | Yes | GET Super Admin Company Controls |
| PUT | /api/dept/super-admin/company-controls/{id} | Yes | PUT Super Admin Company Controls Id |
| GET | /api/dept/super-admin/dashboard | Yes | GET Super Admin Dashboard |
| GET | /api/dept/super-admin/feature-flags | Yes | GET Super Admin Feature Flags |
| PUT | /api/dept/super-admin/feature-flags/{id} | Yes | PUT Super Admin Feature Flags Id |
| GET | /api/dept/super-admin/portal-access | Yes | GET Super Admin Portal Access |
| PUT | /api/dept/super-admin/portal-access/{id} | Yes | PUT Super Admin Portal Access Id |
| GET | /api/dept/super-admin/system-health | Yes | GET Super Admin System Health |
