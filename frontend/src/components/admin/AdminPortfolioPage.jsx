import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { portfolioApi } from '../../services/portfolio';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import PortfolioOverviewPanel from '../shared/PortfolioOverviewPanel';
import PortfolioPlaybook from '../shared/PortfolioPlaybook';

const STATUS_OPTIONS = [
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

const PORTFOLIO_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const PORTFOLIO_STATUS_FILTERS = [
  { value: 'all', label: 'All', icon: 'apps' },
  { value: 'active', label: 'Active', icon: 'bolt' },
  { value: 'draft', label: 'Draft', icon: 'edit_note' },
  { value: 'archived', label: 'Archived', icon: 'archive' },
];

const STATUS_ICON = {
  'not-started': 'radio_button_unchecked',
  'in-progress': 'incomplete_circle',
  done: 'check_circle',
};

const STATUS_ICON_COLOR = {
  'not-started': 'text-neutral-300 dark:text-neutral-600',
  'in-progress': 'text-amber-500',
  done: 'text-emerald-500',
};

const STATUS_LABEL = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  done: 'Done',
};

const nextStatus = (status) => {
  if (status === 'not-started') return 'in-progress';
  if (status === 'in-progress') return 'done';
  return 'not-started';
};

const PORTFOLIO_STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  archived: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// Distinct accent per pillar — cycles so any number of pillars still reads as a
// coherent set rather than a single flat color.
const PILLAR_ACCENTS = [
  { grad: 'from-indigo-500 to-violet-500', bar: 'bg-indigo-500', soft: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-300' },
  { grad: 'from-sky-500 to-cyan-500', bar: 'bg-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-300' },
  { grad: 'from-emerald-500 to-teal-500', bar: 'bg-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300' },
  { grad: 'from-amber-500 to-orange-500', bar: 'bg-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300' },
  { grad: 'from-fuchsia-500 to-pink-500', bar: 'bg-fuchsia-500', soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', text: 'text-fuchsia-600 dark:text-fuchsia-300' },
  { grad: 'from-rose-500 to-red-500', bar: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-300' },
];

const CARD_ACCENTS = ['from-indigo-500 to-violet-500', 'from-sky-500 to-cyan-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500'];

const DOT_PATTERN = {
  backgroundImage: 'radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const countItems = (portfolio) => (portfolio.sections || []).reduce((sum, s) => sum + (s.items || []).length, 0);
const countDone = (portfolio) => (portfolio.sections || []).reduce((sum, s) => sum + (s.items || []).filter((i) => i.status === 'done').length, 0);
const completionPct = (portfolio) => {
  const total = countItems(portfolio);
  return total === 0 ? 0 : Math.round((countDone(portfolio) / total) * 100);
};

// Small inline SVG ring — avoids pulling in a chart dependency for one metric.
const ProgressRing = ({ value = 0, size = 64, stroke = 6, colorClass = 'text-white', trackClass = 'stroke-white/25', labelClass = 'text-white' }) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className={`fill-none ${trackClass}`} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`fill-none transition-all duration-700 ease-out-expo ${colorClass}`}
          stroke="currentColor"
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-black ${labelClass}`}>{value}%</span>
    </div>
  );
};

const ProgressBar = ({ value = 0, colorClass = 'bg-primary' }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
    <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const ModalTitle = ({ icon, children }) => (
  <span className="inline-flex items-center gap-2">
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </span>
    {children}
  </span>
);

// Premium gradient CTA — a one-off styled button for the page's primary
// actions, distinct from the flat `Button` used for secondary/utility actions.
const GlowButton = ({ icon, children, loading, disabled, onClick, type = 'button', tone = 'primary' }) => {
  const toneClasses = tone === 'primary'
    ? 'bg-gradient-to-r from-primary to-violet-600 shadow-[0_8px_24px_-6px_rgba(79,70,229,0.55)] hover:shadow-[0_10px_30px_-6px_rgba(79,70,229,0.7)]'
    : 'bg-gradient-to-r from-neutral-800 to-neutral-700 shadow-[0_8px_24px_-6px_rgba(23,23,23,0.4)] hover:shadow-[0_10px_30px_-6px_rgba(23,23,23,0.55)]';
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${toneClasses}`}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin-slow text-lg">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

const StatStrip = ({ stats }) => (
  <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
    <div className="grid grid-cols-2 divide-x divide-y divide-neutral-100 dark:divide-neutral-800 sm:grid-cols-4 sm:divide-y-0">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.iconBg}`}>
              <span className={`material-symbols-outlined text-[16px] ${s.iconColor}`}>{s.icon}</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{s.label}</span>
          </div>
          <p className="animate-counter-up text-3xl font-black tabular-nums tracking-tight text-neutral-900 dark:text-white">{s.value}</p>
        </div>
      ))}
    </div>
  </div>
);

const ShimmerBlock = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${className}`}>
    <div className="absolute inset-0 animate-shimmer bg-shimmer-gradient bg-[length:200%_100%] dark:bg-shimmer-dark" />
  </div>
);

