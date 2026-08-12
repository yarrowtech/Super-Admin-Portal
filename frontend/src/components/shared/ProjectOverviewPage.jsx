import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { projectAccessApi } from '../../services/projectAccess';
import { CANONICAL_PROJECTS, findCanonicalProject } from '../../config/projectNames';
import ThemeToggleButton from '../common/ThemeToggleButton';

const PORTAL_DEFAULTS = {
  law: { name: 'Law Portal', icon: 'gavel', accent: '#991b1b' },
  it: { name: 'IT Portal', icon: 'memory', accent: '#0369a1' },
  hr: { name: 'HR Portal', icon: 'badge', accent: '#7c3aed' },
  finance: { name: 'Finance Portal', icon: 'account_balance', accent: '#047857' },
  manager: { name: 'Manager Portal', icon: 'supervisor_account', accent: '#0f766e' },
  employee: { name: 'Employee Portal', icon: 'person', accent: '#2563eb' },
  research: { name: 'Research Portal', icon: 'science', accent: '#7c2d12' },
};

const PORTAL_BG = {
  law: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f3_100%)]',
  it: 'bg-[linear-gradient(180deg,#f8fafc_0%,#edf5fb_100%)]',
  hr: 'bg-[linear-gradient(180deg,#f8fafc_0%,#f3eefb_100%)]',
  finance: 'bg-[linear-gradient(180deg,#f8fafc_0%,#ebf7f0_100%)]',
  manager: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f3_100%)]',
  employee: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef3fb_100%)]',
  research: 'bg-[linear-gradient(180deg,#f8fafc_0%,#f8f1eb_100%)]',
};

const SECTION_ICONS = {
  records: 'description',
  contracts: 'contract',
  assets: 'devices',
  tickets: 'confirmation_number',
  invoices: 'receipt_long',
  expenses: 'request_quote',
  budgets: 'account_balance_wallet',
  workReports: 'assignment',
  tasks: 'task_alt',
  milestones: 'flag',
  employeeProjects: 'folder_open',
  employeeTasks: 'task_alt',
};

const hexToRgb = (hex) => {
  const clean = String(hex || '').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => `${c}${c}`).join('') : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 15, g: 118, b: 110 };
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};
const rgba = (hex, alpha) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition-shadow duration-200 dark:border-neutral-800 dark:bg-neutral-900';
const mutedCard = 'rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-neutral-800 dark:bg-neutral-950/45';
const label = 'text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-neutral-400';
const ACCENTS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];
const EMPTY_SECTIONS = [
  { title: 'Recent Work', type: 'records', rows: [] },
  { title: 'Pending Items', type: 'tasks', rows: [] },
];

const projectStatusTone = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('active') || value.includes('progress') || value.includes('track')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (value.includes('hold') || value.includes('paused')) return 'border-amber-300 bg-amber-50 text-amber-700';
  if (value.includes('complete') || value.includes('closed')) return 'border-slate-300 bg-slate-50 text-slate-600';
  if (value.includes('blocked')) return 'border-red-200 bg-red-50 text-red-700';
  return 'border-teal-300 bg-teal-50 text-teal-700';
};

const getProjectId = (project) => String(project?._id || project?.id || project?.value || project?.code || project?.projectCode || '');
const canonicalProjectRows = () => CANONICAL_PROJECTS.map((project) => ({
  id: project.code,
  code: project.code,
  projectCode: project.code,
  name: project.name,
  description: project.description,
  status: 'in-progress',
  progress: 0,
  virtual: true,
}));

