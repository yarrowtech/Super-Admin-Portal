import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';

const arr = (value) => (Array.isArray(value) ? value : []);

const SECTION_ICONS = {
  asset: 'perm_media', campaign: 'ads_click', content: 'article', brand: 'palette',
  design: 'brush', video: 'movie', social: 'share', advertisement: 'campaign',
  seo: 'search', website: 'language', testimonial: 'reviews', 'case-study': 'menu_book',
  approval: 'fact_check', report: 'summarize', archive: 'archive', dashboard: 'dashboard',
};

const sectionLabel = (key = '') => key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const MediaHeadTeamAnalytics = () => {
  const { token } = useAuth();
  const [expandedId, setExpandedId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.userWork(),
    queryFn: () => departmentApi.getMediaHeadUserWork(token),
    enabled: Boolean(token),
  });

  const users = arr(data?.data);
  const totalItems = users.reduce((sum, u) => sum + (u.totalItems || 0), 0);
  const totalPending = users.reduce((sum, u) => sum + (u.pendingApprovals || 0), 0);
  const totalPlanEdits = users.reduce((sum, u) => sum + (u.planEdits || 0), 0);
  // Plan edits count as real work — a user who has only edited a project's
  // marketing plan (no Media records yet) is still an active contributor.
  const activeContributors = users.filter((u) => u.totalItems > 0 || u.planEdits > 0).length;

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader title="Team Analytics" subtitle="Detailed breakdown of what each Media Marketing user has produced" icon="analytics" />

        <div className="mb-5 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Active Contributors" value={activeContributors} icon="groups" tone="accent" compact />
          <KPICard title="Total Work Items" value={totalItems} icon="perm_media" tone="info" compact />
          <KPICard title="Pending Approvals" value={totalPending} icon="fact_check" tone="warning" compact />
          <KPICard title="Plan Edits" value={totalPlanEdits} icon="edit_note" tone="success" compact />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">group_off</span>
            <p className="font-semibold text-neutral-600 dark:text-neutral-300">No Media Marketing users found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((u) => {
              const expanded = expandedId === u.id;
              const sections = Object.entries(u.bySection || {}).sort((a, b) => b[1] - a[1]);
              return (
                <div key={u.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? '' : u.id)}
                    aria-expanded={expanded}
                    aria-controls={`team-row-${u.id}`}
                    className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-sm font-bold text-[var(--portal-accent)]">
                        {initials(u.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{u.name}</p>
                        <p className="truncate text-xs text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span><strong className="text-neutral-800 dark:text-neutral-100">{u.totalItems}</strong> items</span>
                      <span><strong className="text-neutral-800 dark:text-neutral-100">{u.planEdits}</strong> plan edits</span>
                      {u.lastActivityAt && (
                        <span className="hidden md:inline">Last active {new Date(u.lastActivityAt).toLocaleDateString()}</span>
                      )}
                      {u.pendingApprovals > 0 && <StatusBadge tone="warning" label={`${u.pendingApprovals} pending`} />}
                      <span className="material-symbols-outlined text-neutral-400">{expanded ? 'expand_less' : 'expand_more'}</span>
                    </div>
                  </button>

                  {expanded && (
                    <div id={`team-row-${u.id}`} className="border-t border-neutral-100 p-4 dark:border-neutral-800">
                      {sections.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Work by type</p>
                          <div className="flex flex-wrap gap-2">
                            {sections.map(([section, count]) => (
                              <span
                                key={section}
                                className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                              >
                                <span className="material-symbols-outlined text-[14px]">{SECTION_ICONS[section] || 'description'}</span>
                                {sectionLabel(section)} · {count}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-lg bg-emerald-50 py-2 dark:bg-emerald-950/20">
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{u.approved}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Approved</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 py-2 dark:bg-amber-950/20">
                          <p className="text-lg font-black text-amber-600 dark:text-amber-400">{u.pendingApprovals}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Pending</p>
                        </div>
                        <div className="rounded-lg bg-rose-50 py-2 dark:bg-rose-950/20">
                          <p className="text-lg font-black text-rose-600 dark:text-rose-400">{u.rejected}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Rejected</p>
                        </div>
                      </div>

                      {u.recentPlanEdits?.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">
                            Plan edit history ({u.recentPlanEdits.length})
                          </p>
                          <div className="max-h-80 divide-y divide-neutral-100 overflow-y-auto dark:divide-neutral-800">
                            {u.recentPlanEdits.map((edit) => (
                              <div key={edit.id} className="py-2 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                                    Edited <span style={{ color: 'var(--portal-accent)' }}>{edit.projectName}</span> plan
                                  </p>
                                  <span className="shrink-0 text-neutral-400">{edit.time ? new Date(edit.time).toLocaleString() : ''}</span>
                                </div>
                                {edit.changedSections?.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {edit.changedSections.map((section) => (
                                      <span key={section} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                        {section}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Recent work</p>
                      {u.recentItems.length === 0 ? (
                        <p className="text-xs text-neutral-400">No work items recorded yet.</p>
                      ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {u.recentItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">{item.title}</p>
                                <p className="truncate text-neutral-400">{sectionLabel(item.section)} · {item.projectName || 'No project'}</p>
                              </div>
                              <span className="shrink-0 text-neutral-400">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

export default MediaHeadTeamAnalytics;
