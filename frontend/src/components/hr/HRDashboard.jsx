import React from 'react';

const HRDashboard = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        {/* PageHeading */}
        <div className="flex flex-wrap justify-between gap-3 pb-6">
          <div className="flex min-w-72 flex-col gap-3">
            <p className="text-neutral-800 dark:text-neutral-100 text-4xl font-black leading-tight tracking-[-0.033em]">
              HR Dashboard
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 text-base font-normal leading-normal">
              Welcome back, here is an overview of the HR department's
              activities.
            </p>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Pending Leave Requests
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              12
            </p>
            <p className="text-success text-base font-medium leading-normal">
              +5%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              New Applicants
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              28
            </p>
            <p className="text-success text-base font-medium leading-normal">
              +12%
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Upcoming Holidays
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              3
            </p>
            <p className="text-neutral-600 dark:text-neutral-400 text-base font-medium leading-normal">
              No change
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 p-6 border border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Active Employees
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-3xl font-bold leading-tight">
              1,240
            </p>
            <p className="text-danger text-base font-medium leading-normal">
              -1%
            </p>
          </div>
        </div>
        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 p-6">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              New Hires by Department
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-[32px] font-bold leading-tight truncate">
              18 Hires
            </p>
            <div className="flex gap-1">
              <p className="text-neutral-600 dark:text-neutral-400 text-base font-normal leading-normal">
                This Quarter
              </p>
              <p className="text-success text-base font-medium leading-normal">
                +8%
              </p>
            </div>
            <div className="grid min-h-[180px] grid-flow-col gap-6 grid-rows-[1fr_auto] items-end justify-items-center px-3 pt-4">
              <div
                className="bg-primary/20 dark:bg-primary/40 w-full rounded-t"
                style={{ height: '25%' }}
              ></div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                Eng
              </p>
              <div
                className="bg-primary/20 dark:bg-primary/40 w-full rounded-t"
                style={{ height: '70%' }}
              ></div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                Design
              </p>
              <div
                className="bg-primary w-full rounded-t"
                style={{ height: '80%' }}
              ></div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                Sales
              </p>
              <div
                className="bg-primary/20 dark:bg-primary/40 w-full rounded-t"
                style={{ height: '40%' }}
              ></div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                Mktg
              </p>
              <div
                className="bg-primary/20 dark:bg-primary/40 w-full rounded-t"
                style={{ height: '15%' }}
              ></div>
              <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                Ops
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 p-6">
            <p className="text-neutral-800 dark:text-neutral-100 text-base font-medium leading-normal">
              Application Trends
            </p>
            <p className="text-neutral-800 dark:text-neutral-100 tracking-light text-[32px] font-bold leading-tight truncate">
              152 Applicants
            </p>
            <div className="flex gap-1">
              <p className="text-neutral-600 dark:text-neutral-400 text-base font-normal leading-normal">
                Last 30 Days
              </p>
              <p className="text-danger text-base font-medium leading-normal">
                -5%
              </p>
            </div>
            <div className="flex min-h-[180px] flex-1 flex-col gap-8 py-4">
              <svg
                fill="none"
                height="148"
                preserveAspectRatio="none"
                viewBox="-3 0 478 150"
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25V149H326.769H0V109Z"
                  fill="url(#paint0_linear_1131_5935_light)"
                ></path>
                <path
                  className="dark:hidden"
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="#135bec"
                  strokeLinecap="round"
                  strokeWidth="3"
                ></path>
                <path
                  className="hidden dark:block"
                  d="M0 109C18.1538 109 18.1538 21 36.3077 21C54.4615 21 54.4615 41 72.6154 41C90.7692 41 90.7692 93 108.923 93C127.077 93 127.077 33 145.231 33C163.385 33 163.385 101 181.538 101C199.692 101 199.692 61 217.846 61C236 61 236 45 254.154 45C272.308 45 272.308 121 290.462 121C308.615 121 308.615 149 326.769 149C344.923 149 344.923 1 363.077 1C381.231 1 381.231 81 399.385 81C417.538 81 417.538 129 435.692 129C453.846 129 453.846 25 472 25"
                  stroke="#135bec"
                  strokeLinecap="round"
                  strokeWidth="3"
                ></path>
                <defs>
                  <linearGradient
                    gradientUnits="userSpaceOnUse"
                    id="paint0_linear_1131_5935_light"
                    x1="236"
                    x2="236"
                    y1="1"
                    y2="149"
                  >
                    <stop stopColor="#135bec" stopOpacity="0.2"></stop>
                    <stop
                      offset="1"
                      stopColor="#135bec"
                      stopOpacity="0"
                    ></stop>
                  </linearGradient>
                </defs>
              </svg>
              <div className="flex justify-around">
                <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                  W1
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                  W2
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                  W3
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-[13px] font-bold leading-normal tracking-[0.015em]">
                  W4
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* SectionHeader */}
        <h2 className="text-neutral-800 dark:text-neutral-100 text-[22px] font-bold leading-tight tracking-[-0.015em] pb-3 pt-8">
          Applicant Tracking
        </h2>
        {/* Applicant Tracking Table */}
        <div className="overflow-x-auto rounded-xl bg-white dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
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
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  Olivia Rhye
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Senior UX Designer
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Jan 15, 2024
                </td>
                <td className="p-4">
                  <span className="inline-block rounded-full bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                    Interview
                  </span>
                </td>
                <td className="p-4 text-sm text-primary font-semibold">
                  <a className="hover:underline" href="#">
                    View Profile
                  </a>
                </td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  Phoenix Baker
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Product Manager
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Jan 12, 2024
                </td>
                <td className="p-4">
                  <span className="inline-block rounded-full bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-200">
                    Screening
                  </span>
                </td>
                <td className="p-4 text-sm text-primary font-semibold">
                  <a className="hover:underline" href="#">
                    View Profile
                  </a>
                </td>
              </tr>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  Lana Steiner
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Frontend Developer
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Jan 10, 2024
                </td>
                <td className="p-4">
                  <span className="inline-block rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-semibold text-green-800 dark:text-green-200">
                    Hired
                  </span>
                </td>
                <td className="p-4 text-sm text-primary font-semibold">
                  <a className="hover:underline" href="#">
                    View Profile
                  </a>
                </td>
              </tr>
              <tr>
                <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  Candice Wu
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Marketing Lead
                </td>
                <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">
                  Jan 08, 2024
                </td>
                <td className="p-4">
                  <span className="inline-block rounded-full bg-red-100 dark:bg-red-900/50 px-2 py-0.5 text-xs font-semibold text-red-800 dark:text-red-200">
                    Rejected
                  </span>
                </td>
                <td className="p-4 text-sm text-primary font-semibold">
                  <a className="hover:underline" href="#">
                    View Profile
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default HRDashboard;
