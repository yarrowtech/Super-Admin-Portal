import React, { useState } from 'react';

const performanceStats = [
  { label: 'Average Rating', value: '4.2', change: '+0.3 this month', color: 'text-green-600' },
  { label: 'Reviews Completed', value: '87%', change: '12 pending', color: 'text-blue-600' },
  { label: 'Goals Achieved', value: '76%', change: '+8% vs last quarter', color: 'text-green-600' },
  { label: 'Training Completed', value: '92%', change: '3 overdue', color: 'text-orange-600' },
];

const employees = [
  {
    name: 'Srijon Sarkar',
    email: 'srijon@example.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXFB_wAz4uwhnoixDRIfgdgpqG5pUz-wRe8C8rzyI8lYrTvw6ycC69cmtK9uEck81FmcuTfYzkCtOj_jcTZYACJwJ3r-QBPTW9qDn9cfgtF6n4j42zWXAV5bHaFKI3uZjR3tWpEkrdV16tZoKTRxyaRDRgEXNPK2Xie-1Ws29oLXaSXBC_S0LDCGgjnrzRA5J9sX-7t2Gj70WILNvEmGPMd3COyRnEpBc0JsZO_SWTHZcCNG4SxkmxH32IJSSw06EJx2S32e6CKRtO',
    position: 'Senior UX Designer',
    department: 'Design',
    rating: 4.8,
    goals: '8/10',
    lastReview: 'Nov 2024',
    status: 'excellent',
  },
  {
    name: 'Sangeet Chowdhury',
    email: 'sangeet@example.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7ggBVBbVv4fKoPPQBTUOad6ctqoY5c-6Y8-yowlseO93ReQHb5X1fVZ4ZGuCBSz4evBIjA8FihyRsxypJUkXqqle8l7piZpciMB0gAnigSCWdSIKvokD0aJse_O2S4YxCCatD1Ulb41mN_PxuCOrjogV03UOrtbQ8Wz59ayW2fr5JiRs48DKf2MCNNZO7p7dQS6GInrMuRrOdty7OLIC3VcK5LYrOa034JQW9upSnBCwNZd22WsxO9Uyyp1hbyOhCF9v90tuqflet',
    position: 'Product Manager',
    department: 'Product',
    rating: 4.5,
    goals: '7/9',
    lastReview: 'Oct 2024',
    status: 'good',
  },
  {
    name: 'Raktim Maity',
    email: 'raktim@example.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAIhaWVE9cMd0eeLxgk7i5fBc0oiS2c8GlUiMSwnlxbXdhIZjolamvIpNtqkENaYfIUQyaTCnJOtboprCVcR1v6iYe8_qKfqUCnu9K8GZK21W35pAk-Dj8_KYaMkX7yd0a7eaBSd8HgXv1rICjPxstAiVv3nF-HwuISPx-S4mBIsBL6ICvuY6FqZEyHTy75Z4jskhVHk4Xd65w1LW28CouuK6FGK9M11eFbJIOi8fA4TUIbiXPL_9RSxj_maduZTOw9fbbfrSXCnOnw',
    position: 'Frontend Developer',
    department: 'Engineering',
    rating: 4.2,
    goals: '6/8',
    lastReview: 'Nov 2024',
    status: 'good',
  },
  {
    name: 'Anshika Pathak',
    email: 'anshika@example.com',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC5VeYsvEe-nOMcwCTzlmyBdBEsHB6mmaFuJOOOuAqQgr7l-7otfN2HYGtxqWSgrjpAsgcGYW0gwWavh_MGhzqPQh04b-uW7I2y4PQga8UyPomehFIWyPQWKRmhrfvS8ShxEcfGxED96UI-TjsanQKlVSomoZOg2SPLXQoS2torrsHJTovNY3S_cgoxgjgW7veCZLcGRj19rJc2JYLLaUBXrmOop9-V1XENbVQEvHygpBqQikV91yz0lP7fhfDg7LQs7YfK2vLNrj0m',
    position: 'Marketing Lead',
    department: 'Marketing',
    rating: 3.8,
    goals: '5/8',
    lastReview: 'Sep 2024',
    status: 'needs-improvement',
  },
];

const Performance = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('quarter');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
      case 'needs-improvement':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRatingStars = (rating) => {
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
    return stars;
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Performance Management
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Track employee performance, reviews, and goal achievements.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold leading-normal tracking-[0.015em] text-neutral-800 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-base">download</span>
              <span className="truncate">Export Report</span>
            </button>
            <button className="flex h-10 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg bg-primary px-4 text-sm font-bold leading-normal tracking-[0.015em] text-white hover:bg-primary/90">
              <span className="material-symbols-outlined text-base">add</span>
              <span className="truncate">Schedule Review</span>
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {performanceStats.map((stat) => (
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
                placeholder="Search employees..."
                type="search"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="all">All Departments</option>
                  <option value="design">Design</option>
                  <option value="engineering">Engineering</option>
                  <option value="product">Product</option>
                  <option value="marketing">Marketing</option>
                </select>
                <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
                >
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
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
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                    <input
                      className="h-4 w-4 rounded border-neutral-300 bg-transparent text-primary focus:ring-primary/50 dark:border-neutral-700"
                      type="checkbox"
                    />
                  </th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Rating</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Goals Progress</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Last Review</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.email} className={index !== employees.length - 1 ? 'border-b border-neutral-200 dark:border-neutral-800' : ''}>
                    <td className="p-4">
                      <input
                        className="h-4 w-4 rounded border-neutral-300 bg-transparent text-primary focus:ring-primary/50 dark:border-neutral-700"
                        type="checkbox"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={employee.avatar} alt={employee.name} className="h-10 w-10 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{employee.name}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{employee.position}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-500">{employee.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        {getRatingStars(Math.floor(employee.rating))}
                        <span className="ml-1 text-sm font-medium text-neutral-800 dark:text-neutral-100">{employee.rating}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div 
                            className="h-full rounded-full bg-primary" 
                            style={{ width: `${(parseInt(employee.goals.split('/')[0]) / parseInt(employee.goals.split('/')[1])) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{employee.goals}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.lastReview}</td>
                    <td className="p-4">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${getStatusColor(employee.status)}`}>
                        {employee.status === 'excellent' && 'Excellent'}
                        {employee.status === 'good' && 'Good'}
                        {employee.status === 'needs-improvement' && 'Needs Improvement'}
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
                        <button className="text-primary hover:text-primary/80">
                          <span className="material-symbols-outlined text-xl">rate_review</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Performance;