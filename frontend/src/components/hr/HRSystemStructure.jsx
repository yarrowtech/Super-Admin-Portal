import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../api/hr';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const sections = [
  {
    id: 'employee-management',
    title: 'Employee Management',
    icon: 'manage_accounts',
    description: 'Manage employee lifecycle, documents, and org mapping.',
    items: [
      { label: 'Add New Employee', path: '/hr/modules/employee-records' },
      { label: 'Edit Employee Profile', path: '/hr/modules/employee-records' },
      { label: 'Deactivate/Exit Employee', path: '/hr/modules/employee-records' },
      { label: 'Employee Documents', path: '/hr/modules/employee-documents' },
      { label: 'Employee ID/Bio Enrollment', path: '/hr/modules/biometrics' },
      { label: 'Department Mapping', path: '/hr/modules/departments' },
      { label: 'Designation Mapping', path: '/hr/modules/designations' }
    ]
  },
  {
    id: 'attendance-management',
    title: 'Attendance Management',
    icon: 'calendar_month',
    description: 'Track attendance, shifts, and corrections.',
    items: [
      { label: 'Daily Attendance View', path: '/hr/modules/attendance' },
      { label: 'Late/Early Leave Tracking', path: '/hr/modules/attendance' },
      { label: 'Shift-wise Attendance', path: '/hr/modules/attendance' },
      { label: 'Attendance Correction', path: '/hr/modules/attendance' },
      { label: 'Attendance Reports', path: '/hr/modules/attendance' }
    ]
  },
  {
    id: 'leave-management',
    title: 'Leave Management',
    icon: 'hourglass_empty',
    description: 'Configure policies and review leave requests.',
    items: [
      { label: 'Leave Policy Configuration', path: '/hr/modules/leave-policies' },
      { label: 'Leave Request Overview', path: '/hr/modules/leave-requests' },
      { label: 'Approve/Reject Leave', path: '/hr/modules/leave-requests' },
      { label: 'Holiday Calendar', path: '/hr/modules/holidays' }
    ]
  },
  {
    id: 'recruitment-hiring',
    title: 'Recruitment and Hiring',
    icon: 'work',
    description: 'Run hiring pipelines and offers.',
    items: [
      { label: 'Job Posting', path: '/hr/modules/jobs' },
      { label: 'Applicant Tracking', path: '/hr/modules/applicants' },
      { label: 'Interview Scheduling', path: '/hr/modules/interviews' },
      { label: 'Selection & Offer Making', path: '/hr/modules/offers' },
      { label: 'Hiring Status Reports', path: '/hr/modules/jobs' }
    ]
  },
  {
    id: 'performance-appraisal',
    title: 'Performance and Appraisal',
    icon: 'trending_up',
    description: 'Collect performance data and manage appraisals.',
    items: [
      { label: 'Appraisal Cycle Tracking', path: '/hr/modules/appraisal-cycles' },
      { label: 'Performance Data Collection', path: '/hr/modules/performance' },
      { label: 'Feedback Forms', path: '/hr/modules/appraisals' },
      { label: 'Appraisal Reports (Gen/Ext)', path: '/hr/modules/appraisals' }
    ]
  },
  {
    id: 'policy-compliance',
    title: 'Policy, Compliance and Documentation',
    icon: 'gavel',
    description: 'Publish policies and track acknowledgements.',
    items: [
      { label: 'HR Policies', path: '/hr/modules/policies' },
      { label: 'Employee Handbook', path: '/hr/modules/policies' },
      { label: 'Policy Acknowledgement Tracking', path: '/hr/modules/policy-acknowledgements' },
      { label: 'Compliance Reports', path: '/hr/modules/policy-acknowledgements' }
    ]
  },
  {
    id: 'employee-communication',
    title: 'Employee Communication & Reports',
    icon: 'campaign',
    description: 'Handle announcements, queries, and exits.',
    items: [
      { label: 'HR Announcement', path: '/hr/modules/notices' },
      { label: 'Employee Queries and Tickets', path: '/hr/modules/support-tickets' },
      { label: 'Grievance Management', path: '/hr/modules/complaints' },
      { label: 'Exit Interviews', path: '/hr/modules/exit-interviews' }
    ]
  }
];

const HRSystemStructure = () => {
  const location = useLocation();
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace('#', '');
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await hrApi.getDashboard(token);
        setDashboardData(response.data);
      } catch (err) {
        setError(err.message || 'Failed to load HR summary');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  const totalEmployees = dashboardData?.totalEmployees || 0;
  const activeEmployees = dashboardData?.activeEmployees || 0;
  const pendingApplicants = dashboardData?.pendingApplicants || 0;
  const pendingLeaves = dashboardData?.pendingLeaves || 0;
  const openComplaints = dashboardData?.openComplaints || 0;
  const todayAttendance = dashboardData?.todayAttendance || 0;

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="dot-spinner">
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading HR system...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Summary</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-neutral-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6">
        <PortalHeader
          title="HR System Structure"
          subtitle="A complete view of HR operations with direct access to each module."
          user={user}
          icon="hub"
          showSearch={false}
          showNotifications={true}
          showThemeToggle={true}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard title="Total Employees" value={totalEmployees} icon="badge" colorScheme="blue" subtitle="HEADCOUNT" />
          <KPICard title="Active Employees" value={activeEmployees} icon="verified_user" colorScheme="green" subtitle="ACTIVE" />
          <KPICard title="Pending Applicants" value={pendingApplicants} icon="assignment" colorScheme="orange" subtitle="PIPELINE" />
          <KPICard title="Pending Leaves" value={pendingLeaves} icon="event_busy" colorScheme="purple" subtitle="LEAVE" />
          <KPICard title="Today Attendance" value={todayAttendance} icon="calendar_today" colorScheme="indigo" subtitle="CHECKED IN" />
          <KPICard title="Open Complaints" value={openComplaints} icon="report_problem" colorScheme="red" subtitle="OPEN" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-800/50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                    <span className="material-symbols-outlined">{section.icon}</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{section.title}</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{section.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <NavLink
                      key={item.label}
                      to={item.path}
                      className="rounded-full border border-neutral-200 px-3 py-1 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-white/10"
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <aside className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Insights</h3>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Weekly</span>
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Workforce Health</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {activeEmployees} active employees out of {totalEmployees} total.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Hiring Pipeline</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {pendingApplicants} applicants in review. Focus on scheduling interviews.
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900/60">
                <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Compliance</p>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
                  {openComplaints} open complaints need follow-up.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default HRSystemStructure;
