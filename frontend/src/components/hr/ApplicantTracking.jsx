import React from 'react';

const applicants = [
  {
    name: 'Srijon Sarkar',
    role: 'Senior UX Designer',
    date: 'Jan 15, 2025',
    status: 'Interview',
    badgeClass:
      'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  },
  {
    name: 'Sangeet Chouwdhury',
    role: 'Product Manager',
    date: 'Jan 12, 2024',
    status: 'Screening',
    badgeClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  },
  {
    name: 'Koushik Bala',
    role: 'Team Lead',
    date: 'Jan 10, 2025',
    status: 'Hired',
    badgeClass: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  },
  {
    name: 'Santu Paramanik',
    role: 'Backend Developer',
    date: 'Jan 09, 2025',
    status: 'Applied',
    badgeClass: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  },
  {
    name: 'Anshika Pathak',
    role: 'Marketing Lead',
    date: 'Jan 08, 2024',
    status: 'Hired',
    badgeClass: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  },
  {
    name: 'Boby Peter Mondal',
    role: 'Machine Learning Engineer',
    date: 'Jan 08, 2024',
    status: 'Hired',
    badgeClass: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  },
];

const ApplicantTracking = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-72 flex-col gap-2">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Applicant Tracking
            </p>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Manage job applications, view profiles, and track progress.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined text-base">add</span>
              <span className="truncate">Add Applicant</span>
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800/50">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
              search
            </span>
            <input
              type="search"
              placeholder="Search applicants..."
              className="w-full rounded-lg border-neutral-200 bg-background-light py-2 pl-10 pr-4 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                defaultValue="all-positions"
                className="w-full appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark sm:w-auto"
              >
                <option value="all-positions">All Positions</option>
                <option value="ux">Senior UX Designer</option>
                <option value="pm">Product Manager</option>
                <option value="fe">Frontend Developer</option>
                <option value="marketing">Marketing Lead</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                expand_more
              </span>
            </div>
            <div className="relative">
              <select
                defaultValue="all-statuses"
                className="w-full appearance-none rounded-lg border-neutral-200 bg-background-light py-2 pl-3 pr-8 text-sm focus:border-primary focus:ring-primary dark:border-neutral-800 dark:bg-background-dark sm:w-auto"
              >
                <option value="all-statuses">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                expand_more
              </span>
            </div>
            <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
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
                    type="checkbox"
                    className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700"
                  />
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Applicant Name
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Position
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Application Date
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Status
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant) => (
                <tr key={applicant.name} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700"
                    />
                  </td>
                  <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {applicant.name}
                  </td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{applicant.role}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{applicant.date}</td>
                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${applicant.badgeClass}`}
                    >
                      {applicant.status}
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
                      <button className="text-danger hover:text-danger/80">
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-4 p-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Showing 1-5 of 125 applicants</p>
            <div className="flex items-center gap-2">
              <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-base">chevron_left</span>
              </button>
              <button className="flex size-8 items-center justify-center rounded-lg border border-primary bg-primary/10 text-primary">
                1
              </button>
              <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                2
              </button>
              <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                3
              </button>
              <span className="text-neutral-600 dark:text-neutral-400">...</span>
              <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                25
              </button>
              <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ApplicantTracking;