const SUPER_ADMIN_ROLES = ['super_admin', 'superadmin'];

export default function AdminPortfolioPage() {
  const { token, user } = useAuth();
  const canDelete = SUPER_ADMIN_ROLES.includes(String(user?.role || '').toLowerCase());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolios, setPortfolios] = useState([]);
  const [availableProjects, setAvailableProjects] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [activeId, setActiveId] = useState(null);
  const [busy, setBusy] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ project: '', summary: '', liveUrl: '', tags: '' });

  const [infoModal, setInfoModal] = useState(false);
  const [infoForm, setInfoForm] = useState({ summary: '', liveUrl: '', tags: '', status: 'active', logoUrl: '' });

  const [sectionModal, setSectionModal] = useState(null); // { mode: 'add'|'rename', sectionId?, title }
  const [itemModal, setItemModal] = useState(null); // { mode:'add'|'edit', sectionId, itemId?, title, notes, link, status }

  const active = useMemo(() => portfolios.find((p) => p._id === activeId) || null, [portfolios, activeId]);

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!activeId || !token) {
        if (alive) setOverview(null);
        return;
      }
      setOverviewLoading(true);
      try {
        const res = await portfolioApi.getOverview(token, activeId);
        if (alive) setOverview(res?.data || null);
      } catch {
        if (alive) setOverview(null);
      }
      if (alive) setOverviewLoading(false);
    })();
    return () => { alive = false; };
  }, [activeId, token]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [listRes, projectsRes] = await Promise.all([
        portfolioApi.list(token),
        portfolioApi.getProjects(token),
      ]);
      setPortfolios(listRes?.data || []);
      setAvailableProjects(projectsRes?.data || []);
    } catch (err) {
      setError(err?.message || 'Failed to load digital portfolios');
    }
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredPortfolios = useMemo(() => {
    const q = query.trim().toLowerCase();
    return portfolios.filter((p) => {
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesQuery = !q || [p.projectName, p.projectCode, p.summary, ...(p.tags || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [portfolios, query, statusFilter]);

  const creatableProjects = availableProjects.filter((p) => !p.hasPortfolio);

  const summary = useMemo(() => {
    const totalItems = portfolios.reduce((sum, p) => sum + countItems(p), 0);
    const doneItems = portfolios.reduce((sum, p) => sum + countDone(p), 0);
    return {
      total: portfolios.length,
      active: portfolios.filter((p) => p.status === 'active').length,
      avgCompletion: totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100),
      unassigned: creatableProjects.length,
    };
  }, [portfolios, creatableProjects.length]);

  const upsertPortfolioInList = (updated) => {
    setPortfolios((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
  };

  // ---- Portfolio-level CRUD ----

  const openCreateModal = () => {
    setCreateForm({ project: creatableProjects[0]?._id || '', summary: '', liveUrl: '', tags: '' });
    setCreateModal(true);
  };

  const handleSeedAllProjects = async () => {
    if (creatableProjects.length === 0) return;
    if (!window.confirm(`Create a digital portfolio (with the default pillar template) for all ${creatableProjects.length} project(s) without one?`)) return;
    setBusy(true);
    setError('');
    const created = [];
    const failed = [];
    for (const project of creatableProjects) {
      try {
        const res = await portfolioApi.create(token, { project: project._id });
        created.push(res.data);
      } catch (err) {
        failed.push(`${project.name}: ${err?.message || 'failed'}`);
      }
    }
    if (created.length) {
      setPortfolios((prev) => [...created, ...prev]);
      const createdIds = new Set(created.map((p) => String(p.project?._id || p.project)));
      setAvailableProjects((prev) => prev.map((p) => (createdIds.has(String(p._id)) ? { ...p, hasPortfolio: true } : p)));
    }
    if (failed.length) setError(`Some portfolios could not be created: ${failed.join('; ')}`);
    setBusy(false);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.project) return;
    setBusy(true);
    setError('');
    try {
      const res = await portfolioApi.create(token, {
        project: createForm.project,
        summary: createForm.summary,
        liveUrl: createForm.liveUrl,
        tags: createForm.tags ? createForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      });
      setPortfolios((prev) => [res.data, ...prev]);
      setAvailableProjects((prev) =>
        prev.map((p) => (p._id === createForm.project ? { ...p, hasPortfolio: true } : p))
      );
      setCreateModal(false);
      setActiveId(res.data._id);
    } catch (err) {
      setError(err?.message || 'Failed to create portfolio');
    }
    setBusy(false);
  };

  const openInfoModal = () => {
    if (!active) return;
    setInfoForm({
      summary: active.summary || '',
      liveUrl: active.liveUrl || '',
      tags: (active.tags || []).join(', '),
      status: active.status || 'active',
      logoUrl: active.coverImage?.url || '',
    });
    setInfoModal(true);
  };

  const submitInfo = async (e) => {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setError('');
    try {
      const res = await portfolioApi.update(token, active._id, {
        summary: infoForm.summary,
        liveUrl: infoForm.liveUrl,
        status: infoForm.status,
        tags: infoForm.tags ? infoForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        coverImage: { url: infoForm.logoUrl || '' },
      });
      upsertPortfolioInList(res.data);
      setInfoModal(false);
    } catch (err) {
      setError(err?.message || 'Failed to update portfolio');
    }
    setBusy(false);
  };

  const handleDeletePortfolio = async (portfolio) => {
    if (!window.confirm(`Delete the digital portfolio for "${portfolio.projectName}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await portfolioApi.remove(token, portfolio._id);
      setPortfolios((prev) => prev.filter((p) => p._id !== portfolio._id));
      setAvailableProjects((prev) =>
        prev.map((p) => (p._id === String(portfolio.project?._id || portfolio.project) ? { ...p, hasPortfolio: false } : p))
      );
      if (activeId === portfolio._id) setActiveId(null);
    } catch (err) {
      setError(err?.message || 'Failed to delete portfolio');
    }
    setBusy(false);
  };

  // ---- Section CRUD ----

  const openAddSection = () => setSectionModal({ mode: 'add', title: '', description: '' });
  const openRenameSection = (section) => setSectionModal({ mode: 'rename', sectionId: section._id, title: section.title, description: section.description || '' });

  const submitSection = async (e) => {
    e.preventDefault();
    if (!active || !sectionModal?.title?.trim()) return;
    setBusy(true);
    setError('');
    try {
      const payload = { title: sectionModal.title.trim(), description: sectionModal.description || '' };
      const res = sectionModal.mode === 'add'
        ? await portfolioApi.addSection(token, active._id, payload)
        : await portfolioApi.updateSection(token, active._id, sectionModal.sectionId, payload);
      upsertPortfolioInList(res.data);
      setSectionModal(null);
    } catch (err) {
      setError(err?.message || 'Failed to save pillar');
    }
    setBusy(false);
  };

  const handleDeleteSection = async (section) => {
    if (!active) return;
    if (!window.confirm(`Remove the "${section.title}" pillar and all its items?`)) return;
    setBusy(true);
    try {
      const res = await portfolioApi.removeSection(token, active._id, section._id);
      upsertPortfolioInList(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to remove pillar');
    }
    setBusy(false);
  };

  // ---- Item CRUD ----

  const openAddItem = (sectionId) => setItemModal({ mode: 'add', sectionId, title: '', notes: '', link: '', status: 'not-started' });
  const openEditItem = (sectionId, item) =>
    setItemModal({ mode: 'edit', sectionId, itemId: item._id, title: item.title, notes: item.notes || '', link: item.link || '', status: item.status });

  const submitItem = async (e) => {
    e.preventDefault();
    if (!active || !itemModal?.title?.trim()) return;
    setBusy(true);
    setError('');
    try {
      const payload = { title: itemModal.title.trim(), notes: itemModal.notes, link: itemModal.link, status: itemModal.status };
      const res = itemModal.mode === 'add'
        ? await portfolioApi.addItem(token, active._id, itemModal.sectionId, payload)
        : await portfolioApi.updateItem(token, active._id, itemModal.sectionId, itemModal.itemId, payload);
      upsertPortfolioInList(res.data);
      setItemModal(null);
    } catch (err) {
      setError(err?.message || 'Failed to save item');
    }
    setBusy(false);
  };

  const handleDeleteItem = async (sectionId, item) => {
    if (!active) return;
    if (!window.confirm(`Remove "${item.title}"?`)) return;
    setBusy(true);
    try {
      const res = await portfolioApi.removeItem(token, active._id, sectionId, item._id);
      upsertPortfolioInList(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to remove item');
    }
    setBusy(false);
  };

  const cycleItemStatus = async (sectionId, item) => {
    if (!active) return;
    try {
      const res = await portfolioApi.updateItem(token, active._id, sectionId, item._id, { status: nextStatus(item.status) });
      upsertPortfolioInList(res.data);
    } catch (err) {
      setError(err?.message || 'Failed to update status');
    }
  };

  // ---- Render: detail view ----
  if (active) {
    const activePct = completionPct(active);
    const activeTotalItems = countItems(active);
    const sortedSections = [...(active.sections || [])].sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
      <main className="portal-page">
        <div className="portal-page-inner space-y-5 animate-fade-in">
          <button
            type="button"
            onClick={() => setActiveId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 transition hover:text-primary dark:text-neutral-400"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            All portfolios
          </button>

          {error ? (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </div>
          ) : null}

          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-neutral-200 shadow-card dark:border-neutral-800">
            <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-primary via-primary-600 to-violet-700 sm:h-36">
              <div className="absolute inset-0 opacity-40" style={DOT_PATTERN} />
              <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute right-6 top-6 hidden items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/20 sm:flex">
                <ProgressRing value={activePct} size={48} stroke={5} />
                <div className="pr-1">
                  <p className="text-xs font-semibold text-white/80">Completion</p>
                  <p className="text-sm font-black text-white">{countDone(active)}/{activeTotalItems} items</p>
                </div>
              </div>
            </div>
            <div className="relative bg-white px-5 pb-6 dark:bg-neutral-900 sm:px-7">
              <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-end gap-4">
                  {active.coverImage?.url || overview?.project?.logo?.url ? (
                    <img
                      src={active.coverImage?.url || overview?.project?.logo?.url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-2xl border-4 border-white bg-white object-contain shadow-lg ring-1 ring-black/5 dark:border-neutral-900"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-primary to-violet-600 text-xl font-black text-white shadow-lg ring-1 ring-black/5 dark:border-neutral-900">
                      {initials(active.projectName)}
                    </div>
                  )}
                  <div className="pb-1">
                    <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white sm:text-2xl">{active.projectName}</h1>
                    <p className="text-sm font-semibold text-neutral-400">{active.projectCode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pb-1">
                  <Button variant="secondary" size="sm" onClick={openInfoModal} icon={<span className="material-symbols-outlined text-lg">edit</span>}>
                    Edit Info
                  </Button>
                  {canDelete ? (
                    <Button variant="danger" size="sm" onClick={() => handleDeletePortfolio(active)} icon={<span className="material-symbols-outlined text-lg">delete</span>}>
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-4 border-t border-neutral-100 pt-5 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${PORTFOLIO_STATUS_BADGE[active.status] || PORTFOLIO_STATUS_BADGE.draft}`}>
                    {active.status}
                  </span>
                  {(active.tags || []).map((tag) => (
                    <span key={tag} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                      {tag}
                    </span>
                  ))}
                  {active.liveUrl ? (
                    <a href={active.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/20">
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Live site
                    </a>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 sm:hidden">
                  <ProgressRing value={activePct} size={44} stroke={5} colorClass="text-primary" trackClass="stroke-neutral-200 dark:stroke-neutral-800" labelClass="text-neutral-900 dark:text-white" />
                  <p className="text-xs text-neutral-400">{countDone(active)} of {activeTotalItems} items done</p>
                </div>
              </div>

              {active.summary ? <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">{active.summary}</p> : null}
            </div>
          </div>

          <PortfolioPlaybook
            key={active._id}
            portfolio={active}
            token={token}
            editable
            onUpdate={upsertPortfolioInList}
          />

          <PortfolioOverviewPanel
            portfolio={active}
            overview={overview}
            loading={overviewLoading}
            token={token}
            editable
            onUpdate={upsertPortfolioInList}
          />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">Pillars</h2>
              <div className="mt-1 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-violet-500" />
              <p className="mt-2 text-xs text-neutral-400">{sortedSections.length} pillar{sortedSections.length === 1 ? '' : 's'} · {activeTotalItems} tracked items</p>
            </div>
            <Button variant="secondary" size="sm" onClick={openAddSection} icon={<span className="material-symbols-outlined text-lg">add</span>}>
              Add Pillar
            </Button>
          </div>

          {sortedSections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-neutral-700 dark:bg-neutral-900">
              <span className="material-symbols-outlined mb-2 text-3xl text-neutral-300 dark:text-neutral-700">view_column</span>
              <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No pillars yet.</p>
              <Button size="sm" className="mt-4" onClick={openAddSection} icon={<span className="material-symbols-outlined text-lg">add</span>}>
                Add your first pillar
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedSections.map((section, index) => {
                const accent = PILLAR_ACCENTS[index % PILLAR_ACCENTS.length];
                const sectionItems = [...(section.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
                const sectionDone = sectionItems.filter((i) => i.status === 'done').length;
                const sectionPct = sectionItems.length === 0 ? 0 : Math.round((sectionDone / sectionItems.length) * 100);
                return (
                  <div
                    key={section._id}
                    className="animate-slide-up flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-15px_rgba(15,23,42,0.25)] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${accent.grad}`} />
                    <div className="flex items-center justify-between gap-2 px-4 pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
                          <span className="material-symbols-outlined text-[16px]">view_column</span>
                        </span>
                        <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">{section.title}</h3>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => openRenameSection(section)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200" aria-label="Rename pillar">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button type="button" onClick={() => handleDeleteSection(section)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" aria-label="Delete pillar">
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {section.description ? (
                      <p className="px-4 pt-1.5 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{section.description}</p>
                    ) : null}

                    <div className="px-4 pb-1 pt-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                        <span>{sectionDone}/{sectionItems.length} done</span>
                        <span>{sectionPct}%</span>
                      </div>
                      <div className="mt-1"><ProgressBar value={sectionPct} colorClass={accent.bar} /></div>
                    </div>

                    <div className="flex-1 space-y-0.5 p-2.5">
                      {sectionItems.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-neutral-400">No items yet.</p>
                      ) : (
                        sectionItems.map((item) => (
                          <div key={item._id} className="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                            <button
                              type="button"
                              onClick={() => cycleItemStatus(section._id, item)}
                              title={`${STATUS_LABEL[item.status]} — click to change`}
                              className={`flex shrink-0 items-center justify-center transition hover:scale-110 ${STATUS_ICON_COLOR[item.status] || STATUS_ICON_COLOR['not-started']}`}
                            >
                              <span className="material-symbols-outlined text-[20px]">{STATUS_ICON[item.status] || STATUS_ICON['not-started']}</span>
                            </button>
                            <span className={`min-w-0 flex-1 truncate text-sm ${item.status === 'done' ? 'text-neutral-400 line-through decoration-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
                              {item.title}
                            </span>
                            {item.link ? (
                              <a href={item.link} target="_blank" rel="noreferrer" className="shrink-0 text-neutral-300 transition hover:text-primary" aria-label="Open link">
                                <span className="material-symbols-outlined text-[15px]">link</span>
                              </a>
                            ) : null}
                            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                              <button type="button" onClick={() => openEditItem(section._id, item)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200" aria-label="Edit item">
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button type="button" onClick={() => handleDeleteItem(section._id, item)} className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" aria-label="Delete item">
                                <span className="material-symbols-outlined text-[14px]">close</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2.5 pt-0">
                      <button
                        type="button"
                        onClick={() => openAddItem(section._id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary dark:border-neutral-700"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        Add item
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit info modal */}
          <Modal open={infoModal} title={<ModalTitle icon="edit">Edit Portfolio Info</ModalTitle>} onClose={() => setInfoModal(false)}>
            <form onSubmit={submitInfo} className="space-y-3">
              <Input label="Logo URL" name="logoUrl" value={infoForm.logoUrl} onChange={(e) => setInfoForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://... (shown instead of the initials avatar)" />
              <Input label="Summary" name="summary" value={infoForm.summary} onChange={(e) => setInfoForm((f) => ({ ...f, summary: e.target.value }))} />
              <Input label="Live URL" name="liveUrl" value={infoForm.liveUrl} onChange={(e) => setInfoForm((f) => ({ ...f, liveUrl: e.target.value }))} placeholder="https://" />
              <Input label="Tags (comma separated)" name="tags" value={infoForm.tags} onChange={(e) => setInfoForm((f) => ({ ...f, tags: e.target.value }))} />
              <Select label="Status" name="status" options={PORTFOLIO_STATUS_OPTIONS} value={infoForm.status} onChange={(e) => setInfoForm((f) => ({ ...f, status: e.target.value }))} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setInfoModal(false)}>Cancel</Button>
                <Button type="submit" loading={busy}>Save</Button>
              </div>
            </form>
          </Modal>

          {/* Section add/rename modal */}
          <Modal open={Boolean(sectionModal)} title={<ModalTitle icon={sectionModal?.mode === 'add' ? 'add' : 'edit'}>{sectionModal?.mode === 'add' ? 'Add Pillar' : 'Rename Pillar'}</ModalTitle>} onClose={() => setSectionModal(null)}>
            <form onSubmit={submitSection} className="space-y-3">
              <Input
                label="Pillar title"
                name="title"
                value={sectionModal?.title || ''}
                onChange={(e) => setSectionModal((s) => ({ ...s, title: e.target.value }))}
                autoFocus
              />
              <Input
                label="Purpose / summary (optional)"
                name="description"
                value={sectionModal?.description || ''}
                onChange={(e) => setSectionModal((s) => ({ ...s, description: e.target.value }))}
                placeholder="What this pillar covers and why it matters"
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setSectionModal(null)}>Cancel</Button>
                <Button type="submit" loading={busy}>Save</Button>
              </div>
            </form>
          </Modal>

          {/* Item add/edit modal */}
          <Modal open={Boolean(itemModal)} title={<ModalTitle icon={itemModal?.mode === 'add' ? 'add_task' : 'edit'}>{itemModal?.mode === 'add' ? 'Add Item' : 'Edit Item'}</ModalTitle>} onClose={() => setItemModal(null)}>
            <form onSubmit={submitItem} className="space-y-3">
              <Input
                label="Title"
                name="title"
                value={itemModal?.title || ''}
                onChange={(e) => setItemModal((s) => ({ ...s, title: e.target.value }))}
                autoFocus
              />
              <Input
                label="Notes"
                name="notes"
                value={itemModal?.notes || ''}
                onChange={(e) => setItemModal((s) => ({ ...s, notes: e.target.value }))}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input
                  label="Link"
                  name="link"
                  value={itemModal?.link || ''}
                  onChange={(e) => setItemModal((s) => ({ ...s, link: e.target.value }))}
                  placeholder="https://"
                />
                <Select
                  label="Status"
                  name="status"
                  options={STATUS_OPTIONS}
                  value={itemModal?.status || 'not-started'}
                  onChange={(e) => setItemModal((s) => ({ ...s, status: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setItemModal(null)}>Cancel</Button>
                <Button type="submit" loading={busy}>Save</Button>
              </div>
            </form>
          </Modal>
        </div>
      </main>
    );
  }

  // ---- Render: list view ----
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5 animate-fade-in">
        <PortalHeader
          title="Digital Portfolios"
          subtitle="Manage every project's product portfolio — content pillars, GTM system & case-study details"
          icon="work"
          showThemeToggle
        >
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={load} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
              Refresh
            </Button>
            {creatableProjects.length > 0 ? (
              <GlowButton tone="dark" onClick={handleSeedAllProjects} loading={busy} icon="auto_awesome">
                Create for all ({creatableProjects.length})
              </GlowButton>
            ) : null}
            <GlowButton onClick={openCreateModal} disabled={creatableProjects.length === 0} icon="add">
              New Portfolio
            </GlowButton>
          </div>
        </PortalHeader>

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        ) : null}

        <StatStrip
          stats={[
            { label: 'Total portfolios', value: summary.total, icon: 'work', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
            { label: 'Active', value: summary.active, icon: 'bolt', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
            { label: 'Avg. completion', value: `${summary.avgCompletion}%`, icon: 'donut_large', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
            { label: 'Without a portfolio', value: summary.unassigned, icon: 'folder_off', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
          ]}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search portfolios..."
              className="h-11 w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </label>
          <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            {PORTFOLIO_STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  statusFilter === f.value
                    ? 'bg-primary text-white shadow-[0_4px_14px_-4px_rgba(79,70,229,0.6)]'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ShimmerBlock key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : filteredPortfolios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <span className="material-symbols-outlined mb-3 text-4xl text-neutral-300 dark:text-neutral-700">work_off</span>
            <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No digital portfolios yet.</p>
            <p className="mt-1 text-sm text-neutral-400">Create one for a project, or generate one for every project at once.</p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {creatableProjects.length > 0 ? (
                <GlowButton onClick={handleSeedAllProjects} loading={busy} icon="auto_awesome">
                  Create for all {creatableProjects.length} project(s)
                </GlowButton>
              ) : null}
              <Button variant="secondary" size="sm" onClick={openCreateModal} disabled={creatableProjects.length === 0} icon={<span className="material-symbols-outlined text-lg">add</span>}>
                New Portfolio
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPortfolios.map((p, index) => {
              const pct = completionPct(p);
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <div
                  key={p._id}
                  className="animate-slide-up group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-18px_rgba(79,70,229,0.35)] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]"
                >
                  <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start gap-3">
                      {p.coverImage?.url ? (
                        <img src={p.coverImage.url} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-neutral-200 bg-white object-contain shadow-sm dark:border-neutral-700" />
                      ) : (
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-sm font-black text-white shadow-sm`}>
                          {initials(p.projectName)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-base font-black tracking-tight text-neutral-900 dark:text-white">{p.projectName}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${PORTFOLIO_STATUS_BADGE[p.status] || PORTFOLIO_STATUS_BADGE.draft}`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{p.projectCode}</p>
                      </div>
                    </div>

                    {p.summary ? <p className="mt-3 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{p.summary}</p> : null}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-bold text-fuchsia-600 dark:text-fuchsia-300">
                        <span className="material-symbols-outlined text-[12px]">perm_media</span>
                        {p.mediaCount || 0} media
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                        <span className="material-symbols-outlined text-[12px]">gavel</span>
                        {p.lawCount || 0} legal
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                        <span>{(p.sections || []).length} pillars · {countItems(p)} items</span>
                        <span>{pct}% done</span>
                      </div>
                      <div className="mt-1.5"><ProgressBar value={pct} colorClass={pct === 100 ? 'bg-emerald-500' : 'bg-primary'} /></div>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                      <Button variant="secondary" size="sm" onClick={() => setActiveId(p._id)} icon={<span className="material-symbols-outlined text-lg">open_in_new</span>}>
                        Manage
                      </Button>
                      {canDelete ? (
                        <button type="button" onClick={() => handleDeletePortfolio(p)} className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20" aria-label="Delete portfolio">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Modal open={createModal} title={<ModalTitle icon="add_business">New Digital Portfolio</ModalTitle>} onClose={() => setCreateModal(false)}>
          <form onSubmit={submitCreate} className="space-y-3">
            <Select
              label="Project"
              name="project"
              value={createForm.project}
              onChange={(e) => setCreateForm((f) => ({ ...f, project: e.target.value }))}
              options={creatableProjects.map((p) => ({ value: p._id, label: `${p.name} (${p.projectCode || 'no code'})` }))}
            />
            <Input label="Summary" name="summary" value={createForm.summary} onChange={(e) => setCreateForm((f) => ({ ...f, summary: e.target.value }))} />
            <Input label="Live URL" name="liveUrl" value={createForm.liveUrl} onChange={(e) => setCreateForm((f) => ({ ...f, liveUrl: e.target.value }))} placeholder="https://" />
            <Input label="Tags (comma separated)" name="tags" value={createForm.tags} onChange={(e) => setCreateForm((f) => ({ ...f, tags: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button type="submit" loading={busy} disabled={!createForm.project}>Create</Button>
            </div>
          </form>
        </Modal>
      </div>
    </main>
  );
}
