# 🏢 HR Management System - Professional Structure

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Architecture](#architecture)
- [Module Breakdown](#module-breakdown)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [User Roles & Permissions](#user-roles--permissions)
- [Workflows](#workflows)
- [Integration Points](#integration-points)

---

## 🎯 System Overview

### Purpose
A comprehensive Human Resources Management System designed to streamline HR operations, from recruitment to employee lifecycle management, performance tracking, and compliance.

### Core Capabilities
- **Employee Lifecycle Management**: Onboarding to offboarding
- **Attendance & Leave Tracking**: Real-time monitoring and approvals
- **Recruitment & Hiring**: End-to-end applicant tracking system (ATS)
- **Performance Management**: Reviews, appraisals, and goal tracking
- **Compliance & Documentation**: Policy management and acknowledgments
- **Communication & Reporting**: Notices, complaints, and analytics

---

## 🏗️ Architecture

### Technology Stack

#### Frontend
```
├── React 18+
├── React Router v6
├── Tailwind CSS
├── Material Symbols Icons
└── Vite (Build Tool)
```

#### Backend
```
├── Node.js + Express.js
├── MongoDB + Mongoose
├── JWT Authentication
├── Role-based Access Control (RBAC)
└── RESTful API Architecture
```

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Browser    │  │   Mobile     │  │   Tablet     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  PRESENTATION LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React Components (Views)                            │  │
│  │  - HRDashboard  - EmployeeDirectory                  │  │
│  │  - LeaveManagement  - Attendance                     │  │
│  │  - ApplicantTracking  - Performance                  │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  State Management & API Layer                        │  │
│  │  - AuthContext  - hrApi  - apiClient                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Authentication Middleware                            │  │
│  │  - JWT Verification                                   │  │
│  │  - Role Authorization                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Controllers│  │  Services  │  │ Validators │           │
│  │  (Routes)  │  │  (Logic)   │  │   (Rules)  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA ACCESS LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Mongoose Models (ODM)                                │  │
│  │  - User  - Attendance  - Leave  - Performance        │  │
│  │  - Applicant  - Complaint  - Notice  - Policy        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE LAYER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             MongoDB Database                          │  │
│  │  Collections: users, attendance, leaves, applicants   │  │
│  │              complaints, notices, performance, etc.   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Module Breakdown

### 1. **Employee Management** 👥
Complete employee lifecycle management from hire to retire.

#### Features
- Employee Directory & Profiles
- Onboarding & Offboarding
- Employee Documents Management
- Department & Designation Management
- Biometric Enrollment
- Employee Status Management (Active/Inactive)

#### Components
```
frontend/src/components/hr/
├── EmployeeDirectory.jsx          # List & search employees
├── EmployeeProfile.jsx            # Individual employee details
├── EmployeeOnboarding.jsx         # New hire onboarding
└── EmployeeDocuments.jsx          # Document management
```

#### API Endpoints
```
GET    /api/dept/hr/employees              # List employees
POST   /api/dept/hr/employees              # Create employee
GET    /api/dept/hr/employees/:id          # Get employee details
PUT    /api/dept/hr/employees/:id          # Update employee
POST   /api/dept/hr/employees/:id/toggle-status
GET    /api/dept/hr/departments            # List departments
POST   /api/dept/hr/departments            # Create department
GET    /api/dept/hr/designations           # List designations
POST   /api/dept/hr/designations           # Create designation
```

#### Database Models
```javascript
User {
  email: String (unique)
  password: String (hashed)
  firstName: String
  lastName: String
  role: String (enum)
  department: String
  designation: String
  phone: String
  isActive: Boolean
  joinDate: Date
  createdAt: Date
  updatedAt: Date
}

Department {
  name: String (unique)
  code: String
  manager: ObjectId (ref: User)
  description: String
  isActive: Boolean
}

Designation {
  name: String
  department: String
  level: String
  description: String
  isActive: Boolean
}

EmployeeDocument {
  employee: ObjectId (ref: User)
  documentType: String (enum)
  documentName: String
  fileUrl: String
  uploadedDate: Date
  expiryDate: Date
  status: String (enum)
}
```

---

### 2. **Attendance Management** 📅
Real-time attendance tracking and reporting.

#### Features
- Clock In/Out Management
- Attendance Records
- Late/Early Departure Tracking
- Monthly Attendance Reports
- Biometric Integration Support
- Attendance Regularization

#### Components
```
frontend/src/components/hr/
├── Attendance.jsx                 # Main attendance view
├── AttendanceCalendar.jsx         # Calendar view
├── AttendanceReports.jsx          # Analytics & reports
└── BiometricEnrollment.jsx        # Biometric setup
```

#### API Endpoints
```
GET    /api/dept/hr/attendance                    # List attendance
POST   /api/dept/hr/attendance                    # Create record
PUT    /api/dept/hr/attendance/:id                # Update record
GET    /api/dept/hr/attendance/employee/:id       # Employee attendance
GET    /api/dept/hr/biometrics                    # Biometric enrollments
POST   /api/dept/hr/biometrics                    # Enroll biometric
```

#### Database Models
```javascript
Attendance {
  employee: ObjectId (ref: User)
  date: Date
  clockIn: Date
  clockOut: Date
  status: String (enum: present, absent, late, half-day)
  workHours: Number
  overtime: Number
  location: String
  approvedBy: ObjectId (ref: User)
  remarks: String
  createdAt: Date
}

BiometricEnrollment {
  employee: ObjectId (ref: User)
  deviceId: String
  enrollmentDate: Date
  biometricData: String (encrypted)
  status: String (enum: active, inactive)
  lastSync: Date
}
```

---

### 3. **Leave Management** 🏖️
Comprehensive leave tracking and approval system.

#### Features
- Leave Application & Approval
- Multiple Leave Types (Sick, Casual, Earned, etc.)
- Leave Balance Tracking
- Leave Policies Management
- Leave Calendar
- Auto-deduction from Leave Balance
- Leave History & Reports

#### Components
```
frontend/src/components/hr/
├── LeaveManagement.jsx            # Main leave dashboard
├── LeaveApplication.jsx           # Apply for leave
├── LeaveApproval.jsx              # Approve/reject leaves
├── LeavePolicies.jsx              # Policy management
└── LeaveCalendar.jsx              # Calendar view
```

#### API Endpoints
```
GET    /api/dept/hr/leave                         # List leave requests
PUT    /api/dept/hr/leave/:id/approve             # Approve leave
PUT    /api/dept/hr/leave/:id/reject              # Reject leave
GET    /api/dept/hr/leave-policies                # List policies
POST   /api/dept/hr/leave-policies                # Create policy
GET    /api/dept/hr/holidays                      # List holidays
POST   /api/dept/hr/holidays                      # Create holiday
```

#### Database Models
```javascript
Leave {
  employee: ObjectId (ref: User)
  leaveType: String (enum)
  startDate: Date
  endDate: Date
  numberOfDays: Number
  reason: String
  status: String (enum: pending, approved, rejected)
  approvedBy: ObjectId (ref: User)
  approvedDate: Date
  rejectionReason: String
  attachments: [String]
  createdAt: Date
}

LeavePolicy {
  leaveType: String
  annualQuota: Number
  carryForward: Boolean
  maxCarryForward: Number
  applicableRoles: [String]
  minimumNotice: Number
  description: String
  isActive: Boolean
}

Holiday {
  name: String
  date: Date
  type: String (enum: public, optional)
  department: String
  description: String
  isRecurring: Boolean
}
```

---

### 4. **Recruitment & Hiring** 🎯
End-to-end Applicant Tracking System (ATS).

#### Features
- Job Posting Management
- Applicant Tracking
- Resume Parsing & Management
- Interview Scheduling
- Offer Management
- Candidate Communication
- Hiring Pipeline Analytics

#### Components
```
frontend/src/components/hr/
├── ApplicantTracking.jsx          # Main ATS dashboard
├── JobPostings.jsx                # Job management
├── ApplicantList.jsx              # Candidate list
├── InterviewScheduler.jsx         # Schedule interviews
└── OfferManagement.jsx            # Create & manage offers
```

#### API Endpoints
```
GET    /api/dept/hr/jobs                          # List job posts
POST   /api/dept/hr/jobs                          # Create job post
GET    /api/dept/hr/applicants                    # List applicants
POST   /api/dept/hr/applicants                    # Create applicant
GET    /api/dept/hr/applicants/:id                # Get applicant
PUT    /api/dept/hr/applicants/:id                # Update applicant
GET    /api/dept/hr/interviews                    # List interviews
POST   /api/dept/hr/interviews                    # Schedule interview
GET    /api/dept/hr/offers                        # List offers
POST   /api/dept/hr/offers                        # Create offer
```

#### Database Models
```javascript
JobPost {
  title: String
  department: String
  location: String
  jobType: String (enum: full-time, part-time, contract)
  description: String
  requirements: [String]
  responsibilities: [String]
  salaryRange: { min: Number, max: Number }
  status: String (enum: draft, open, closed)
  postedDate: Date
  closingDate: Date
  createdBy: ObjectId (ref: User)
}

Applicant {
  firstName: String
  lastName: String
  email: String
  phone: String
  position: String
  resumeUrl: String
  coverLetterUrl: String
  status: String (enum: applied, screening, interview, offer, hired, rejected)
  source: String
  appliedDate: Date
  reviewedBy: ObjectId (ref: User)
  notes: String
}

Interview {
  applicant: ObjectId (ref: Applicant)
  scheduledAt: Date
  duration: Number
  location: String
  type: String (enum: phone, video, in-person)
  panel: [ObjectId] (ref: User)
  status: String (enum: scheduled, completed, cancelled)
  feedback: String
  rating: Number
}

Offer {
  applicant: ObjectId (ref: Applicant)
  position: String
  department: String
  salary: Number
  benefits: [String]
  joiningDate: Date
  validUntil: Date
  status: String (enum: draft, sent, accepted, rejected, expired)
  offerLetterUrl: String
}
```

---

### 5. **Performance & Appraisal** 📈
Performance tracking and appraisal management.

#### Features
- Performance Reviews
- Goal Setting & Tracking
- 360-Degree Feedback
- Appraisal Cycles Management
- Rating & Scoring
- Performance Reports

#### Components
```
frontend/src/components/hr/
├── Performance.jsx                # Main performance view
├── PerformanceReviews.jsx         # Review management
├── GoalManagement.jsx             # Goal tracking
├── AppraisalCycles.jsx            # Cycle management
└── PerformanceReports.jsx         # Analytics
```

#### API Endpoints
```
GET    /api/dept/hr/performance                   # List reviews
POST   /api/dept/hr/performance                   # Create review
PUT    /api/dept/hr/performance/:id               # Update review
GET    /api/dept/hr/appraisal-cycles              # List cycles
POST   /api/dept/hr/appraisal-cycles              # Create cycle
GET    /api/dept/hr/appraisals                    # List appraisals
POST   /api/dept/hr/appraisals                    # Create appraisal
```

#### Database Models
```javascript
Performance {
  employee: ObjectId (ref: User)
  reviewer: ObjectId (ref: User)
  reviewPeriod: { startDate: Date, endDate: Date }
  reviewType: String (enum: monthly, quarterly, annual)
  ratings: [{
    category: String
    score: Number
    comments: String
  }]
  overallRating: Number
  strengths: [String]
  areasOfImprovement: [String]
  goals: [String]
  status: String (enum: draft, submitted, approved)
  createdAt: Date
}

AppraisalCycle {
  name: String
  startDate: Date
  endDate: Date
  status: String (enum: planning, active, completed)
  participants: [ObjectId] (ref: User)
  description: String
}

AppraisalReview {
  employee: ObjectId (ref: User)
  cycle: ObjectId (ref: AppraisalCycle)
  reviewer: ObjectId (ref: User)
  selfAssessment: String
  managerFeedback: String
  rating: Number
  increment: Number
  promotion: Boolean
  status: String (enum: pending, completed)
}
```

---

### 6. **Policy, Compliance & Documentation** 📄
Policy management and compliance tracking.

#### Features
- Policy Document Management
- Policy Acknowledgment Tracking
- Compliance Monitoring
- Document Version Control
- Policy Distribution
- Audit Trail

#### Components
```
frontend/src/components/hr/
├── PolicyManagement.jsx           # Policy CRUD
├── PolicyAcknowledgment.jsx       # Track acknowledgments
├── ComplianceTracker.jsx          # Compliance monitoring
└── DocumentLibrary.jsx            # Document repository
```

#### API Endpoints
```
GET    /api/dept/hr/policies                      # List policies
POST   /api/dept/hr/policies                      # Create policy
PUT    /api/dept/hr/policies/:id                  # Update policy
DELETE /api/dept/hr/policies/:id                  # Delete policy
GET    /api/dept/hr/policy-acknowledgements       # List acknowledgments
POST   /api/dept/hr/policy-acknowledgements       # Create acknowledgment
```

#### Database Models
```javascript
PolicyDocument {
  title: String
  category: String (enum)
  description: String
  content: String
  fileUrl: String
  version: String
  publishedBy: ObjectId (ref: User)
  publishedAt: Date
  effectiveDate: Date
  reviewDate: Date
  isActive: Boolean
  requiresAcknowledgment: Boolean
}

PolicyAcknowledgement {
  policy: ObjectId (ref: PolicyDocument)
  employee: ObjectId (ref: User)
  acknowledgedAt: Date
  ipAddress: String
  userAgent: String
}
```

---

### 7. **Employee Communication & Reports** 📢
Communication and reporting tools.

#### Features
- Notice Board
- Announcements
- Employee Complaints
- Support Tickets
- Work Reports
- Exit Interviews
- HR Analytics Dashboard

#### Components
```
frontend/src/components/hr/
├── Notices.jsx                    # Notice management
├── ComplaintSolutions.jsx         # Complaint handling
├── StaffWorkReport.jsx            # Work report tracking
├── SupportTickets.jsx             # HR support
└── HRReports.jsx                  # Analytics & reports
```

#### API Endpoints
```
GET    /api/dept/hr/notices                       # List notices
POST   /api/dept/hr/notices                       # Create notice
GET    /api/dept/hr/complaints                    # List complaints
PUT    /api/dept/hr/complaints/:id/assign         # Assign complaint
PUT    /api/dept/hr/complaints/:id/resolve        # Resolve complaint
GET    /api/dept/hr/work-reports                  # List work reports
PUT    /api/dept/hr/work-reports/:id/review       # Review report
GET    /api/dept/hr/support-tickets               # List tickets
POST   /api/dept/hr/support-tickets/:id/comment   # Add comment
GET    /api/dept/hr/exit-interviews               # List exit interviews
POST   /api/dept/hr/exit-interviews               # Create exit interview
```

#### Database Models
```javascript
Notice {
  title: String
  content: String
  type: String (enum: general, urgent, policy, event)
  priority: String (enum: low, medium, high)
  publishedBy: ObjectId (ref: User)
  publishDate: Date
  expiryDate: Date
  targetAudience: [String]
  isActive: Boolean
}

Complaint {
  complainant: ObjectId (ref: User)
  againstPerson: ObjectId (ref: User)
  category: String (enum)
  subject: String
  description: String
  severity: String (enum: low, medium, high, critical)
  status: String (enum: pending, investigating, resolved, closed)
  assignedTo: ObjectId (ref: User)
  solution: String
  actionTaken: String
  resolvedDate: Date
  comments: [{
    commentedBy: ObjectId (ref: User)
    comment: String
    commentedAt: Date
  }]
}

WorkReport {
  employee: ObjectId (ref: User)
  reportDate: Date
  reportType: String (enum: daily, weekly, monthly)
  project: ObjectId (ref: Project)
  tasksCompleted: [String]
  hoursWorked: Number
  achievements: String
  challenges: String
  status: String (enum: submitted, reviewed, approved)
  reviewedBy: ObjectId (ref: User)
  feedback: String
}

SupportTicket {
  requester: ObjectId (ref: User)
  category: String (enum)
  priority: String (enum)
  subject: String
  description: String
  status: String (enum: open, in-progress, resolved, closed)
  assignedTo: ObjectId (ref: User)
  solution: String
  comments: [{
    commentedBy: ObjectId (ref: User)
    comment: String
    isInternal: Boolean
    commentedAt: Date
  }]
}

ExitInterview {
  employee: ObjectId (ref: User)
  interviewer: ObjectId (ref: User)
  interviewDate: Date
  exitDate: Date
  reason: String
  feedback: String
  suggestions: String
  wouldRehire: Boolean
  status: String (enum: scheduled, completed)
}
```

---

## 🗂️ Database Schema

### Entity Relationship Diagram (ERD)

```
┌─────────────────┐
│      User       │◄──────────┐
│  (Employees)    │           │
└─────────────────┘           │
        │                     │
        │ 1:N                 │
        ▼                     │
┌─────────────────┐           │
│   Attendance    │           │
└─────────────────┘           │
                              │
┌─────────────────┐           │
│     Leave       │───────────┘
└─────────────────┘     N:1
        │
        │ N:1
        ▼
┌─────────────────┐
│  LeavePolicy    │
└─────────────────┘

┌─────────────────┐
│   Applicant     │
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐           ┌─────────────────┐
│   Interview     │           │     JobPost     │
└─────────────────┘           └─────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────┐
│      Offer      │
└─────────────────┘

┌─────────────────┐
│   Performance   │◄──────────┐
└─────────────────┘           │
                              │
┌─────────────────┐           │
│AppraisalReview  │───────────┘
└─────────────────┘     N:1
        │                (reviewer)
        │ N:1
        ▼
┌─────────────────┐
│ AppraisalCycle  │
└─────────────────┘

┌─────────────────┐
│PolicyDocument   │
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐
│PolicyAck        │
└─────────────────┘

┌─────────────────┐
│    Notice       │
└─────────────────┘

┌─────────────────┐
│   Complaint     │
└─────────────────┘

┌─────────────────┐
│  WorkReport     │
└─────────────────┘

┌─────────────────┐
│ SupportTicket   │
└─────────────────┘

┌─────────────────┐
│ ExitInterview   │
└─────────────────┘
```

---

## 🔐 User Roles & Permissions

### Role Hierarchy

```
┌─────────────────┐
│      ADMIN      │  (Super Admin - Full Access)
└─────────────────┘
        │
        ▼
┌─────────────────┐
│       CEO       │  (Executive Access)
└─────────────────┘
        │
        ▼
┌─────────────────┐
│       HR        │  (HR Department Access)
└─────────────────┘
        │
        ├─────────────────┐
        ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│    MANAGER      │  │    EMPLOYEE     │
└─────────────────┘  └─────────────────┘
```

### Permission Matrix

| Module | Admin | CEO | HR | Manager | Employee |
|--------|-------|-----|-------|---------|----------|
| **Employee Management** |
| View All Employees | ✅ | ✅ | ✅ | Team Only | Self Only |
| Create Employee | ✅ | ❌ | ✅ | ❌ | ❌ |
| Update Employee | ✅ | ❌ | ✅ | ❌ | Self Only |
| Delete Employee | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Attendance** |
| View Attendance | ✅ | ✅ | ✅ | Team Only | Self Only |
| Mark Attendance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit Attendance | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Leave Management** |
| Apply Leave | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve/Reject Leave | ✅ | ✅ | ✅ | Team Only | ❌ |
| View Leave History | ✅ | ✅ | ✅ | Team Only | Self Only |
| **Recruitment** |
| Post Jobs | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Applicants | ✅ | ✅ | ✅ | Dept. Only | ❌ |
| Schedule Interviews | ✅ | ❌ | ✅ | Dept. Only | ❌ |
| Create Offers | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Performance** |
| Create Reviews | ✅ | ✅ | ✅ | Team Only | ❌ |
| View Reviews | ✅ | ✅ | ✅ | Team Only | Self Only |
| Manage Appraisals | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Policies** |
| Create/Edit Policies | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Policies | ✅ | ✅ | ✅ | ✅ | ✅ |
| Acknowledge Policies | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Communication** |
| Create Notices | ✅ | ✅ | ✅ | ❌ | ❌ |
| View Notices | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Complaints | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resolve Complaints | ✅ | ❌ | ✅ | ❌ | ❌ |

---

## 🔄 Workflows

### 1. Employee Onboarding Workflow

```
┌──────────────────┐
│  Job Offer       │
│  Accepted        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Create Employee  │
│  Record in       │
│  System          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Generate         │
│ Employee ID      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Upload Documents │
│ - ID Proof       │
│ - Education      │
│ - Bank Details   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Assign           │
│ - Department     │
│ - Designation    │
│ - Manager        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Biometric        │
│ Enrollment       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Policy           │
│ Acknowledgment   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send Welcome     │
│ Email with       │
│ Credentials      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Onboarding       │
│ Complete ✓       │
└──────────────────┘
```

### 2. Leave Approval Workflow

```
┌──────────────────┐
│ Employee         │
│ Submits Leave    │
│ Application      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Check Leave      │
│ Balance          │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Sufficient  Insufficient
    │         │
    │         └─────────► Reject ❌
    │
    ▼
┌──────────────────┐
│ Notify Manager   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Manager Review   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Approve   Reject
    │         │
    │         └─────────► Notify Employee ❌
    │
    ▼
┌──────────────────┐
│ HR Review        │
│ (if required)    │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Approve   Reject
    │         │
    │         └─────────► Notify Employee ❌
    │
    ▼
┌──────────────────┐
│ Deduct from      │
│ Leave Balance    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Notify Employee  │
│ Approved ✓       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Update Calendar  │
└──────────────────┘
```

### 3. Recruitment Workflow

```
┌──────────────────┐
│ Create Job       │
│ Posting          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Publish Job      │
│ (Internal/       │
│  External)       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Receive          │
│ Applications     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Screen           │
│ Applicants       │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Shortlist  Reject
    │         │
    │         └─────────► Send Rejection Email
    │
    ▼
┌──────────────────┐
│ Schedule         │
│ Interviews       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Conduct          │
│ Interviews       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Panel Feedback   │
│ & Rating         │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Select    Reject
    │         │
    │         └─────────► Send Regret Email
    │
    ▼
┌──────────────────┐
│ Generate Offer   │
│ Letter           │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Send Offer       │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 Accepted  Rejected
    │         │
    │         └─────────► Close Position
    │
    ▼
┌──────────────────┐
│ Start            │
│ Onboarding ✓     │
└──────────────────┘
```

### 4. Performance Appraisal Workflow

```
┌──────────────────┐
│ Create Appraisal │
│ Cycle            │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Notify Employees │
│ & Managers       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Employee Self    │
│ Assessment       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Manager Review   │
│ & Rating         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ HR Review        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ One-on-One       │
│ Discussion       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Finalize Rating  │
│ & Feedback       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Determine        │
│ - Increment      │
│ - Promotion      │
│ - Bonus          │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ CEO/Management   │
│ Approval         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Communicate      │
│ Results to       │
│ Employee         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Update Records   │
│ Complete ✓       │
└──────────────────┘
```

---

## 🔗 Integration Points

### 1. Email Integration
```
┌──────────────────────────┐
│  Email Service (SMTP)    │
│  - Nodemailer            │
│  - SendGrid / AWS SES    │
└────────┬─────────────────┘
         │
         ├─► Leave Notifications
         ├─► Offer Letters
         ├─► Interview Schedules
         ├─► Policy Updates
         └─► General Announcements
```

### 2. Biometric Integration
```
┌──────────────────────────┐
│  Biometric Devices       │
│  - Fingerprint Scanner   │
│  - Face Recognition      │
└────────┬─────────────────┘
         │
         └─► Attendance System
             - Clock In/Out
             - Real-time Sync
```

### 3. Calendar Integration
```
┌──────────────────────────┐
│  Calendar Services       │
│  - Google Calendar       │
│  - Outlook Calendar      │
└────────┬─────────────────┘
         │
         ├─► Interview Scheduling
         ├─► Leave Calendar
         └─► Event Management
```

### 4. Document Storage
```
┌──────────────────────────┐
│  Cloud Storage           │
│  - AWS S3                │
│  - Google Cloud Storage  │
│  - Azure Blob            │
└────────┬─────────────────┘
         │
         ├─► Employee Documents
         ├─► Resumes
         ├─► Offer Letters
         └─► Policy Documents
```

### 5. Payment Gateway (Future)
```
┌──────────────────────────┐
│  Payroll Integration     │
│  - Salary Processing     │
│  - Tax Calculations      │
└──────────────────────────┘
```

---

## 📊 Key Features Summary

### Dashboard Analytics
- **Real-time KPIs**: Total employees, pending leaves, applicants, complaints
- **Attendance Overview**: Today's attendance, late arrivals
- **Leave Balance**: Department-wise leave statistics
- **Recruitment Pipeline**: Active jobs, applicants in pipeline
- **Performance Metrics**: Reviews pending, appraisal cycles

### Reporting Capabilities
- Attendance Reports (Daily/Weekly/Monthly)
- Leave Balance Reports
- Recruitment Analytics
- Performance Review Reports
- Compliance Reports
- Custom Report Builder

### Notifications & Alerts
- Leave approvals/rejections
- Interview schedules
- Policy updates
- Birthday/anniversary reminders
- Document expiry alerts
- Performance review reminders

---

## 🛠️ Technical Implementation

### API Structure
```
backend/
├── routes/
│   └── dept/
│       └── hr.routes.js          # All HR routes
├── controllers/
│   └── dept/
│       └── hr.controller.js      # Business logic
├── models/                        # Database schemas
│   ├── User.js
│   ├── Attendance.js
│   ├── Leave.js
│   ├── Applicant.js
│   ├── Performance.js
│   └── ... (all models)
├── middleware/
│   └── auth.js                   # JWT & RBAC
└── config/
    ├── db.js                     # Database config
    └── roles.js                  # Role definitions
```

### Frontend Structure
```
frontend/src/
├── components/
│   ├── hr/                       # HR components
│   │   ├── HRDashboard.jsx
│   │   ├── HRPortal.jsx
│   │   ├── HRSidebar.jsx
│   │   ├── EmployeeDirectory.jsx
│   │   ├── Attendance.jsx
│   │   ├── LeaveManagement.jsx
│   │   ├── ApplicantTracking.jsx
│   │   ├── Performance.jsx
│   │   ├── Notices.jsx
│   │   ├── ComplaintSolutions.jsx
│   │   └── StaffWorkReport.jsx
│   └── common/                   # Shared components
│       ├── PortalHeader.jsx
│       ├── KPICard.jsx
│       ├── StatsCard.jsx
│       └── Button.jsx
├── api/
│   ├── client.js                 # API client
│   └── hr.js                     # HR API methods
├── context/
│   └── AuthContext.js            # Auth state
└── routes/
    └── index.jsx                 # Route definitions
```

---

## 🚀 Future Enhancements

### Phase 1 (Short-term)
- [ ] Payroll Integration
- [ ] Mobile App (React Native)
- [ ] Advanced Analytics Dashboard
- [ ] AI-powered Resume Screening
- [ ] Chatbot for HR Queries

### Phase 2 (Medium-term)
- [ ] Learning Management System (LMS)
- [ ] Talent Management
- [ ] Succession Planning
- [ ] Employee Engagement Surveys
- [ ] Expense Management

### Phase 3 (Long-term)
- [ ] Predictive Analytics
- [ ] AI-based Performance Insights
- [ ] Blockchain for Document Verification
- [ ] Integration with ERP Systems
- [ ] Multi-language Support

---

## 📱 Responsive Design
All components are fully responsive:
- Desktop (1920px+)
- Laptop (1366px - 1919px)
- Tablet (768px - 1365px)
- Mobile (320px - 767px)

---

## 🔒 Security Measures
- JWT-based Authentication
- Role-based Access Control (RBAC)
- Password Hashing (bcrypt)
- SQL Injection Prevention
- XSS Protection
- CORS Configuration
- Rate Limiting
- API Request Validation
- Secure File Upload
- Audit Logging

---

## 📝 Conclusion

This HR Management System provides a comprehensive solution for managing all aspects of human resources, from recruitment to retirement. The modular architecture ensures scalability, maintainability, and ease of integration with other systems.

### System Highlights
✅ Complete Employee Lifecycle Management
✅ Real-time Attendance & Leave Tracking
✅ End-to-end Recruitment Pipeline
✅ Performance Management & Appraisals
✅ Policy & Compliance Management
✅ Communication & Reporting Tools
✅ Modern, Responsive UI
✅ Secure & Scalable Architecture
✅ RESTful API with 90+ Endpoints
✅ Role-based Access Control

---

**Document Version**: 1.0
**Last Updated**: December 2024
**Maintained By**: HR System Development Team
