import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildProjectSlugMap } from '../../config/projectNames';

const ACCENTS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];

const statusTone = (status = '') => {
  const v = String(status).toLowerCase();
  if (v.includes('active') || v.includes('progress') || v.includes('track')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (v.includes('hold') || v.includes('paused')) return 'border-amber-300 bg-amber-50 text-amber-700';
  if (v.includes('complete') || v.includes('closed')) return 'border-slate-300 bg-slate-50 text-slate-600';
  return 'border-teal-300 bg-teal-50 text-teal-700';
};

const MediaProjectList = ({ projects = [] }) => {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {projects.map((project, index) => (
        <button
          key={project.value}
          type="button"
          onClick={() => navigate(`/media/dashboard/projects/${slugMap.get(project.value) || project.value}`)}
          className="group flex flex-col rounded-[1.75rem] border border-slate-200 bg-white p-5 text-left shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-[0_22px_60px_rgba(15,118,110,0.15)] dark:border-neutral-800 dark:bg-neutral-900"
        >
          <div className={`h-1.5 w-full rounded-full ${ACCENTS[index % ACCENTS.length]}`} />
          <div className="mt-3 flex items-start justify-between gap-2">
            <p className="truncate text-[16px] font-black text-slate-950 dark:text-neutral-100">{project.name}</p>
            {project.code ? (
              <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                {project.code}
              </span>
            ) : null}
          </div>
          <p className="mt-1 line-clamp-2 text-[13px] text-slate-500 dark:text-neutral-400">{project.description}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${statusTone(project.status)}`}>
              {project.status || 'active'}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-teal-700 transition group-hover:gap-1.5 dark:text-teal-400">
              View plan
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MediaProjectList;
