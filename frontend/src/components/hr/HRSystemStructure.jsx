import React, { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const sections = [
  {
    id: 'employee-management',
    title: 'Employee Management',
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

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace('#', '');
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-black text-neutral-800 dark:text-neutral-100">HR System Structure</h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            All core HR modules and quick links to manage workflows.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{section.title}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
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
      </div>
    </main>
  );
};

export default HRSystemStructure;
