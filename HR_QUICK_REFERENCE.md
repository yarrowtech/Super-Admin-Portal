# 🎯 HR System - Quick Reference Guide

## 📍 Navigation Map

### Main Sections
```
HR Portal
├── 📊 Dashboard                    → /hr/dashboard
├── 👥 Employee Management          → /hr/system#employee-management
├── 📅 Attendance Management        → /hr/system#attendance-management
├── 🏖️ Leave Management            → /hr/system#leave-management
├── 🎯 Recruitment and Hiring       → /hr/system#recruitment-hiring
├── 📈 Performance & Appraisal      → /hr/system#performance-appraisal
├── 📄 Policy & Compliance          → /hr/system#policy-compliance
└── 📢 Communication & Reports      → /hr/system#employee-communication
```

---

## 🔌 API Quick Reference

### Employees
```javascript
// List employees
GET /api/dept/hr/employees?page=1&limit=10&role=employee&isActive=true

// Create employee
POST /api/dept/hr/employees
Body: { email, password, firstName, lastName, role, department }

// Update employee
PUT /api/dept/hr/employees/:id
Body: { firstName, lastName, phone, department, isActive }

// Toggle employee status
POST /api/dept/hr/employees/:id/toggle-status
```

### Attendance
```javascript
// List attendance records
GET /api/dept/hr/attendance?page=1&limit=10&employee=:id&startDate=2024-01-01

// Mark attendance
POST /api/dept/hr/attendance
Body: { employee, date, clockIn, clockOut, status }

// Get employee attendance
GET /api/dept/hr/attendance/employee/:employeeId?startDate=2024-01-01&endDate=2024-01-31
```

### Leave
```javascript
// List leave requests
GET /api/dept/hr/leave?status=pending&page=1&limit=10

// Approve leave
PUT /api/dept/hr/leave/:id/approve

// Reject leave
PUT /api/dept/hr/leave/:id/reject
Body: { rejectionReason }

// Leave policies
GET /api/dept/hr/leave-policies
POST /api/dept/hr/leave-policies
Body: { leaveType, annualQuota, carryForward, description }
```

### Recruitment
```javascript
// Job posts
GET /api/dept/hr/jobs?status=open
POST /api/dept/hr/jobs
Body: { title, department, description, requirements, salaryRange }

// Applicants
GET /api/dept/hr/applicants?status=interview&position=:position
POST /api/dept/hr/applicants
Body: { firstName, lastName, email, phone, position, resumeUrl }

// Interviews
GET /api/dept/hr/interviews?status=scheduled
POST /api/dept/hr/interviews
Body: { applicant, scheduledAt, location, panel, type }

// Offers
GET /api/dept/hr/offers?status=sent
POST /api/dept/hr/offers
Body: { applicant, position, salary, benefits, joiningDate }
```

### Performance
```javascript
// Performance reviews
GET /api/dept/hr/performance?employee=:id
POST /api/dept/hr/performance
Body: { employee, reviewer, reviewPeriod, ratings, overallRating }

// Appraisal cycles
GET /api/dept/hr/appraisal-cycles
POST /api/dept/hr/appraisal-cycles
Body: { name, startDate, endDate, participants }

// Appraisal reviews
GET /api/dept/hr/appraisals?cycle=:cycleId
POST /api/dept/hr/appraisals
Body: { employee, cycle, selfAssessment, rating }
```

### Policies & Compliance
```javascript
// Policies
GET /api/dept/hr/policies
POST /api/dept/hr/policies
Body: { title, category, content, requiresAcknowledgment }

// Policy acknowledgments
GET /api/dept/hr/policy-acknowledgements?policy=:policyId
POST /api/dept/hr/policy-acknowledgements
Body: { policy, employee }
```

