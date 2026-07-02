import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';

const departments = [
  {
    name: 'Law',
    icon: 'gavel',
    description: "Manage legal documents, compliance, and corporate policies.",
    route: '/law/dashboard',
  },
  {
    name: 'HR',
    icon: 'groups',
    description: 'Oversee employee records, recruitment, and payroll.',
    route: '/hr/dashboard',
  },
  {
    name: 'IT',
    icon: 'computer',
    description: 'Handle infrastructure, tech support, and system security.',
    route: '/it/dashboard',
  },
  {
    name: 'Projects',
    icon: 'folder_open',
    description: 'Manage project allocation, access, and monitoring.',
    route: '/admin/projects',
  },
  {
    name: 'Outsourcing',
    icon: 'work',
    description: 'Manage external resources, contracts, and assignments.',
    route: '/admin/outsourcing/dashboard',
  },
  {
    name: 'A/C & Finance',
    icon: 'account_balance',
    description: 'Manage budgets, financial reporting, and accounting tasks.',
    route: '/finance/dashboard',
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
    description: 'Centralize branding, promotions, advertising, marketing materials, and communication.',
    route: '/media/dashboard?section=project-hub',
    badge: 'MEDIA ON & OFFLINE',
    teams: ['Branding Officer', 'Marketing', 'PR', 'Sales', 'FAQs', 'Graphics'],
  },
  {
    name: 'Research Operator',
    icon: 'manage_history',
    description: 'Facilitate research operations and data management.',
  },
];

const DepartmentsOverview = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(departments);

  React.useEffect(() => {
    adminApi
      .getDepartmentsOverview(token)
      .then((res) => setRows(res?.data || departments))
      .catch(() => setRows(departments));
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) =>
      `${d.name} ${d.description}`.toLowerCase().includes(q)
    );
  }, [query, rows]);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black leading-tight tracking-[-0.02em] text-neutral-800 dark:text-neutral-100 lg:text-4xl">
              Departments Overview
            </h1>
            <p className="mt-1 text-neutral-600 dark:text-neutral-400">
              Manage all company departments from this central hub.
            </p>
          </div>
          <div className="flex flex-grow items-center justify-end gap-3 md:flex-grow-0">
            <div className="w-full max-w-sm">
              <label className="flex h-12 flex-col">
                <div className="flex h-full items-stretch rounded-xl">
                  <div className="flex items-center justify-center rounded-l-xl border border-r-0 border-neutral-200 bg-white pl-4 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input
                    className="flex w-full flex-1 rounded-r-xl border border-l-0 border-neutral-200 bg-white px-4 text-sm text-neutral-800 placeholder:text-neutral-500 focus:border-primary focus:outline-0 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
                    placeholder="Search departments..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((department) => (
            <button
              key={department.name}
              type="button"
              onClick={() => department.route && navigate(department.route)}
              className="group flex min-h-[220px] flex-col justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-800 dark:bg-neutral-900 lg:p-5"
              disabled={!department.route}
            >
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                  <span className="material-symbols-outlined text-2xl">{department.icon}</span>
                </div>
                {department.badge ? (
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.28em] text-primary">
                    {department.badge}
                  </p>
                ) : null}
                <h3 className="mt-3 text-lg font-bold text-neutral-900 dark:text-neutral-100">{department.name}</h3>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{department.description}</p>
                {Array.isArray(department.teams) && department.teams.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400">
                      Reporting Structure
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {department.teams.map((team) => (
                        <span
                          key={team}
                          className="rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-xs font-semibold text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200"
                        >
                          {team}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="flex items-center text-sm font-medium text-primary">
                <span>{department.name === 'Media' ? 'Open media portal' : 'Go to module'}</span>
                <span className="material-symbols-outlined ml-1 transition-transform group-hover:translate-x-1">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
};

export default DepartmentsOverview;
