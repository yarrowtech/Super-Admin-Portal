import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { portfolioApi } from '../../services/portfolio';
import PortfolioOverviewPanel from './PortfolioOverviewPanel';
import PortfolioPlaybook from './PortfolioPlaybook';

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

const PORTFOLIO_STATUS_BADGE = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  archived: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

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

const ProgressRing = ({ value = 0, size = 48, stroke = 5, colorClass = 'text-white', trackClass = 'stroke-white/25', labelClass = 'text-white' }) => {
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
      <span className={`absolute inset-0 flex items-center justify-center text-xs font-black ${labelClass}`}>{value}%</span>
    </div>
  );
};

const ProgressBar = ({ value = 0, colorClass = 'bg-primary' }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
    <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const ShimmerBlock = ({ className = '' }) => (
  <div className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${className}`}>
    <div className="absolute inset-0 animate-shimmer bg-shimmer-gradient bg-[length:200%_100%] dark:bg-shimmer-dark" />
  </div>
);

const StatStrip = ({ stats }) => (
  <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-card dark:border-neutral-800 dark:bg-neutral-900">
    <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-2 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.iconBg}`}>
              <span className={`material-symbols-outlined text-[16px] ${s.iconColor}`}>{s.icon}</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{s.label}</span>
          </div>
          <p className="animate-counter-up text-2xl font-black tabular-nums tracking-tight text-neutral-900 dark:text-white sm:text-3xl">{s.value}</p>
        </div>
      ))}
    </div>
  </div>
);

// Read-only viewer — any authenticated user across every portal can browse
// project digital portfolios here. Creating/editing is admin-only (see
// AdminPortfolioPage under /admin/digital-portfolio).
export default function PortfolioViewerPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [portfolios, setPortfolios] = useState([]);
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await portfolioApi.list(token);
        if (alive) setPortfolios(res?.data || []);
      } catch (err) {
        if (alive) setError(err?.message || 'Failed to load portfolios');
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [token]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return portfolios;
    return portfolios.filter((p) =>
      [p.projectName, p.projectCode, p.summary, ...(p.tags || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [portfolios, query]);

  const overallStats = useMemo(() => {
    const totalItems = portfolios.reduce((sum, p) => sum + countItems(p), 0);
    const doneItems = portfolios.reduce((sum, p) => sum + countDone(p), 0);
    return {
      total: portfolios.length,
      pillars: portfolios.reduce((sum, p) => sum + (p.sections || []).length, 0),
      avgCompletion: totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100),
    };
  }, [portfolios]);

  const active = portfolios.find((p) => p._id === activeId) || null;

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

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-6 dark:bg-neutral-950 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5 animate-fade-in">
        {!active ? (
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)]">
                <span className="material-symbols-outlined text-[22px]">work</span>
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">Digital Portfolios</h1>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Showcase content &amp; tracked pillars for every project.</p>
              </div>
            </div>
          </header>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {error}
          </div>
        ) : null}

        {active ? (
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 transition hover:text-primary dark:text-neutral-400"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              All portfolios
            </button>

            <div className="relative overflow-hidden rounded-3xl border border-neutral-200 shadow-card dark:border-neutral-800">
              <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-primary via-primary-600 to-violet-700 sm:h-32">
                <div className="absolute inset-0 opacity-40" style={DOT_PATTERN} />
                <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute right-6 top-6 hidden items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/20 sm:flex">
                  <ProgressRing value={completionPct(active)} />
                  <div className="pr-1">
                    <p className="text-xs font-semibold text-white/80">Completion</p>
                    <p className="text-sm font-black text-white">{countDone(active)}/{countItems(active)} items</p>
                  </div>
                </div>
              </div>
              <div className="relative bg-white px-5 pb-5 dark:bg-neutral-900 sm:px-7">
                <div className="-mt-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-primary to-violet-600 text-lg font-black text-white shadow-lg ring-1 ring-black/5 dark:border-neutral-900">
                      {initials(active.projectName)}
                    </div>
                    <div className="pb-1">
                      <h2 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">{active.projectName}</h2>
                      <p className="text-xs font-semibold text-neutral-400">{active.projectCode}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
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
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500 sm:hidden dark:bg-neutral-800 dark:text-neutral-400">
                    {completionPct(active)}% complete
                  </span>
                </div>

                {active.summary ? <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">{active.summary}</p> : null}
              </div>
            </div>

            <PortfolioPlaybook key={active._id} portfolio={active} editable={false} />

            <PortfolioOverviewPanel overview={overview} loading={overviewLoading} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...(active.sections || [])]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((section, index) => {
                  const accent = PILLAR_ACCENTS[index % PILLAR_ACCENTS.length];
                  const items = [...(section.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
                  const done = items.filter((i) => i.status === 'done').length;
                  const pct = items.length === 0 ? 0 : Math.round((done / items.length) * 100);
                  return (
                    <div key={section._id} className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
                      <div className={`h-1.5 w-full bg-gradient-to-r ${accent.grad}`} />
                      <div className="flex items-center gap-2 px-4 pt-3">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.soft} ${accent.text}`}>
                          <span className="material-symbols-outlined text-[16px]">view_column</span>
                        </span>
                        <h3 className="truncate text-sm font-bold text-neutral-900 dark:text-white">{section.title}</h3>
                      </div>
                      <div className="px-4 pb-1 pt-2.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                          <span>{done}/{items.length} done</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="mt-1"><ProgressBar value={pct} colorClass={accent.bar} /></div>
                      </div>
                      <div className="space-y-0.5 p-2.5">
                        {items.length === 0 ? (
                          <p className="px-2 py-3 text-center text-xs text-neutral-400">No items yet.</p>
                        ) : (
                          items.map((item) => (
                            <div key={item._id} className="flex items-center gap-2 rounded-xl px-2 py-1.5">
                              <span className={`flex shrink-0 items-center justify-center ${STATUS_ICON_COLOR[item.status] || STATUS_ICON_COLOR['not-started']}`}>
                                <span className="material-symbols-outlined text-[18px]">{STATUS_ICON[item.status] || STATUS_ICON['not-started']}</span>
                              </span>
                              <span className={`min-w-0 flex-1 truncate text-sm ${item.status === 'done' ? 'text-neutral-400 line-through decoration-neutral-300' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                {item.title}
                              </span>
                              {item.link ? (
                                <a href={item.link} target="_blank" rel="noreferrer" className="shrink-0 text-neutral-300 hover:text-primary">
                                  <span className="material-symbols-outlined text-[15px]">link</span>
                                </a>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <>
            <StatStrip
              stats={[
                { label: 'Portfolios', value: overallStats.total, icon: 'work', iconBg: 'bg-primary/10', iconColor: 'text-primary' },
                { label: 'Pillars tracked', value: overallStats.pillars, icon: 'view_column', iconBg: 'bg-violet-500/10', iconColor: 'text-violet-500' },
                { label: 'Avg. completion', value: `${overallStats.avgCompletion}%`, icon: 'donut_large', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
              ]}
            />

            <label className="relative block max-w-sm">
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

            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <ShimmerBlock key={i} className="h-44 rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
                <span className="material-symbols-outlined mb-3 text-4xl text-neutral-300 dark:text-neutral-700">work_off</span>
                <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-300">No digital portfolios published yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((p, index) => {
                  const pct = completionPct(p);
                  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => setActiveId(p._id)}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-card ring-1 ring-black/[0.02] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-18px_rgba(79,70,229,0.35)] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]"
                    >
                      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-sm font-black text-white shadow-sm`}>
                            {initials(p.projectName)}
                          </div>
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
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View portfolio
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
