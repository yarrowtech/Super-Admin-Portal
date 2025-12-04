import React, { useState } from 'react';

const reportStats = [
  { label: 'Total Reports', value: '156', change: '+12 this week', color: 'text-blue-600' },
  { label: 'Pending Reviews', value: '23', change: '8 overdue', color: 'text-orange-600' },
  { label: 'Approved Reports', value: '128', change: '+15 this week', color: 'text-green-600' },
  { label: 'Average Rating', value: '4.1', change: '+0.2 this month', color: 'text-green-600' },
];

const workReports = [
  {
    id: 'WR-001',
    employee: {
      name: 'Srijon Sarkar',
      email: 'srijon@example.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXFB_wAz4uwhnoixDRIfgdgpqG5pUz-wRe8C8rzyI8lYrTvw6ycC69cmtK9uEck81FmcuTfYzkCtOj_jcTZYACJwJ3r-QBPTW9qDn9cfgtF6n4j42zWXAV5bHaFKI3uZjR3tWpEkrdV16tZoKTRxyaRDRgEXNPK2Xie-1Ws29oLXaSXBC_S0LDCGgjnrzRA5J9sX-7t2Gj70WILNvEmGPMd3COyRnEpBc0JsZO_SWTHZcCNG4SxkmxH32IJSSw06EJx2S32e6CKRtO',
      position: 'Senior UX Designer'
    },
    project: 'Mobile App Redesign',
    hoursWorked: 42,
    tasks: 8,
    completedTasks: 7,
    productivity: 88,
    submissionDate: '2024-12-01',
    status: 'approved',
    rating: 4.5,
    comments: 'Excellent progress on mobile redesign project.'
  },
  {
    id: 'WR-002',
    employee: {
      name: 'Sangeet Chowdhury',
      email: 'sangeet@example.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7ggBVBbVv4fKoPPQBTUOad6ctqoY5c-6Y8-yowlseO93ReQHb5X1fVZ4ZGuCBSz4evBIjA8FihyRsxypJUkXqqle8l7piZpciMB0gAnigSCWdSIKvokD0aJse_O2S4YxCCatD1Ulb41mN_PxuCOrjogV03UOrtbQ8Wz59ayW2fr5JiRs48DKf2MCNNZO7p7dQS6GInrMuRrOdty7OLIC3VcK5LYrOa034JQW9upSnBCwNZd22WsxO9Uyyp1hbyOhCF9v90tuqflet',
      position: 'Product Manager'
    },
    project: 'Feature Planning Q1',
    hoursWorked: 38,
    tasks: 12,
    completedTasks: 10,
    productivity: 83,
    submissionDate: '2024-11-30',
    status: 'pending',
    rating: null,
    comments: 'Awaiting review from senior management.'
  },
  {
    id: 'WR-003',
    employee: {
      name: 'Raktim Maity',
      email: 'raktim@example.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIhaWVE9cMd0eeLxgk7i5fBc0oiS2c8GlUiMSwnlxbXdhIZjolamvIpNtqkENaYfIUQyaTCnJOtbQprCVcR1v6iYe8_qKfqUCnu9K8GZK21W35pAk-Dj8_KYaMkX7yd0a7eaBSd8HgXv1rICjPxstAiVv3nF-HwuISPx-S4mBIsBL6ICvuY6FqZEyHTy75Z4jskhVHk4Xd65w1LW28CouuK6FGK9M11eFbJIOi8fA4TUIbiXPL_9RSxj_maduZTOw9fbbfrSXCnOnw',
      position: 'Frontend Developer'
    },
    project: 'Dashboard Components',
    hoursWorked: 40,
    tasks: 6,
    completedTasks: 6,
    productivity: 100,
    submissionDate: '2024-11-29',
    status: 'approved',
    rating: 4.8,
    comments: 'Outstanding work on component library.'
  },
  {
    id: 'WR-004',
    employee: {
      name: 'Anshika Pathak',
      email: 'anshika@example.com',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5VeYsvEe-nOMcwCTzlmyBdBEsHB6mmaFuJOOOuAqQgr7l-7otfN2HYGtxqWSgrjpAsgcGYW0gwWavh_MGhzqPQh04b-uW7I2y4PQga8UyPomehFIWyPQWKRmhrfvS8ShxEcfGxED96UI-TjsanQKlVSomoZOg2SPLXQoS2torrsHJTovNY3S_cgoxgjgW7veCZLcGRj19rJc2JYLLaUBXrmOop9-V1XENbVQEvHygpBqQikV91yz0lP7fhfDg7LQs7YfK2vLNrj0m',
      position: 'Marketing Lead'
    },
    project: 'Campaign Analytics',
    hoursWorked: 35,
    tasks: 9,
    completedTasks: 6,
    productivity: 67,
    submissionDate: '2024-11-28',
    status: 'revision-requested',
    rating: 3.2,
    comments: 'Needs improvement in task completion rate.'
  },
];