### Communication
```javascript
// Notices
GET /api/dept/hr/notices
POST /api/dept/hr/notices
Body: { title, content, type, priority, targetAudience }

// Complaints
GET /api/dept/hr/complaints?status=pending
PUT /api/dept/hr/complaints/:id/assign
Body: { assignedTo }
PUT /api/dept/hr/complaints/:id/resolve
Body: { solution, actionTaken }

// Support tickets
GET /api/dept/hr/support-tickets
POST /api/dept/hr/support-tickets/:id/comment
Body: { comment, isInternal }
```

---

## 📦 Component Usage

### Using hrApi
```javascript
import { hrApi } from '../../api/hr';
import { useAuth } from '../../context/AuthContext';

const MyComponent = () => {
  const { token } = useAuth();

  // Get employees
  const employees = await hrApi.getEmployees(token, { page: 1, limit: 10 });

  // Create employee
  const newEmployee = await hrApi.createEmployee({
    email: 'john@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'employee'
  }, token);

  // Approve leave
  await hrApi.approveLeave(leaveId, token);

  // Get applicants
  const applicants = await hrApi.getApplicants(token, { status: 'interview' });
};
```

### Using PortalHeader
```javascript
import PortalHeader from '../common/PortalHeader';

<PortalHeader
  title="HR Management"
  subtitle="Manage employees, leaves, and recruitment"
  user={user}
  icon="badge"
  showSearch={true}
  showNotifications={true}
  showThemeToggle={true}
  onSearchChange={(e) => setSearchQuery(e.target.value)}
  searchPlaceholder="Search employees..."
/>
```

### Using KPICard
```javascript
import KPICard from '../common/KPICard';

<KPICard
  title="Total Employees"
  value={totalEmployees}
  icon="groups"
  colorScheme="blue"
  subtitle="WORKFORCE"
  trend={{ direction: 'up', value: `${activeEmployees} active` }}
/>
```

---

## 🎨 Color Schemes

### KPICard Colors
- `blue` - Primary/Employees
- `green` - Success/Active
- `orange` - Warning/Pending
- `red` - Error/Critical
- `purple` - Info/Special
- `indigo` - Alternative

### Status Colors
```css
Approved/Active:    green-600
Pending:           orange-600
Rejected/Inactive: red-600
Neutral:           gray-600
Primary:           purple-600
```

---

## 🔐 Role-Based Access

### Quick Permission Check
```javascript
const permissions = {
  admin: ['*'], // Full access
  hr: [
    'employees:*',
    'attendance:*',
    'leave:approve',
    'recruitment:*',
    'performance:*'
  ],
  manager: [
    'employees:read:team',
    'attendance:read:team',
    'leave:approve:team',
    'performance:create:team'
  ],
  employee: [
    'employees:read:self',
    'attendance:mark:self',
    'leave:apply',
    'performance:read:self'
  ]
};
```

---

## 📊 Dashboard Sections

### KPI Cards
1. **Total Employees** (Blue) - Count of all employees
2. **Pending Leaves** (Orange) - Leaves awaiting approval
3. **Applicants** (Purple) - Candidates in pipeline
4. **Open Complaints** (Red) - Unresolved complaints

### Main Content
- **Pending Leave Approvals** - Table with approve/reject actions
- **Recent Activities** - Latest HR actions and updates

### Sidebar
- **Quick Stats** - Today's attendance, active employees, open positions
- **Department Overview** - Employee distribution by department
- **Quick Actions** - Add Employee, Create Notice, Post Job

---

## 🗂️ File Structure

### Backend
```
backend/
├── controllers/dept/hr.controller.js  # All HR business logic
├── routes/dept/hr.routes.js           # All HR routes
└── models/
    ├── User.js
    ├── Attendance.js
    ├── Leave.js
    ├── Applicant.js
    ├── Performance.js
    ├── Complaint.js
    ├── Notice.js
    └── ... (15+ models)
```