const defaultMetrics = (portalKey, project = {}) => {
  const progress = Number(project?.progress) || 0;
  const map = {
    law: [
      { label: 'Legal Records', value: 0, icon: 'description' },
      { label: 'Contracts', value: 0, icon: 'contract' },
      { label: 'Pending Approval', value: 0, icon: 'pending_actions' },
      { label: 'Expiring Soon', value: 0, icon: 'event_busy' },
      { label: 'Disputes', value: 0, icon: 'balance' },
    ],
    it: [
      { label: 'Assets', value: 0, icon: 'devices' },
      { label: 'Open Tickets', value: 0, icon: 'confirmation_number' },
      { label: 'Critical Tickets', value: 0, icon: 'priority_high' },
      { label: 'Health Score', value: '100%', icon: 'monitor_heart' },
    ],
    finance: [
      { label: 'Invoices', value: 0, icon: 'receipt_long' },
      { label: 'Payments', value: 0, icon: 'payments' },
      { label: 'Expenses', value: 'INR 0', icon: 'request_quote' },
      { label: 'Budget Used', value: '0%', icon: 'account_balance_wallet' },
    ],
    hr: [
      { label: 'Attendance Rows', value: 0, icon: 'calendar_month' },
      { label: 'Leave Requests', value: 0, icon: 'event_note' },
      { label: 'Work Reports', value: 0, icon: 'assignment' },
      { label: 'HR Tasks', value: 0, icon: 'task_alt' },
    ],
    employee: [
      { label: 'Assigned Tasks', value: 0, icon: 'task_alt' },
      { label: 'Completed Tasks', value: 0, icon: 'check_circle' },
      { label: 'Pending Tasks', value: 0, icon: 'pending' },
    ],
    manager: [
      { label: 'Progress', value: `${progress}%`, icon: 'trending_up' },
      { label: 'Team Members', value: 0, icon: 'group' },
      { label: 'Milestones', value: 0, icon: 'flag' },
      { label: 'Open Tasks', value: 0, icon: 'pending_actions' },
    ],
  };
  return map[portalKey] || map.manager;
};

const safeRows = (rows) => (Array.isArray(rows) ? rows : []);
const asDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
};

const rowTitle = (row = {}) =>
  row.title ||
  row.name ||
  row.invoiceNumber ||
  row.assetTag ||
  row.contractType ||
  row.department ||
  row.category ||
  row.week ||
  row.task ||
  'Record';

const rowMeta = (row = {}) => [
  row.status,
  row.priority,
  row.approvalStatus,
  row.section,
  row.type,
  row.category,
  row.fiscalYear,
].filter(Boolean).slice(0, 3);

