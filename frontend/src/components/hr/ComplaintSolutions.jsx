import React, { useState } from 'react';

const complaintStats = [
  { label: 'Open Complaints', value: '18', change: '+3 this week', color: 'text-orange-600' },
  { label: 'Resolved This Month', value: '45', change: '+12% from last month', color: 'text-green-600' },
  { label: 'Average Resolution Time', value: '4.2 days', change: '-0.8 days improvement', color: 'text-green-600' },
  { label: 'Satisfaction Rating', value: '4.3/5', change: '+0.2 this quarter', color: 'text-green-600' },
];

const complaints = [
  {
    id: 'CMP-001',
    complainant: {
      name: 'Anonymous Employee',
      department: 'Engineering',
      avatar: null
    },
    category: 'workplace-harassment',
    title: 'Inappropriate workplace behavior',
    description: 'Report of inappropriate comments and behavior from team lead during meetings.',
    priority: 'high',
    status: 'investigating',
    assignedTo: 'Sarah Wilson',
    submissionDate: '2024-12-01',
    lastUpdate: '2024-12-02',
    resolution: null,
    satisfactionRating: null
  },
  {
    id: 'CMP-002',
    complainant: {
      name: 'Sangeet Chowdhury',
      department: 'Product',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7ggBVBbVv4fKoPPQBTUOad6ctqoY5c-6Y8-yowlseO93ReQHb5X1fVZ4ZGuCBSz4evBIjA8FihyRsxypJUkXqqle8l7piZpciMB0gAnigSCWdSIKvokD0aJse_O2S4YxCCatD1Ulb41mN_PxuCOrjogV03UOrtbQ8Wz59ayW2fr5JiRs48DKf2MCNNZO7p7dQS6GInrMuRrOdty7OLIC3VcK5LYrOa034JQW9upSnBCwNZd22WsxO9Uyyp1hbyOhCF9v90tuqflet'
    },
    category: 'work-environment',
    title: 'Excessive noise in workspace',
    description: 'Open office environment is too noisy, affecting productivity and concentration.',
    priority: 'medium',
    status: 'resolved',
    assignedTo: 'Michael Chen',
    submissionDate: '2024-11-25',
    lastUpdate: '2024-11-30',
    resolution: 'Installed noise dampening panels and created quiet zones.',
    satisfactionRating: 4.5
  },
  {
    id: 'CMP-003',
    complainant: {
      name: 'Raktim Maity',
      department: 'Engineering',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIhaWVE9cMd0eeLxgk7i5fBc0oiS2c8GlUiMSwnlxbXdhIZjolamvIpNtqkENaYfIUQyaTCnJOtboprCVcR1v6iYe8_qKfqUCnu9K8GZK21W35pAk-Dj8_KYaMkX7yd0a7eaBSd8HgXv1rICjPxstAiVv3nF-HwuISPx-S4mBIsBL6ICvuY6FqZEyHTy75Z4jskhVHk4Xd65w1LW28CouuK6FGK9M11eFbJIOi8fA4TUIbiXPL_9RSxj_maduZTOw9fbbfrSXCnOnw'
    },
    category: 'policy-violation',
    title: 'Unfair time-off policy application',
    description: 'Inconsistent application of time-off policies between departments.',
    priority: 'medium',
    status: 'pending-review',
    assignedTo: 'Emma Rodriguez',
    submissionDate: '2024-11-28',
    lastUpdate: '2024-11-29',
    resolution: null,
    satisfactionRating: null
  },
  {
    id: 'CMP-004',
    complainant: {
      name: 'Srijon Sarkar',
      department: 'Design',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXFB_wAz4uwhnoixDRIfgdgpqG5pUz-wRe8C8rzyI8lYrTvw6ycC69cmtK9uEck81FmcuTfYzkCtOj_jcTZYACJwJ3r-QBPTW9qDn9cfgtF6n4j42zWXAV5bHaFKI3uZjR3tWpEkrdV16tZoKTRxyaRDRgEXNPK2Xie-1Ws29oLXaSXBC_S0LDCGgjnrzRA5J9sX-7t2Gj70WILNvEmGPMd3COyRnEpBc0JsZO_SWTHZcCNG4SxkmxH32IJSSw06EJx2S32e6CKRtO'
    },
    category: 'discrimination',
    title: 'Gender pay gap concern',
    description: 'Suspected pay disparity compared to male colleagues in similar roles.',
    priority: 'high',
    status: 'resolved',
    assignedTo: 'David Kim',
    submissionDate: '2024-11-20',
    lastUpdate: '2024-11-27',
    resolution: 'Conducted salary audit and adjusted compensation packages to ensure equity.',
    satisfactionRating: 4.8
  },
  {
    id: 'CMP-005',
    complainant: {
      name: 'Swapnanil Dey',
      department: 'Customer Success',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCWZi0sN4gwPkTLwx9kEiH4xQ7bFTJdCTUj917rPSmyxIMPUZQ5LsFlfykc_y7Yg56_3cG8bvgiYmilz96ydrlHwwGhr2g8tJJXV6Gc7lDzlq9cnufWH6P0OJaOO6UkqYsKTFTaZIk8b5ZZRbOdQxvrGK70LLyC0M1jJVaCbrApNCGytGt0qn1Dso__D82KkgGQUoo_OdLmo-Vj7hklZA-SEjEDtfUKS63x2MvvrA9G-nXOswQjN89vy2F1C7JBzmxmntR5sDtbdRgK'
    },
    category: 'work-environment',
    title: 'Inadequate workspace equipment',
    description: 'Request for better ergonomic setup and updated hardware for remote work.',
    priority: 'low',
    status: 'pending-review',
    assignedTo: 'IT Support',
    submissionDate: '2024-11-26',
    lastUpdate: '2024-11-26',
    resolution: null,
    satisfactionRating: null
  },
];

