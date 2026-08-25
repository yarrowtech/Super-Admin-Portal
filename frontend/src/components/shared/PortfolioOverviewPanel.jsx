import { useState } from 'react';
import { portfolioApi } from '../../services/portfolio';
import Modal from '../ui/Modal';

// The Digital Portfolio's "Command Center" — a read-only project snapshot
// combining project basics, a live rollup from Media/Law, and signals
// computed from the portfolio's own content (Strategy Playbook + Pillars).
// Nothing here is an approval/workflow surface — it only summarizes final
// information that already exists elsewhere, informationally.
//
// The Media/Law cards show live counts from those systems (read-only,
// nothing duplicated), but deliberately do NOT link out to those portals —
// per user feedback, the point of the Digital Portfolio is that the final
// information lives HERE. "Add here" seeds the matching Media/Legal
// Strategy Playbook slide (from the template library) so an admin can type
// the real final info directly into the portfolio instead of leaving it.
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

const HEALTH_TONE = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
};

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const isBlockFilled = (block) => {
  if (block.type === 'text' || block.type === 'badge') return Boolean(block.text && block.text.trim());
  if ((block.groups || []).length > 0) return block.groups.some((g) => (g.items || []).length > 0);
  return (block.items || []).length > 0;
};

const findSlide = (playbook, pattern) => (playbook || []).find((s) => pattern.test(s.title || ''));

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

