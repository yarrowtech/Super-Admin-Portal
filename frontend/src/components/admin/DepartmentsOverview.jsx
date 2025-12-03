import React from 'react';

const departments = [
  {
    name: 'Law',
    icon: 'gavel',
    description: "Manage legal documents, compliance, and corporate policies.",
  },
  {
    name: 'HR',
    icon: 'groups',
    description: 'Oversee employee records, recruitment, and payroll.',
  },
  {
    name: 'IT',
    icon: 'computer',
    description: 'Handle infrastructure, tech support, and system security.',
  },
  {
    name: 'A/C & Finance',
    icon: 'account_balance',
    description: 'Manage budgets, financial reporting, and accounting tasks.',
  },
  {
    name: 'System Operator',
    icon: 'lan',
    description: 'Control and maintain core operational systems and networks.',
  },
  {
    name: 'Research',
    icon: 'science',
    description: 'Drive innovation, product development, and market analysis.',
  },
  {
    name: 'A/C Sales & Growth',
    icon: 'trending_up',
    description: 'Focus on client acquisition, sales strategies, and revenue growth.',
  },
  {
    name: 'Media',
    icon: 'perm_media',
    description: 'Create and manage marketing campaigns and brand presence.',
  },
  {
    name: 'Research Operator',
    icon: 'manage_history',
    description: 'Facilitate research operations and data management.',
  },
];

const DepartmentsOverview = () => {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-neutral-800 dark:text-neutral-100">
              Departments Overview
            </h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Manage all company departments from this central hub.
            </p>
          </div>
          <div className="flex flex-grow items-center justify-end gap-4 md:flex-grow-0">
            <div className="w-full max-w-sm">
              <label className="flex h-12 flex-col">
                <div className="flex h-full items-stretch rounded-xl">
                  <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-neutral-200 bg-white pl-4 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="flex w-full flex-1 rounded-r-xl border border-l-0 border-neutral-200 bg-white px-4 text-sm text-neutral-800 placeholder:text-neutral-500 focus:border-primary focus:outline-0 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                    placeholder="Search departments..."
                  />
                </div>
              </label>
            </div>
            <button className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary"></span>
            </button>
            <div
              className="h-12 w-12 rounded-xl bg-cover bg-center"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDVludAUrmd8sd8fXodvEVKKlS_rxSh9WQfkfNba-0OlGwx8KvAgXeCL0TXiPbQ3hm98HdSKwBJv2zyIsnXSth4L_q4IK2rr2JDEoY7pFMJlHzKe6rZlXhBdw5IwvLlqnekZkv4mYGqlg26WMdVo8VkbjXyHRqNv6MDeyxFAb6Zs_OXXd8U6pr-IpgWmJe5qqWLgCfxPEFKaLQGO3Tj2sEtgt-UIsHh1LaaCd6AJKUecI7kABzmneS_sN-hkod2T3q2fKv8LytplLIB")',
              }}
            ></div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {departments.map((department) => (
            <div
              key={department.name}
              className="group flex flex-col justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-3xl">{department.icon}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">{department.name}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{department.description}</p>
              </div>
              <div className="flex items-center text-sm font-medium text-primary">
                <span>Go to module</span>
                <span className="material-symbols-outlined ml-1 transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
};

export default DepartmentsOverview;
