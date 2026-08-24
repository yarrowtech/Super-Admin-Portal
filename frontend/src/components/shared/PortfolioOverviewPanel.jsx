// Read-only project snapshot shown inside a Digital Portfolio's detail view —
// pulls project basics plus a live rollup from the Media and Law modules for
// the same project. Nothing here writes back to Media/Law; it only reads what
// those portals already track so a project's full picture shows in one place.
// Shared by AdminPortfolioPage (admin CRUD) and PortfolioViewerPage (read-only).

const MEDIA_SECTION_LABELS = {
  dashboard: 'Dashboard',
  asset: 'Assets',
  campaign: 'Campaigns',
  content: 'Content',
  brand: 'Brand',
  design: 'Design',
  video: 'Video',
  social: 'Social',
  advertisement: 'Ads',
  seo: 'SEO',
  website: 'Website',
  testimonial: 'Testimonials',
  'case-study': 'Case Studies',
  approval: 'Approvals',
  report: 'Reports',
  archive: 'Archive',
};

const LAW_STATUS_TONE = {
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  draft: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  expired: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

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

const StatBox = ({ label, value }) => (
  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
    <p className="mt-1 truncate text-sm font-bold text-neutral-900 dark:text-white">{value}</p>
  </div>
);

const SnapshotCard = ({ icon, iconBg, iconColor, title, totalLabel, linkTo, children }) => (
  <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}>
          <span className="material-symbols-outlined text-[18px]">{icon}</span>
        </span>
        <div>
          <h3 className="text-sm font-black text-neutral-900 dark:text-white">{title}</h3>
          {totalLabel ? <p className="text-xs text-neutral-400">{totalLabel}</p> : null}
        </div>
      </div>
      {linkTo ? (
        <a href={linkTo} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Open
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </a>
      ) : null}
    </div>
    <div className="mt-3 flex-1">{children}</div>
  </div>
);

const BadgeRow = ({ entries, formatLabel = (k) => k, emptyText = 'No data yet.' }) => {
  const pairs = Object.entries(entries || {}).filter(([, count]) => count > 0);
  if (pairs.length === 0) return <p className="text-xs text-neutral-400">{emptyText}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {pairs.map(([key, count]) => (
        <span key={key} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {formatLabel(key)} <span className="text-neutral-400">· {count}</span>
        </span>
      ))}
    </div>
  );
};

export default function PortfolioOverviewPanel({ overview, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        <ShimmerBlock className="h-40 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ShimmerBlock className="h-56 rounded-2xl" />
          <ShimmerBlock className="h-56 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!overview?.project) return null;
  const { project, crossPortal } = overview;
  const media = crossPortal?.media || { total: 0, bySection: {}, recent: [] };
  const law = crossPortal?.law || { contracts: { total: 0, byStatus: {}, expiringSoon: 0, recent: [] }, documents: { total: 0, byStatus: {}, recent: [] } };
  const managerName = project.projectManager
    ? `${project.projectManager.firstName || ''} ${project.projectManager.lastName || ''}`.trim()
    : '';

  return (
    <div className="space-y-4">
      {/* Project basics */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03] sm:p-5">
        <div className="flex items-start gap-4">
          {project.logo?.url ? (
            <img src={project.logo.url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-lg font-black text-white">
              {initials(project.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">{project.name}</h3>
              {project.status ? (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{project.status}</span>
              ) : null}
              {project.priority ? (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold capitalize text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{project.priority} priority</span>
              ) : null}
            </div>
            {project.description ? <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{project.description}</p> : null}
            {project.client?.name || project.client?.company ? (
              <p className="mt-1.5 text-xs font-semibold text-neutral-400">
                Client: {[project.client?.name, project.client?.company].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatBox label="Start date" value={formatDate(project.startDate)} />
          <StatBox label="Deadline" value={formatDate(project.deadline || project.endDate)} />
          <StatBox label="Budget" value={project.budget?.estimated != null ? project.budget.estimated.toLocaleString() : '—'} />
          <StatBox label="Manager" value={managerName || '—'} />
        </div>

        {typeof project.progress === 'number' ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
              <span>Overall project progress</span>
              <span>{project.progress}%</span>
            </div>
            <div className="mt-1"><ProgressBar value={project.progress} /></div>
          </div>
        ) : null}

        {(project.technologies || []).length ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.technologies.map((tech) => (
              <span key={tech} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                {tech}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Cross-portal rollup */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SnapshotCard
          icon="perm_media"
          iconBg="bg-fuchsia-500/10"
          iconColor="text-fuchsia-500"
          title="Media"
          totalLabel={`${media.total} item${media.total === 1 ? '' : 's'} tracked in the Media portal`}
          linkTo="/media/dashboard"
        >
          <BadgeRow entries={media.bySection} formatLabel={(k) => MEDIA_SECTION_LABELS[k] || k} emptyText="No media activity yet for this project." />
          {media.recent.length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {media.recent.slice(0, 4).map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{item.title}</span>
                  <span className="shrink-0 text-xs text-neutral-400">{item.status}</span>
                </div>
              ))}
            </div>
          ) : null}
        </SnapshotCard>

        <SnapshotCard
          icon="gavel"
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          title="Law"
          totalLabel={`${law.contracts.total} contract${law.contracts.total === 1 ? '' : 's'} · ${law.documents.total} document${law.documents.total === 1 ? '' : 's'}`}
          linkTo="/law/dashboard"
        >
          {law.contracts.expiringSoon > 0 ? (
            <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {law.contracts.expiringSoon} contract{law.contracts.expiringSoon === 1 ? '' : 's'} expiring within 30 days
            </p>
          ) : null}
          <BadgeRow entries={law.contracts.byStatus} formatLabel={(k) => k} emptyText="No contracts yet for this project." />
          {law.documents.total > 0 ? (
            <div className="mt-2">
              <BadgeRow entries={law.documents.byStatus} formatLabel={(k) => `${k} doc`} />
            </div>
          ) : null}
          {[...law.contracts.recent, ...law.documents.recent].length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {[...law.contracts.recent, ...law.documents.recent].slice(0, 4).map((item) => (
                <div key={item._id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{item.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${LAW_STATUS_TONE[String(item.status).toLowerCase()] || LAW_STATUS_TONE.draft}`}>{item.status}</span>
                </div>
              ))}
            </div>
          ) : null}
        </SnapshotCard>
      </div>
    </div>
  );
}