const MetricCard = ({ label, value, colorClass }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
    {typeof value === 'number' ? (
      <>
        <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-neutral-900 dark:text-white">{value}%</p>
        <div className="mt-2"><ProgressBar value={value} colorClass={colorClass} /></div>
      </>
    ) : (
      <p className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-bold ${value.tone}`}>{value.label}</p>
    )}
  </div>
);

const SectionEyebrow = ({ children }) => (
  <div>
    <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400">{children}</h2>
    <div className="mt-1 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary to-violet-500" />
  </div>
);

const SnapshotCard = ({ icon, iconBg, iconColor, title, totalLabel, onAddInfo, addLabel, children }) => (
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
      {onAddInfo ? (
        <button type="button" onClick={onAddInfo} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
          <span className="material-symbols-outlined text-[14px]">add</span>
          {addLabel || 'Add here'}
        </button>
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

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="shrink-0 text-neutral-400">{label}</span>
      <span className="min-w-0 text-right font-medium text-neutral-700 dark:text-neutral-200">{value}</span>
    </div>
  );
};

// Hides a broken image instead of showing the browser's broken-icon placeholder.
const hideOnError = (e) => { e.currentTarget.style.display = 'none'; };

export default function PortfolioOverviewPanel({ portfolio, overview, loading, token, editable = false, onUpdate }) {
  const [addingSlide, setAddingSlide] = useState('');
  const [previewItem, setPreviewItem] = useState(null); // { kind: 'media'|'contract'|'document', ...record }
  const [previewImageFailed, setPreviewImageFailed] = useState(false);

  const openPreview = (item) => {
    setPreviewImageFailed(false);
    setPreviewItem(item);
  };

  const addTemplateSlide = async (key) => {
    if (!portfolio?._id || !token) return;
    setAddingSlide(key);
    try {
      const res = await portfolioApi.addPlaybookSlideFromTemplate(token, portfolio._id, key);
      onUpdate?.(res.data);
    } catch {
      // surfaced implicitly by the slide simply not appearing; keep this
      // quick-action low-friction rather than adding another error banner
    }
    setAddingSlide('');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ShimmerBlock className="h-24 rounded-2xl" />
          <ShimmerBlock className="h-24 rounded-2xl" />
          <ShimmerBlock className="h-24 rounded-2xl" />
        </div>
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

  // ---- Signals computed from the portfolio's own content ----
  const playbook = portfolio?.playbook || [];
  const sections = portfolio?.sections || [];
  const hasMediaSlide = Boolean(findSlide(playbook, /media/i));
  const hasLegalSlide = Boolean(findSlide(playbook, /legal/i));
  const allBlocks = playbook.flatMap((s) => s.blocks || []);
  const filledBlocks = allBlocks.filter(isBlockFilled);
  const infoCompleteness = allBlocks.length === 0 ? 0 : Math.round((filledBlocks.length / allBlocks.length) * 100);

  const allItems = sections.flatMap((s) => s.items || []);
  const doneItems = allItems.filter((i) => i.status === 'done');
  const executionProgress = allItems.length === 0 ? 0 : Math.round((doneItems.length / allItems.length) * 100);

  const health = law.contracts.expiringSoon > 0
    ? { label: 'Needs Attention', tone: HEALTH_TONE.warning }
    : (infoCompleteness + executionProgress) / 2 >= 70
      ? { label: 'On Track', tone: HEALTH_TONE.success }
      : (infoCompleteness + executionProgress) / 2 >= 35
        ? { label: 'In Progress', tone: HEALTH_TONE.neutral }
        : { label: 'Getting Started', tone: HEALTH_TONE.neutral };

  const coverage = playbook.map((slide) => {
    const blocks = slide.blocks || [];
    const filled = blocks.filter(isBlockFilled).length;
    return { title: slide.title, filled, total: blocks.length };
  });

  const goalsSlide = findSlide(playbook, /goal/i);
  const achievementsSlide = findSlide(playbook, /achievement|highlight/i);

  const attentionItems = [];
  if (law.contracts.expiringSoon > 0) {
    attentionItems.push({ icon: 'warning', tone: 'warning', text: `${law.contracts.expiringSoon} contract${law.contracts.expiringSoon === 1 ? '' : 's'} expiring within 30 days` });
  }
  const emptyBlockCount = allBlocks.length - filledBlocks.length;
  if (emptyBlockCount > 0) {
    attentionItems.push({ icon: 'edit_note', tone: 'neutral', text: `${emptyBlockCount} playbook block${emptyBlockCount === 1 ? '' : 's'} still need${emptyBlockCount === 1 ? 's' : ''} information` });
  }
  const untouchedPillars = sections.filter((s) => (s.items || []).length > 0 && s.items.every((i) => i.status === 'not-started'));
  if (untouchedPillars.length > 0) {
    attentionItems.push({ icon: 'schedule', tone: 'neutral', text: `${untouchedPillars.length} pillar${untouchedPillars.length === 1 ? '' : 's'} not started yet` });
  }
  if (playbook.length === 0) {
    attentionItems.push({ icon: 'auto_stories', tone: 'neutral', text: 'No Strategy Playbook slides yet' });
  }

  return (
    <div className="space-y-4">
      {/* Split completion metrics — deliberately separate, not one blended number */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Information Completeness" value={infoCompleteness} colorClass="bg-primary" />
        <MetricCard label="Execution Progress" value={executionProgress} colorClass={executionProgress === 100 ? 'bg-emerald-500' : 'bg-violet-500'} />
        <MetricCard label="Overall Health" value={health} />
      </div>

      {/* Project basics */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03] sm:p-5">
        <div className="flex items-start gap-4">
          {project.logo?.url || portfolio?.project?.logo?.url || portfolio?.coverImage?.url ? (
            <img src={project.logo?.url || portfolio?.project?.logo?.url || portfolio.coverImage.url} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-neutral-200 bg-white object-contain ring-1 ring-black/5 dark:border-neutral-700" />
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
          <StatBox label="Owner" value={managerName || '—'} />
        </div>

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

      {/* Portfolio Health — coverage per information category (dynamic, since
          categories are configurable per project, not a fixed fired list) */}
      {coverage.length > 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
          <SectionEyebrow>Portfolio Health</SectionEyebrow>
          <div className="mt-3 flex flex-wrap gap-2">
            {coverage.map((c) => {
              const pct = c.total === 0 ? 0 : Math.round((c.filled / c.total) * 100);
              const dotColor = pct === 0 ? 'bg-neutral-300 dark:bg-neutral-700' : pct === 100 ? 'bg-emerald-500' : 'bg-amber-500';
              return (
                <span key={c.title} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                  {c.title} <span className="text-neutral-400">· {c.filled}/{c.total}</span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Key Goals + Needs Attention */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
          <SectionEyebrow>Key Goals</SectionEyebrow>
          <div className="mt-3 space-y-3">
            {goalsSlide && (goalsSlide.blocks || []).length > 0 ? (
              goalsSlide.blocks.map((block) => {
                const preview = block.type === 'text' ? block.text : (block.items || [])[0];
                if (!preview) return null;
                return (
                  <div key={block._id}>
                    <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">{block.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">{preview}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-neutral-400">No goals captured yet — add a "Goals" slide in the Strategy Playbook.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
          <SectionEyebrow>Needs Attention</SectionEyebrow>
          <div className="mt-3 space-y-2">
            {attentionItems.length === 0 ? (
              <p className="inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Nothing needs attention right now.
              </p>
            ) : (
              attentionItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-sm ${item.tone === 'warning' ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                  <span className="material-symbols-outlined mt-0.5 text-[16px]">{item.icon}</span>
                  {item.text}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Key Highlights — only shown if an Achievements/Highlights slide exists */}
      {achievementsSlide && (achievementsSlide.blocks || []).some((b) => (b.items || []).length > 0) ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-card ring-1 ring-black/[0.02] dark:border-neutral-800 dark:bg-neutral-900 dark:ring-white/[0.03]">
          <SectionEyebrow>Key Highlights</SectionEyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {achievementsSlide.blocks.flatMap((b) => b.items || []).slice(0, 8).map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <span className="material-symbols-outlined text-[14px]">military_tech</span>
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Cross-portal rollup */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SnapshotCard
          icon="perm_media"
          iconBg="bg-fuchsia-500/10"
          iconColor="text-fuchsia-500"
          title="Media"
          totalLabel={`${media.total} item${media.total === 1 ? '' : 's'} live in the Media system`}
          onAddInfo={editable && !hasMediaSlide ? () => addTemplateSlide('media') : null}
          addLabel={addingSlide === 'media' ? 'Adding…' : 'Add media info here'}
        >
          <BadgeRow entries={media.bySection} formatLabel={(k) => MEDIA_SECTION_LABELS[k] || k} emptyText="No media activity yet for this project." />
          {media.recent.length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {media.recent.slice(0, 4).map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => openPreview({ kind: 'media', ...item })}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  {item.thumbnailUrl || item.previewUrl || item.storageUrl ? (
                    <img
                      src={item.thumbnailUrl || item.previewUrl || item.storageUrl}
                      alt=""
                      onError={hideOnError}
                      className="h-6 w-6 shrink-0 rounded-md object-cover ring-1 ring-black/5"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{item.title}</span>
                  <span className="shrink-0 text-xs text-neutral-400">{item.status}</span>
                </button>
              ))}
            </div>
          ) : null}
          {hasMediaSlide ? (
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
              Final media info is captured in the "Media / PR" slide above.
            </p>
          ) : null}
        </SnapshotCard>

        <SnapshotCard
          icon="gavel"
          iconBg="bg-rose-500/10"
          iconColor="text-rose-500"
          title="Legal"
          totalLabel={`${law.contracts.total} contract${law.contracts.total === 1 ? '' : 's'} · ${law.documents.total} document${law.documents.total === 1 ? '' : 's'} live in the Law system`}
          onAddInfo={editable && !hasLegalSlide ? () => addTemplateSlide('legal') : null}
          addLabel={addingSlide === 'legal' ? 'Adding…' : 'Add legal info here'}
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
              {[
                ...law.contracts.recent.map((item) => ({ kind: 'contract', ...item })),
                ...law.documents.recent.map((item) => ({ kind: 'document', ...item })),
              ].slice(0, 4).map((item) => (
                <button
                  type="button"
                  key={item._id}
                  onClick={() => openPreview(item)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left text-sm transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-300">{item.title}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${LAW_STATUS_TONE[String(item.status).toLowerCase()] || LAW_STATUS_TONE.draft}`}>{item.status}</span>
                </button>
              ))}
            </div>
          ) : null}
          {hasLegalSlide ? (
            <p className="mt-3 border-t border-neutral-100 pt-3 text-xs text-neutral-400 dark:border-neutral-800">
              Final legal info is captured in the "Legal" slide above.
            </p>
          ) : null}
        </SnapshotCard>
      </div>

      <Modal
        open={Boolean(previewItem)}
        onClose={() => setPreviewItem(null)}
        title={previewItem?.title || 'Details'}
        description={
          previewItem?.kind === 'media' ? 'Media asset' : previewItem?.kind === 'contract' ? 'Legal contract' : previewItem?.kind === 'document' ? 'Legal document' : ''
        }
      >
        {previewItem?.kind === 'media' ? (
          <div className="space-y-3">
            {!previewImageFailed && (previewItem.previewUrl || previewItem.storageUrl || previewItem.thumbnailUrl) ? (
              <img
                src={previewItem.previewUrl || previewItem.storageUrl || previewItem.thumbnailUrl}
                alt=""
                onError={() => setPreviewImageFailed(true)}
                className="max-h-80 w-full rounded-xl border border-neutral-200 bg-neutral-50 object-contain dark:border-neutral-800 dark:bg-neutral-800/60"
              />
            ) : (
              <div className="flex h-32 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-neutral-200 text-neutral-400 dark:border-neutral-700">
                <span className="material-symbols-outlined text-[24px]">image_not_supported</span>
                <p className="text-xs">No preview available for this file.</p>
              </div>
            )}
            {previewItem.description ? <p className="text-sm text-neutral-600 dark:text-neutral-300">{previewItem.description}</p> : null}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <DetailRow label="Section" value={MEDIA_SECTION_LABELS[previewItem.section] || previewItem.section} />
              <DetailRow label="Status" value={previewItem.status} />
              <DetailRow label="Last updated" value={formatDate(previewItem.updatedAt)} />
            </div>
          </div>
        ) : previewItem?.kind === 'contract' ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            <DetailRow label="Status" value={previewItem.status} />
            <DetailRow label="Approval status" value={previewItem.approvalStatus} />
            <DetailRow label="Owner department" value={previewItem.ownerDepartment} />
            <DetailRow label="Expiry date" value={formatDate(previewItem.expiryDate)} />
            <DetailRow label="Last updated" value={formatDate(previewItem.updatedAt)} />
          </div>
        ) : previewItem?.kind === 'document' ? (
          <div className="space-y-3">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <DetailRow label="Type" value={previewItem.type} />
              <DetailRow label="Status" value={previewItem.status} />
              <DetailRow label="Priority" value={previewItem.priority} />
              <DetailRow label="Owner" value={previewItem.owner} />
              <DetailRow label="Version" value={previewItem.currentVersion} />
              <DetailRow label="Last updated" value={formatDate(previewItem.updatedAt)} />
            </div>
            {previewItem.latestContent ? (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Content</p>
                <p className="max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
                  {previewItem.latestContent}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
