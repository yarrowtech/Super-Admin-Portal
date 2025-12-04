import React from 'react';

const summaryCards = [
  { label: 'On Time Today', value: '98%', change: '+2% vs yesterday', changeClass: 'text-success' },
  { label: 'Late Arrivals', value: '15', change: '+5 vs yesterday', changeClass: 'text-danger' },
  { label: 'Absent Today', value: '8', change: 'No change', changeClass: 'text-neutral-600 dark:text-neutral-400' },
  { label: 'Pending Approvals', value: '5', change: 'Action required', changeClass: 'text-yellow-600 dark:text-yellow-400' },
];

const attendanceRows = [
  {
    name: 'Srijon Sarkar',
    role: 'UX Designer',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAulWGUPrI69XnV8I4s8MM67bF00OMuzxPJekbbtsc03P0oXW9wQr2JWYUZDXEQQCsTCYA5vxB1tfS7LqMNdf-Cdv514ir2TADz6yPyiawg7nFZy3ki1f5Sm7N5_LNCVetMwsxvH4QL4DIKGlhXJMcuLTqJVz2hPnh9sFYygAxwyUthoawFI_o5ghUNLMa_lIug_7yfr1hhWFRi_YD-N3d-w5qqVvfDw8RTpC_afs3bUUyVekbMklx04PsOGG-a3iNCp5IAKH1C3_5y',
    clockIn: '08:58 AM',
    clockOut: '05:02 PM',
    total: '8h 4m',
    status: 'On Time',
    statusColor: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
    action: 'View Details',
  },
  {
    name: 'Sangeet Chowdhury',
    role: 'Product Manager',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAulWGUPrI69XnV8I4s8MM67bF00OMuzxPJekbbtsc03P0oXW9wQr2JWYUZDXEQQCsTCYA5vxB1tfS7LqMNdf-Cdv514ir2TADz6yPyiawg7nFZy3ki1f5Sm7N5_LNCVetMwsxvH4QL4DIKGlhXJMcuLTqJVz2hPnh9sFYygAxwyUthoawFI_o5ghUNLMa_lIug_7yfr1hhWFRi_YD-N3d-w5qqVvfDw8RTpC_afs3bUUyVekbMklx04PsOGG-a3iNCp5IAKH1C3_5y',
    clockIn: '09:15 AM',
    clockOut: '06:10 PM',
    total: '8h 55m',
    status: 'Late',
    statusColor: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
    action: 'View Details',
    clockInClass: 'text-danger dark:text-red-400',
  },
  {
    name: 'Raktim Maity',
    role: 'Frontend Developer',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAulWGUPrI69XnV8I4s8MM67bF00OMuzxPJekbbtsc03P0oXW9wQr2JWYUZDXEQQCsTCYA5vxB1tfS7LqMNdf-Cdv514ir2TADz6yPyiawg7nFZy3ki1f5Sm7N5_LNCVetMwsxvH4QL4DIKGlhXJMcuLTqJVz2hPnh9sFYygAxwyUthoawFI_o5ghUNLMa_lIug_7yfr1hhWFRi_YD-N3d-w5qqVvfDw8RTpC_afs3bUUyVekbMklx04PsOGG-a3iNCp5IAKH1C3_5y',
    clockIn: '09:01 AM',
    clockOut: '04:30 PM',
    total: '7h 29m',
    status: 'Early Leave',
    statusColor: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
    dot: 'bg-orange-500',
    action: 'Approve',
  },
  {
    name: 'Anshika Pathak',
    role: 'Marketing Lead',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAulWGUPrI69XnV8I4s8MM67bF00OMuzxPJekbbtsc03P0oXW9wQr2JWYUZDXEQQCsTCYA5vxB1tfS7LqMNdf-Cdv514ir2TADz6yPyiawg7nFZy3ki1f5Sm7N5_LNCVetMwsxvH4QL4DIKGlhXJMcuLTqJVz2hPnh9sFYygAxwyUthoawFI_o5ghUNLMa_lIug_7yfr1hhWFRi_YD-N3d-w5qqVvfDw8RTpC_afs3bUUyVekbMklx04PsOGG-a3iNCp5IAKH1C3_5y',
    clockIn: '-',
    clockOut: '-',
    total: '-',
    status: 'Absent',
    statusColor: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
    action: 'View Details',
  },
  {
    name: 'DJ',
    role: 'Backend Engineer',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAulWGUPrI69XnV8I4s8MM67bF00OMuzxPJekbbtsc03P0oXW9wQr2JWYUZDXEQQCsTCYA5vxB1tfS7LqMNdf-Cdv514ir2TADz6yPyiawg7nFZy3ki1f5Sm7N5_LNCVetMwsxvH4QL4DIKGlhXJMcuLTqJVz2hPnh9sFYygAxwyUthoawFI_o5ghUNLMa_lIug_7yfr1hhWFRi_YD-N3d-w5qqVvfDw8RTpC_afs3bUUyVekbMklx04PsOGG-a3iNCp5IAKH1C3_5y',
    clockIn: '-',
    clockOut: '-',
    total: '-',
    status: 'On Leave',
    statusColor: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
    dot: 'bg-blue-500',
    action: 'View Details',
  },
];

const Attendance = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Time &amp; Attendance
            </h1>
            <p className="text-base font-normal leading-normal text-neutral-600 dark:text-neutral-400">
              Track and manage employee work hours, shifts, and attendance records.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex h-10 min-w-[84px] items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined">download</span>
              <span className="truncate">Export Report</span>
            </button>
            <button className="flex h-10 min-w-[84px] items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
              <span className="material-symbols-outlined">add</span>
              <span className="truncate">Add New Shift</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-800/50"
            >
              <p className="text-base font-medium text-neutral-600 dark:text-neutral-400">{card.label}</p>
              <p className="text-3xl font-bold leading-tight text-neutral-800 dark:text-neutral-100">
                {card.value}
              </p>
              <p className={`text-base font-medium leading-normal ${card.changeClass}`}>{card.change}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <h2 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-neutral-800 dark:text-neutral-100">
              Daily Attendance Log
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative min-w-64">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search employees..."
                  className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-neutral-800 dark:bg-neutral-800/50"
                />
              </div>
              <input
                type="date"
                defaultValue="2024-05-23"
                className="h-10 w-40 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-neutral-800 dark:bg-neutral-800/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
            <table className="w-full text-left">
              <thead className="border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Employee</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Clock In</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Clock Out</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Total Hours</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                  <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map((row) => (
                  <tr key={row.name} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded-full bg-cover bg-center"
                          style={{ backgroundImage: `url(${row.avatar})` }}
                        ></div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{row.name}</p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">{row.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`p-4 text-sm text-neutral-600 dark:text-neutral-400 ${row.clockInClass || ''}`}>
                      {row.clockIn}
                    </td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{row.clockOut}</td>
                    <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{row.total}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${row.statusColor}`}
                      >
                        <span className={`size-1.5 rounded-full ${row.dot}`}></span>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm font-semibold text-primary">
                      <button className="hover:underline">{row.action}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Attendance;