const ProjectAvatar = ({ name, logo, accent, size = 44 }) =>
  logo?.url ? (
    <img
      src={logo.url}
      alt={name}
      className="shrink-0 rounded-xl object-cover shadow-sm"
      style={{ height: size, width: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl text-[16px] font-black uppercase text-white shadow-sm"
      style={{ height: size, width: size, background: `linear-gradient(135deg, ${accent}, ${rgba(accent, 0.7)})` }}
    >
      {(name || '?').trim().charAt(0)}
    </span>
  );

const ProjectOverviewPage = ({ portalKey = 'manager', portalName }) => {
  const { token } = useAuth();
  const fallback = PORTAL_DEFAULTS[portalKey] || PORTAL_DEFAULTS.manager;
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    setLoading(true);
    setError('');
    departmentApi
      .getProjectOverviewProjects(token, { portal: portalKey, limit: 200 }, { forceRefresh: true })
      .then((res) => {
        if (!alive) return;
        const rows = res?.data?.items || res?.data?.data?.items || [];
        const visibleRows = rows.length ? rows : canonicalProjectRows();
        setProjects(visibleRows);
        setLastSync(new Date());
      })
      .catch(() => {
        projectAccessApi.getMyProjects(token)
          .then((res) => {
            if (!alive) return;
            const payload = res?.data || res?.data?.data || {};
            const rows = payload.accessibleProjects || payload.assignedProjects || payload.projects || [];
            const visibleRows = rows.filter((project) => String(project.status || '').toLowerCase() !== 'blocked');
            const resolvedRows = visibleRows.length ? visibleRows : canonicalProjectRows();
            setProjects(resolvedRows);
            setLastSync(new Date());
          })
          .catch((err) => {
            if (alive) setError(err.message || 'Failed to load project overview.');
          });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, portalKey]);

  useEffect(() => {
    let alive = true;
    if (!token || !selectedId) {
      setDetail(null);
      return undefined;
    }
    setDetailLoading(true);
    departmentApi
      .getProjectOverviewDetail(token, selectedId, { portal: portalKey }, { forceRefresh: true })
      .then((res) => {
        if (alive) setDetail(res?.data || null);
      })
      .catch(() => {
        if (alive) setDetail(null);
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, selectedId, portalKey]);

  const selectedProject = useMemo(
    () => (selectedId ? projects.find((project) => getProjectId(project) === selectedId) || null : null),
    [projects, selectedId]
  );
  const meta = detail?.meta || fallback;
  const accent = meta.accent || fallback.accent;
  const portalLabel = portalName || fallback.name;
  const project = detail?.project || selectedProject || {};
  const canonical = project ? findCanonicalProject(project) : null;
  const projectName = project?.name || canonical?.name || project?.projectCode || project?.code || 'Project';
  const projectDescription = project?.description || canonical?.description || 'Project workspace.';
  const metrics = selectedProject ? (safeRows(detail?.metrics).length ? safeRows(detail?.metrics) : defaultMetrics(portalKey, project)) : [];
  const sections = selectedProject ? (safeRows(detail?.sections).length ? safeRows(detail?.sections) : EMPTY_SECTIONS) : [];
  const lastSyncLabel = lastSync ? lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'pending';

  const themeVars = {
    '--portal-accent': accent,
    '--portal-accent-soft': rgba(accent, 0.14),
    '--portal-accent-strong': accent,
  };

  return (
    <main
      className={`min-h-screen w-full ${PORTAL_BG[portalKey] || PORTAL_BG.manager} text-neutral-900 dark:bg-background-dark dark:text-neutral-100`}
      style={themeVars}
    >
      <div className="mx-auto w-full max-w-[1500px] space-y-5 p-3 sm:p-4 lg:p-6">
        <header className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-950">
          <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${rgba(accent, 0.35)})` }} />
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="material-symbols-outlined flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-[24px] text-white shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                style={{ background: `linear-gradient(135deg, ${accent}, ${rgba(accent, 0.75)})` }}
              >
                {meta.icon || fallback.icon}
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-[26px] font-black leading-tight tracking-tight text-slate-950 dark:text-neutral-100">{`${portalLabel} Project Overview`}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-5 text-neutral-500 dark:text-neutral-400">Click a project to view read-only {portalLabel.replace(' Portal', '').toLowerCase()} work and project context.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Last sync {lastSyncLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[11px] font-black text-cyan-700">
                <span className="material-symbols-outlined text-[16px]">folder_copy</span>
                {projects.length || CANONICAL_PROJECTS.length} projects
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
                <span className="material-symbols-outlined text-[16px]">visibility</span>
                View only
              </span>
              <ThemeToggleButton />
            </div>
          </div>
        </header>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <div>
              <p className="font-bold">Could not load project overview</p>
              <p className="mt-0.5 text-[13px] text-red-600/90 dark:text-red-300/80">{error}</p>
            </div>
          </div>
        ) : null}

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: accent }}>Projects</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-neutral-100">Project workspaces</h2>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Same design across portals. Only department data changes.</p>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-[124px] animate-pulse rounded-[1.35rem] bg-white/80 shadow-sm dark:bg-neutral-800" />)}
            </div>
          ) : projects.length ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((item, index) => {
                const id = getProjectId(item);
                const itemCanonical = findCanonicalProject(item);
                const name = item?.name || itemCanonical?.name || item?.projectCode || item?.code || 'Project';
                const active = id === selectedId;
                const code = itemCanonical?.code || item?.projectCode || item?.code || 'Project';
                const color = ACCENTS[index % ACCENTS.length];
                return (
                  <button
                    key={id || name}
                    type="button"
                    onClick={() => setSelectedId(id)}
                    className={`group flex min-h-[124px] flex-col rounded-[1.35rem] border bg-white p-4 text-left shadow-[0_14px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(15,118,110,0.13)] dark:bg-neutral-950/40 ${
                      active
                        ? 'border-teal-300 shadow-[0_0_0_3px_rgba(20,184,166,0.14)]'
                        : 'border-slate-200 hover:border-teal-300'
                    }`}
                    style={{ borderColor: active ? accent : undefined }}
                  >
                    <div className="h-1.5 w-full rounded-full" style={{ background: color }} />
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[16px] font-black text-slate-950 dark:text-neutral-100">{name}</p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-slate-500 dark:text-neutral-400">{item?.description || itemCanonical?.description || 'Project workspace.'}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                        {code}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${projectStatusTone(item.status)}`}>
                        {item.status || 'in-progress'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-teal-700 transition group-hover:gap-1.5 dark:text-teal-400">
                        View overview
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center dark:border-neutral-800 dark:bg-neutral-950/40">
              <span className="material-symbols-outlined text-[34px] text-neutral-300 dark:text-neutral-700">folder_off</span>
              <p className="text-sm font-bold text-slate-600 dark:text-neutral-300">No projects are available for this overview.</p>
              <p className="max-w-sm text-xs leading-5 text-slate-400 dark:text-neutral-500">Project cards will appear here once project data is available.</p>
            </div>
          )}
        </section>

        {selectedProject ? (
          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ProjectAvatar name={projectName} logo={project?.logo} accent={accent} size={48} />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>{projectName}</p>
                  <h2 className="mt-0.5 text-lg font-black tracking-tight text-slate-950 dark:text-neutral-100">{portalLabel} work overview</h2>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">{projectDescription}</p>
                </div>
              </div>
              <span
                className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-white text-[20px] shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
                style={{ color: accent, borderColor: `${accent}33` }}
              >
                dashboard
              </span>
            </div>
            {detailLoading ? (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-neutral-800" />)}
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)] dark:border-neutral-800 dark:bg-neutral-950/40"
                    >
                      <span
                        className="material-symbols-outlined flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[20px] shadow-sm"
                        style={{ background: rgba(accent, 0.12), color: accent }}
                      >
                        {metric.icon || 'analytics'}
                      </span>
                      <div className="min-w-0">
                        <p className={label}>{metric.label}</p>
                        <p className="truncate text-lg font-black text-slate-950 dark:text-neutral-100">{displayValue(metric.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <div className={mutedCard}>
                    <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>Project Context</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <Info label="Status" value={project.status} />
                      <Info label="Priority" value={project.priority} />
                      <Info label="Progress" value={`${displayValue(project.progress)}%`} />
                      <Info label="Start" value={asDate(project.startDate)} />
                      <Info label="End / Deadline" value={asDate(project.endDate)} />
                      <Info label="Budget Est." value={project.budget?.estimated ? `INR ${Number(project.budget.estimated).toLocaleString('en-IN')}` : '-'} />
                    </div>
                    {safeRows(project.technologies).length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.technologies.map((item) => (
                          <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-300">{item}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {sections.map((section) => (
                      <div key={section.title} className={mutedCard}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="material-symbols-outlined flex h-7 w-7 items-center justify-center rounded-lg text-[16px]"
                              style={{ background: rgba(accent, 0.12), color: accent }}
                            >
                              {SECTION_ICONS[section.type] || 'insights'}
                            </span>
                            <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: accent }}>{section.title}</p>
                          </div>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-500 dark:bg-neutral-900">{safeRows(section.rows).length}</span>
                        </div>
                        <div className="mt-3 space-y-2">
                          {safeRows(section.rows).length ? safeRows(section.rows).map((row, idx) => (
                            <div
                              key={row._id || row.id || `${section.title}-${idx}`}
                              className="rounded-xl border border-slate-200 bg-white p-3 transition-colors duration-150 hover:border-slate-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 truncate text-sm font-black text-slate-950 dark:text-neutral-100">{rowTitle(row)}</p>
                                <span className="shrink-0 text-[11px] font-semibold text-slate-400">{asDate(row.updatedAt || row.createdAt || row.dueDate || row.expiryDate)}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {rowMeta(row).map((item) => (
                                  <span key={item} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-neutral-800 dark:text-neutral-300">{item}</span>
                                ))}
                              </div>
                            </div>
                          )) : (
                            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm italic text-slate-400 dark:border-neutral-800 dark:bg-neutral-900">
                              No records yet for this project.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
};

const Info = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
    <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-neutral-100">{displayValue(value)}</p>
  </div>
);

export default ProjectOverviewPage;