const StaffWorkReport = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'revision-requested':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getProductivityColor = (productivity) => {
    if (productivity >= 85) return 'text-green-600 dark:text-green-400';
    if (productivity >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRatingStars = (rating) => {
    if (!rating) return <span className="text-sm text-neutral-400">Not rated</span>;
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`material-symbols-outlined text-sm ${
            i <= rating ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'
          }`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      );
    }
    return <div className="flex items-center gap-1">{stars}<span className="ml-1 text-sm">{rating}</span></div>;
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Staff Work Report
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Track and review employee work reports, productivity, and project progress.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold leading-normal tracking-[0.015em] text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              <span className="truncate">Export Reports</span>
            </button>
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">add</span>
              <span className="truncate">Create Report</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {reportStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{stat.value}</p>
              <p className={`text-sm font-semibold ${stat.color}`}>{stat.change}</p>
            </div>
          ))}
        </section>

        <section className="mt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                search
              </span>
              <input
                className="w-full rounded-lg border-neutral-200 bg-background-light py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                placeholder="Search reports..."
                type="search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="revision-requested">Revision Requested</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <button className="flex h-9 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold leading-normal tracking-[0.015em] text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-base">filter_list</span>
                <span className="truncate">Filter</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Report ID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Project</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Hours</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Tasks</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Productivity</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Rating</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workReports.map((report, index) => (
                  <tr key={report.id} className={index !== workReports.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}>
                    <td className="p-4 text-sm font-medium text-primary">{report.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={report.employee.avatar} alt={report.employee.name} className="h-10 w-10 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{report.employee.name}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{report.employee.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{report.project}</td>
                    <td className="p-4 text-sm text-neutral-800 dark:text-neutral-100 font-medium">{report.hoursWorked}h</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-800 dark:text-neutral-100 font-medium">{report.completedTasks}/{report.tasks}</span>
                        <div className="h-2 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div 
                            className="h-full rounded-full bg-primary" 
                            style={{ width: `${(report.completedTasks / report.tasks) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-sm font-semibold ${getProductivityColor(report.productivity)}`}>
                        {report.productivity}%
                      </span>
                    </td>
                    <td className="p-4">{getRatingStars(report.rating)}</td>
                    <td className="p-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(report.status)}`}>
                        {report.status === 'approved' && 'Approved'}
                        {report.status === 'pending' && 'Pending'}
                        {report.status === 'revision-requested' && 'Revision Requested'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button className="text-primary hover:text-primary/80">
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </button>
                        <button className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100">
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300">
                          <span className="material-symbols-outlined text-xl">check_circle</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Showing 1-4 of 156 reports</p>
              <div className="flex items-center gap-2">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary bg-primary/10 text-primary">1</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">2</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">3</button>
                <span className="text-neutral-600 dark:text-neutral-400">...</span>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">39</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StaffWorkReport;