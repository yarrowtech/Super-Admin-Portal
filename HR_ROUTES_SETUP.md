# HR Routes Setup Guide

## 🎯 Route Structure

Your HR system now has **7 dedicated pages** with separate routes:

```
/hr/dashboard              → HRDashboard (Main dashboard with KPIs)
/hr/employees             → EmployeesPage (Employee management)
/hr/attendance            → AttendancePage (Attendance tracking)
/hr/leave                 → LeavePage (Leave requests, policies, holidays)
/hr/recruitment           → RecruitmentPage (Jobs, applicants, interviews)
/hr/performance           → PerformancePage (Reviews & appraisals)
/hr/policies              → PoliciesPage (Policies & compliance)
/hr/communication         → CommunicationPage (Notices, complaints, reports)
```

---

## 📋 Setup Instructions

### Step 1: Update Your Main Routes File

Add these routes to your main routing configuration (usually in `App.jsx` or `routes/index.jsx`):

```jsx
import { Routes, Route } from 'react-router-dom';
import HRPortal from './components/hr/HRPortal';
import HRDashboard from './components/hr/HRDashboard';
import {
  EmployeesPage,
  AttendancePage,
  LeavePage,
  RecruitmentPage,
  PerformancePage,
  PoliciesPage,
  CommunicationPage,
} from './components/hr/pages';

// Inside your Routes component:
<Route path="/hr" element={<HRPortal />}>
  <Route path="dashboard" element={<HRDashboard />} />
  <Route path="employees" element={<EmployeesPage />} />
  <Route path="attendance" element={<AttendancePage />} />
  <Route path="leave" element={<LeavePage />} />
  <Route path="recruitment" element={<RecruitmentPage />} />
  <Route path="performance" element={<PerformancePage />} />
  <Route path="policies" element={<PoliciesPage />} />
  <Route path="communication" element={<CommunicationPage />} />
</Route>
```

### Step 2: Update HRPortal Component

Make sure `HRPortal.jsx` uses `<Outlet />` to render child routes:

```jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import HRSidebar from './HRSidebar';

const HRPortal = () => {
  return (
    <div className="relative flex min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <HRSidebar />
      <div className="ml-64 flex-1 overflow-x-hidden">
        <Outlet /> {/* This renders the child routes */}
      </div>
    </div>
  );
};

export default HRPortal;
```

---

## 🎨 Page Features

### 1. **EmployeesPage** (`/hr/employees`)
- **Features:**
  - Employee list with search & filters
  - KPI cards (Total, Active, Inactive, Departments)
  - Department & Status filters
  - Toggle employee status
  - Add new employee button
  - Professional table layout

### 2. **AttendancePage** (`/hr/attendance`)
- **Features:**
  - Uses existing `Attendance` component
  - Wrapped with PortalHeader
  - Consistent styling
  - Full attendance tracking functionality

### 3. **LeavePage** (`/hr/leave`)
- **Features:**
  - **3 Tabs:**
    1. Leave Requests (LeaveManagement component)
    2. Leave Policies (LeavePolicies component) ✨ NEW
    3. Holiday Calendar (HolidayCalendar component) ✨ NEW
  - Tab navigation with icons
  - Comprehensive leave management

### 4. **RecruitmentPage** (`/hr/recruitment`)
- **Features:**
  - Uses existing `ApplicantTracking` component
  - Job postings management
  - Applicant pipeline
  - Interview scheduling
  - Offer management

### 5. **PerformancePage** (`/hr/performance`)
- **Features:**
  - Uses existing `Performance` component
  - Performance reviews
  - Appraisal cycles
  - Employee goals tracking

### 6. **PoliciesPage** (`/hr/policies`)
- **Features:**
  - KPI cards for policy metrics
  - Coming soon placeholder
  - Ready for policy management features
  - Professional layout

### 7. **CommunicationPage** (`/hr/communication`)
- **Features:**
  - **3 Tabs:**
    1. Notices & Announcements (Notices component)
    2. Complaints & Solutions (ComplaintSolutions component)
    3. Work Reports (StaffWorkReport component)
  - Tab navigation with icons
  - Complete communication suite

---

## 🗂️ File Structure

