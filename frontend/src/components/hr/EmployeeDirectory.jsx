import React from 'react';

const employees = [
  {
    name: 'Olivia Rhye',
    email: 'olivia@example.com',
    status: { label: 'Active', className: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300' },
    position: 'Senior UX Designer',
    department: 'Design',
    contact: '(239) 555-0108',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCXFB_wAz4uwhnoixDRIfgdgpqG5pUz-wRe8C8rzyI8lYrTvw6ycC69cmtK9uEck81FmcuTfYzkCtOj_jcTZYACJwJ3r-QBPTW9qDn9cfgtF6n4j42zWXAV5bHaFKI3uZjR3tWpEkrdV16tZoKTRxyaRDRgEXNPK2Xie-1Ws29oLXaSXBC_S0LDCGgjnrzRA5J9sX-7t2Gj70WILNvEmGPMd3COyRnEpBc0JsZO_SWTHZcCNG4SxkmxH32IJSSw06EJx2S32e6CKRtO',
  },
  {
    name: 'Phoenix Baker',
    email: 'phoenix@example.com',
    status: { label: 'Active', className: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300' },
    position: 'Product Manager',
    department: 'Product',
    contact: '(302) 555-0107',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB7ggBVBbVv4fKoPPQBTUOad6ctqoY5c-6Y8-yowlseO93ReQHb5X1fVZ4ZGuCBSz4evBIjA8FihyRsxypJUkXqqle8l7piZpciMB0gAnigSCWdSIKvokD0aJse_O2S4YxCCatD1Ulb41mN_PxuCOrjogV03UOrtbQ8Wz59ayW2fr5JiRs48DKf2MCNNZO7p7dQS6GInrMuRrOdty7OLIC3VcK5LYrOa034JQW9upSnBCwNZd22WsxO9Uyyp1hbyOhCF9v90tuqflet',
  },
  {
    name: 'Lana Steiner',
    email: 'lana@example.com',
    status: { label: 'Active', className: 'bg-success/10 text-success dark:bg-success/20 dark:text-green-300' },
    position: 'Frontend Developer',
    department: 'Engineering',
    contact: '(207) 555-0119',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAIhaWVE9cMd0eeLxgk7i5fBc0oiS2c8GlUiMSwnlxbXdhIZjolamvIpNtqkENaYfIUQyaTCnJOtboprCVcR1v6iYe8_qKfqUCnu9K8GZK21W35pAk-Dj8_KYaMkX7yd0a7eaBSd8HgXv1rICjPxstAiVv3nF-HwuISPx-S4mBIsBL6ICvuY6FqZEyHTy75Z4jskhVHk4Xd65w1LW28CouuK6FGK9M11eFbJIOi8fA4TUIbiXPL_9RSxj_maduZTOw9fbbfrSXCnOnw',
  },
  {
    name: 'Candice Wu',
    email: 'candice@example.com',
    status: { label: 'On Leave', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200' },
    position: 'Marketing Lead',
    department: 'Marketing',
    contact: '(201) 555-0125',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC5VeYsvEe-nOMcwCTzlmyBdBEsHB6mmaFuJOOOuAqQgr7l-7otfN2HYGtxqWSgrjpAsgcGYW0gwWavh_MGhzqPQh04b-uW7I2y4PQga8UyPomehFIWyPQWKRmhrfvS8ShxEcfGxED96UI-TjsanQKlVSomoZOg2SPLXQoS2torrsHJTovNY3S_cgoxgjgW7veCZLcGRj19rJc2JYLLaUBXrmOop9-V1XENbVQEvHygpBqQikV91yz0lP7fhfDg7LQs7YfK2vLNrj0m',
  },
  {
    name: 'Drew Cano',
    email: 'drew@example.com',
    status: { label: 'Inactive', className: 'bg-danger/10 text-danger dark:bg-danger/20 dark:text-red-300' },
    position: 'Customer Success Manager',
    department: 'Customer Success',
    contact: '(684) 555-0102',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCWZi0sN4gwPkTLwx9kEiH4xQ7bFTJdCTUj917rPSmyxIMPUZQ5LsFlfykc_y7Yg56_3cG8bvgiYmilz96ydrlHwwGhr2g8tJJXV6Gc7lDzlq9cnufWH6P0OJaOO6UkqYsKTFTaZIk8b5ZZRbOdQxvrGK70LLyC0M1jJVaCbrApNCGytGt0qn1Dso__D82KkgGQUoo_OdLmo-Vj7hklZA-SEjEDtfUKS63x2MvvrA9G-nXOswQjN89vy2F1C7JBzmxmntR5sDtbdRgK',
  },
];

const EmployeeDirectory = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Employee Directory
            </h1>
            <p className="text-base text-neutral-600 dark:text-neutral-400">Manage all employees in one place.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
              <span className="material-symbols-outlined text-base">upload</span>
              <span>Export</span>
            </button>
            <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white">
              <span className="material-symbols-outlined text-base">add</span>
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
          <div className="relative w-full max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 dark:text-neutral-400">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name or email"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-800 dark:bg-neutral-800/50"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <span className="material-symbols-outlined text-base">filter_list</span>
              <span>Department</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
            <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-400">
              <span>Status</span>
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-800/50">
          <table className="w-full text-left">
            <thead className="border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <span>Employee Name</span>
                  </div>
                </th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Status</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Position</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Department</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400">Contact</th>
                <th className="p-4 text-sm font-semibold text-neutral-600 dark:text-neutral-400"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.email} className="border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-neutral-300 text-primary focus:ring-primary/50 dark:border-neutral-700 dark:bg-neutral-900"
                      />
                      <img src={employee.avatar} alt={`${employee.name} avatar`} className="size-10 rounded-full object-cover" />
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-100">{employee.name}</p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{employee.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${employee.status.className}`}>
                      {employee.status.label}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.position}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.department}</td>
                  <td className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{employee.contact}</td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      <button className="flex size-8 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button className="flex size-8 items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
            <p>Page 1 of 10</p>
            <div className="flex gap-2">
              <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
                Previous
              </button>
              <button className="flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800/50 dark:text-neutral-100">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EmployeeDirectory;
