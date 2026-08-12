import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../services/admin';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';

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
    route: '/media/dashboard/projects',
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
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Departments Overview"
          subtitle="Manage all company departments from this central hub"
          icon="corporate_fare"
          showSearch={false}
          showNotifications={false}
          showThemeToggle
        >
          <div className="relative w-full min-[560px]:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg text-neutral-400">search</span>
            <input
              className="app-input pl-10 pr-9"
              placeholder="Search departments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600 dark:hover:bg-neutral-700"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </PortalHeader>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white py-20 text-center dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined mb-3 text-5xl text-neutral-300 dark:text-neutral-600">corporate_fare</span>
            <h3 className="mb-1 text-base font-semibold text-neutral-700 dark:text-neutral-300">No departments found</h3>
            <p className="mb-4 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
              Try a different search term.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setQuery('')} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
              Clear search
            </Button>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
};

export default DepartmentsOverview;