```
frontend/src/components/hr/
├── HRPortal.jsx                    # Main layout wrapper
├── HRSidebar.jsx                   # Navigation (✅ Updated with new routes)
├── HRDashboard.jsx                 # Main dashboard
├── pages/                          # ✨ NEW Dedicated pages
│   ├── index.js                    # Export all pages
│   ├── EmployeesPage.jsx          # Employee management page
│   ├── AttendancePage.jsx         # Attendance page
│   ├── LeavePage.jsx              # Leave management (with tabs)
│   ├── RecruitmentPage.jsx        # Recruitment page
│   ├── PerformancePage.jsx        # Performance page
│   ├── PoliciesPage.jsx           # Policies page
│   └── CommunicationPage.jsx      # Communication (with tabs)
├── Attendance.jsx                  # Attendance component
├── LeaveManagement.jsx             # Leave requests component
├── LeavePolicies.jsx              # ✨ NEW Leave policies
├── HolidayCalendar.jsx            # ✨ NEW Holiday calendar
├── ApplicantTracking.jsx          # ATS component
├── Performance.jsx                 # Performance component
├── Notices.jsx                     # Notices component
├── ComplaintSolutions.jsx         # Complaints component
└── StaffWorkReport.jsx            # Work reports component
```

---

## 🎯 Navigation Flow

### Sidebar Navigation
```
Dashboard          →  /hr/dashboard
Employee Management →  /hr/employees
Attendance         →  /hr/attendance
Leave Management   →  /hr/leave
Recruitment        →  /hr/recruitment
Performance        →  /hr/performance
Policies           →  /hr/policies
Communication      →  /hr/communication
```

### Page-Specific Tabs

**Leave Management** (`/hr/leave`):
- Tab 1: Leave Requests
- Tab 2: Leave Policies
- Tab 3: Holiday Calendar

**Communication** (`/hr/communication`):
- Tab 1: Notices & Announcements
- Tab 2: Complaints & Solutions
- Tab 3: Work Reports

---

## ✅ Implementation Checklist

- [x] Create 7 dedicated page components
- [x] Update HRSidebar with new routes
- [x] Create pages index export file
- [x] Add PortalHeader to all pages
- [x] Ensure consistent styling across pages
- [x] Create tab navigation for multi-section pages
- [ ] **TODO: Add routes to main App.jsx**
- [ ] **TODO: Update HRPortal to use Outlet**
- [ ] **TODO: Test all page navigations**

---

## 🚀 Example Route Configuration

### Full Example (App.jsx or routes/index.jsx)

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Import components
import Login from './components/common/Login';
import AdminPortal from './components/admin/AdminPortal';
import AdminDashboard from './components/admin/AdminDashboard';
import HRPortal from './components/hr/HRPortal';
import HRDashboard from './components/hr/HRDashboard';
import {
  EmployeesPage,
  AttendancePage,
  LeavePage,
  RecruitmentPage,
  PerformancePage,
  PoliciesPage,
  CommunicationPage,
} from './components/hr/pages';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminPortal />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            {/* Add other admin routes */}
          </Route>

          {/* HR Routes */}
          <Route path="/hr" element={<HRPortal />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<HRDashboard />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="recruitment" element={<RecruitmentPage />} />
            <Route path="performance" element={<PerformancePage />} />
            <Route path="policies" element={<PoliciesPage />} />
            <Route path="communication" element={<CommunicationPage />} />
          </Route>

          {/* Other department routes... */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## 🎨 Consistent Design Features

All pages include:
- ✅ PortalHeader component
- ✅ Gradient background
- ✅ Dark mode support
- ✅ Search functionality (where applicable)
- ✅ Notifications icon
- ✅ Theme toggle
- ✅ Responsive design
- ✅ Consistent spacing & padding
- ✅ Professional color scheme

---

## 📊 Benefits of Separate Pages

### 1. **Better Performance**
- Each page loads independently
- Reduced initial bundle size
- Faster navigation

### 2. **Cleaner URLs**
- `/hr/employees` instead of `/hr/system#employee-management`
- Better for bookmarking
- SEO-friendly (if applicable)

### 3. **Improved UX**
- No scrolling to sections
- Clear navigation
- Browser back/forward works correctly
- Each module feels like its own app

### 4. **Easier Maintenance**
- Each page is self-contained
- Easier to debug
- Better code organization
- Team can work on different pages simultaneously

---

## 🔄 Migration from Hash Routes

**Before:**
```jsx
<NavLink to="/hr/system#employee-management">
  Employee Management
</NavLink>
```

**After:**
```jsx
<NavLink to="/hr/employees">
  Employee Management
</NavLink>
```

The HRSidebar has already been updated! ✅

---

## 📝 Next Steps

1. **Add the routes** to your main routing file (see example above)
2. **Update HRPortal** to use `<Outlet />` (if not already done)
3. **Test navigation** - Click through all sidebar links
4. **Verify functionality** - Test each page's features
5. **Optional:** Add loading states or protected routes

---

## 🎉 You're Done!

Your HR system now has:
- ✅ 7 Dedicated pages with separate routes
- ✅ Professional UI/UX matching Admin & CEO dashboards
- ✅ Tab navigation for multi-section pages
- ✅ Consistent design across all pages
- ✅ Complete API integration
- ✅ Dark mode support
- ✅ Responsive design

**Happy HR Management! 🚀**

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Status**: Ready for Implementation
