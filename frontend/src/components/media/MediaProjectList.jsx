import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildProjectSlugMap } from '../../config/projectNames';
import { statusToTone } from '../../utils/statusTone';
import StatusBadge from '../common/StatusBadge';

const ACCENTS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];
const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

const MediaProjectList = ({ projects = [], onSelect }) => {
  const navigate = useNavigate();
  const slugMap = useMemo(() => buildProjectSlugMap(projects), [projects]);

  if (!projects.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900/60">
        <span className="material-symbols-outlined text-[32px] text-neutral-400">folder_off</span>
        <p className="mt-2 text-sm font-semibold text-neutral-500">No approved projects found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {projects.map((project, index) => {
        const accent = HEX_RE.test(project.themeColor || '') ? project.themeColor : ACCENTS[index % ACCENTS.length];
        return (
          <button
            key={project.value}
            type="button"
            onClick={() =>
              onSelect ? onSelect(project) : navigate(`/media/dashboard/projects/${slugMap.get(project.value) || project.value}`)
            }
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--portal-accent)]/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]/40 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="h-1.5 w-full rounded-full" style={{ background: accent }} />
            <div className="mt-3 flex items-start gap-3">
              {project.logo?.url ? (
                <img src={project.logo.url} alt={`${project.name} logo`} className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />
              ) : (
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[15px] font-black uppercase text-white shadow-sm"
                  style={{ background: accent }}
                >
                  {(project.name || '?').trim().charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-[16px] font-black text-slate-950 dark:text-neutral-100">{project.name}</p>
                  {project.code ? (
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                      {project.code}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-slate-500 dark:text-neutral-400">{project.description}</p>
              </div>
            </div>
            {Array.isArray(project.team) && project.team.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-neutral-800">
                {project.team.slice(0, 3).map((member, i) => (
                  <span
                    key={member.id || i}
                    title={member.role}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {member.name}
                    <span className="text-slate-400 dark:text-neutral-500">· {member.role}</span>
                  </span>
                ))}
                {project.team.length > 3 ? (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-neutral-500">+{project.team.length - 3} more</span>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between">
              <StatusBadge tone={statusToTone(project.status)} label={project.status || 'Active'} />
              <span className="inline-flex items-center gap-1 text-[12px] font-bold transition group-hover:gap-1.5" style={{ color: accent }}>
                View plan
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MediaProjectList;