### Frontend
```
frontend/src/
├── components/hr/
│   ├── HRDashboard.jsx              # Main dashboard
│   ├── HRPortal.jsx                 # Layout wrapper
│   ├── HRSidebar.jsx                # Navigation
│   ├── EmployeeDirectory.jsx        # Employee list
│   ├── Attendance.jsx               # Attendance tracking
│   ├── LeaveManagement.jsx          # Leave management
│   ├── ApplicantTracking.jsx        # Recruitment
│   ├── Performance.jsx              # Performance reviews
│   ├── Notices.jsx                  # Notice board
│   └── ComplaintSolutions.jsx       # Complaint handling
└── api/
    └── hr.js                        # 90+ API methods
```

---

## 🚀 Common Workflows

### 1. Approve a Leave Request
```javascript
const handleApprove = async (leaveId) => {
  try {
    setLoading(true);
    await hrApi.approveLeave(leaveId, token);
    // Refresh leave list
    await fetchPendingLeaves();
    showNotification('Leave approved successfully', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  } finally {
    setLoading(false);
  }
};
```

### 2. Create a Job Posting
```javascript
const createJob = async (jobData) => {
  try {
    const newJob = await hrApi.createJobPost({
      title: jobData.title,
      department: jobData.department,
      location: jobData.location,
      jobType: 'full-time',
      description: jobData.description,
      requirements: jobData.requirements,
      salaryRange: { min: jobData.minSalary, max: jobData.maxSalary },
      status: 'open'
    }, token);

    navigate(`/hr/jobs/${newJob.data._id}`);
  } catch (error) {
    console.error('Failed to create job:', error);
  }
};
```

### 3. Schedule an Interview
```javascript
const scheduleInterview = async (applicantId, interviewData) => {
  try {
    await hrApi.createInterview({
      applicant: applicantId,
      scheduledAt: interviewData.date,
      duration: 60,
      location: interviewData.location,
      type: 'in-person',
      panel: interviewData.panelMembers
    }, token);

    // Update applicant status
    await hrApi.updateApplicant(applicantId, {
      status: 'interview'
    }, token);
  } catch (error) {
    console.error('Failed to schedule interview:', error);
  }
};
```

---

## 📝 Common Patterns

### Error Handling
```javascript
try {
  setLoading(true);
  const response = await hrApi.getEmployees(token);
  setData(response.data);
} catch (error) {
  setError(error.message || 'Failed to load data');
} finally {
  setLoading(false);
}
```

### Pagination
```javascript
const [page, setPage] = useState(1);
const [limit] = useState(10);

const fetchData = async () => {
  const response = await hrApi.getEmployees(token, { page, limit });
  setData(response.data.employees);
  setTotalPages(response.data.totalPages);
};
```

### Filtering
```javascript
const fetchFilteredData = async (filters) => {
  const response = await hrApi.getEmployees(token, {
    ...filters,
    page: 1,
    limit: 10
  });
  setData(response.data.employees);
};
```

---

## 🎯 Best Practices

### 1. Always validate user input
```javascript
if (!email || !password || !firstName || !lastName) {
  return setError('All fields are required');
}
```

### 2. Use loading states
```javascript
{loading ? (
  <div>Loading...</div>
) : (
  <DataTable data={employees} />
)}
```

### 3. Implement proper error states
```javascript
{error && (
  <div className="error-message">
    <span className="material-symbols-outlined">error</span>
    <p>{error}</p>
  </div>
)}
```

### 4. Use optimistic UI updates
```javascript
// Update UI immediately
setData(prev => [...prev, newItem]);

// Then sync with backend
try {
  await hrApi.createEmployee(newItem, token);
} catch (error) {
  // Revert on error
  setData(prev => prev.filter(item => item.id !== newItem.id));
}
```

---

## 📞 Support & Documentation

### Resources
- **Full Documentation**: `HR_SYSTEM_STRUCTURE.md`
- **API Documentation**: Check backend route definitions
- **Component Library**: See `components/common/`

### Common Issues
1. **401 Unauthorized**: Token expired or invalid
2. **403 Forbidden**: Insufficient permissions
3. **404 Not Found**: Resource doesn't exist
4. **500 Server Error**: Backend issue, check logs

---

**Quick Reference Version**: 1.0
**Last Updated**: December 2024
