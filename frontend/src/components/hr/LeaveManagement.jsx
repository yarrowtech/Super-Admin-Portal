import React from 'react';

const calendarDays = [
  { label: '26', muted: true },
  { label: '27', muted: true },
  { label: '28', muted: true },
  { label: '29', muted: true },
  { label: '30', muted: true },
  { label: '31', muted: true },
  { label: '1' },
  { label: '2' },
  { label: '3' },
  { label: '4', pillClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200', bold: true },
  { label: '5' },
  { label: '6' },
  { label: '7' },
  { label: '8' },
  { label: '9' },
  { label: '10', pillClass: 'bg-primary text-white', bold: true },
  { label: '11' },
  { label: '12', pillClass: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200', bold: true },
  { label: '13' },
  { label: '14' },
  { label: '15' },
  { label: '16' },
  { label: '17' },
  { label: '18' },
  { label: '19' },
  { label: '20' },
  { label: '21' },
  { label: '22' },
  { label: '23' },
  { label: '24' },
  { label: '25' },
  { label: '26' },
  { label: '27', pillClass: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200', bold: true },
  { label: '28' },
  { label: '29' },
  { label: '30' },
  { label: '1', muted: true },
  { label: '2', muted: true },
  { label: '3', muted: true },
  { label: '4', muted: true },
  { label: '5', muted: true },
  { label: '6', muted: true },
];

const leaveLegend = [
  { label: 'Today', color: 'bg-primary' },
  { label: 'Approved Leave', color: 'bg-green-500' },
  { label: 'Pending Request', color: 'bg-yellow-500' },
  { label: 'Public Holiday', color: 'bg-blue-500' },
];

const leaveBalances = [
  { label: 'Vacation', summary: '14 / 20 days', percent: 70, bar: 'bg-primary' },
  { label: 'Sick Leave', summary: '3 / 10 days', percent: 30, bar: 'bg-yellow-500' },
  { label: 'Personal Leave', summary: '2 / 5 days', percent: 40, bar: 'bg-green-500' },
  { label: 'Unpaid Leave', summary: '1 day used', percent: 10, bar: 'bg-red-500' },
];

const leaveRequests = [
  {
    employee: 'Olivia Rhye',
    type: 'Vacation',
    dates: 'Jun 27, 2024 - Jun 28, 2024',
    days: '2',
    status: { label: 'Pending', className: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200' },
    actionButtons: true,
  },
  {
    employee: 'Phoenix Baker',
    type: 'Sick Leave',
    dates: 'Jun 12, 2024',
    days: '1',
    status: { label: 'Approved', className: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
  },
  {
    employee: 'Lana Steiner',
    type: 'Personal Leave',
    dates: 'Jun 20, 2024 - Jun 21, 2024',
    days: '2',
    status: { label: 'Approved', className: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
  },
  {
    employee: 'Candice Wu',
    type: 'Vacation',
    dates: 'May 15, 2024 - May 17, 2024',
    days: '3',
    status: { label: 'Rejected', className: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
  },
];

const LeaveManagement = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex min-w-72 flex-col gap-2">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Leave Management
            </p>
            <p className="text-base text-neutral-600 dark:text-neutral-400">
              Track, manage, and approve employee leave requests.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined">download</span>
              <span className="truncate">Export Report</span>
            </button>
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
              <span className="material-symbols-outlined">add</span>
              <span className="truncate">New Leave Request</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Leave Calendar</h2>
              <div className="flex items-center gap-2">
                <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700">
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">June 2024</p>
                <button className="flex size-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700">
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-sm">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="font-medium text-neutral-600 dark:text-neutral-400">
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => (
                <div
                  key={`${day.label}-${index}`}
                  className={`relative py-2 ${day.muted ? 'text-neutral-400 dark:text-neutral-600' : ''}`}
                >
                  {day.pillClass ? (
                    <span
                      className={`absolute left-1/2 top-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-semibold ${day.pillClass} ${day.bold ? '' : ''}`}
                    >
                      {day.label}
                    </span>
                  ) : (
                    <span className={`${day.bold ? 'font-semibold text-neutral-800 dark:text-neutral-100' : ''}`}>
                      {day.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              {leaveLegend.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <div className={`size-3 rounded-full ${item.color}`}></div>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Your Leave Balances</h2>
            <div className="mt-4 flex flex-col gap-4">
              {leaveBalances.map((item) => (
                <div key={item.label} className="flex flex-col">
                  <div className="flex justify-between text-sm">
                    <p className="font-medium text-neutral-800 dark:text-neutral-100">{item.label}</p>
                    <p className="text-neutral-600 dark:text-neutral-400">{item.summary}</p>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div className={`h-2 rounded-full ${item.bar}`} style={{ width: `${item.percent}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h2 className="pb-3 pt-8 text-[22px] font-bold leading-tight tracking-[-0.015em] text-neutral-800 dark:text-neutral-100">
          Leave Requests
        </h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Leave Type</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Dates</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Days</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((request) => (
                <tr key={`${request.employee}-${request.type}`} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                  <td className="p-4 text-sm font-medium text-neutral-800 dark:text-neutral-100">{request.employee}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{request.type}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{request.dates}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{request.days}</td>
                  <td className="p-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${request.status.className}`}>
                      {request.status.label}
                    </span>
                  </td>
                  <td className="p-4 text-sm font-semibold text-primary">
                    {request.actionButtons ? (
                      <div className="flex items-center gap-2">
                        <button className="flex h-8 items-center justify-center gap-1 rounded-md border border-green-500 px-2 text-xs text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
                          <span className="material-symbols-outlined text-sm">check</span>
                          <span>Approve</span>
                        </button>
                        <button className="flex h-8 items-center justify-center gap-1 rounded-md border border-red-500 px-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <span className="material-symbols-outlined text-sm">close</span>
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <button className="hover:underline">View Details</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default LeaveManagement;