const ComplaintSolutions = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'investigating':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'pending-review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'escalated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'workplace-harassment':
        return 'warning';
      case 'work-environment':
        return 'business';
      case 'policy-violation':
        return 'policy';
      case 'discrimination':
        return 'balance';
      default:
        return 'report';
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'workplace-harassment':
        return 'Workplace Harassment';
      case 'work-environment':
        return 'Work Environment';
      case 'policy-violation':
        return 'Policy Violation';
      case 'discrimination':
        return 'Discrimination';
      default:
        return 'Other';
    }
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
              Complaint & Solutions
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Manage employee complaints, track investigations, and implement solutions.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold leading-normal tracking-[0.015em] text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              <span className="truncate">Export Report</span>
            </button>
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">add</span>
              <span className="truncate">New Complaint</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {complaintStats.map((stat) => (
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
                placeholder="Search complaints..."
                type="search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Categories</option>
                  <option value="workplace-harassment">Workplace Harassment</option>
                  <option value="work-environment">Work Environment</option>
                  <option value="policy-violation">Policy Violation</option>
                  <option value="discrimination">Discrimination</option>
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
                  <option value="investigating">Investigating</option>
                  <option value="pending-review">Pending Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="escalated">Escalated</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">ID</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Complainant</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Category</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Title</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Priority</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Assigned To</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Rating</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint, index) => (
                  <tr key={complaint.id} className={index !== complaints.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}>
                    <td className="p-4 text-sm font-medium text-primary">{complaint.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {complaint.complainant.avatar ? (
                          <img src={complaint.complainant.avatar} alt={complaint.complainant.name} className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <span className="material-symbols-outlined text-sm text-neutral-600 dark:text-neutral-400">person</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{complaint.complainant.name}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{complaint.complainant.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-neutral-600 dark:text-neutral-400">
                          {getCategoryIcon(complaint.category)}
                        </span>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{getCategoryName(complaint.category)}</span>
                      </div>
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{complaint.title}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityColor(complaint.priority)}`}>
                        {complaint.priority.charAt(0).toUpperCase() + complaint.priority.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(complaint.status)}`}>
                        {complaint.status === 'investigating' && 'Investigating'}
                        {complaint.status === 'pending-review' && 'Pending Review'}
                        {complaint.status === 'resolved' && 'Resolved'}
                        {complaint.status === 'escalated' && 'Escalated'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{complaint.assignedTo}</td>
                    <td className="p-4">{getRatingStars(complaint.satisfactionRating)}</td>
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
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Showing 1-5 of 18 complaints</p>
              <div className="flex items-center gap-2">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                  <span className="material-symbols-outlined text-base">chevron_left</span>
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary bg-primary/10 text-primary">1</button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">2</button>
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

export default ComplaintSolutions;