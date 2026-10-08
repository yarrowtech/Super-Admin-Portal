import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import PortalHeader from '../../common/PortalHeader';
import { statusToTone } from '../../../utils/statusTone';
import StatusBadge from '../../common/StatusBadge';

const SECTIONS = { asset: 'Assets', brand: 'Brand', content: 'Content', design: 'Design', video: 'Video', social: 'Social' };
const fieldClass = 'min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';
const safeFileUrl = value => /^https?:\/\//i.test(value || '') ? value : null;

export default function MediaHeadAssets() {
  const { token, user } = useAuth();
  const [projectId, setProjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [section, setSection] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [attention, setAttention] = useState('');
  const [page, setPage] = useState(1);
  const params = { page, limit: 24, ...(approvalStatus && { approvalStatus }), ...(attention && { attention }), ...(projectId && { projectId }), ...(userId && { userId }), ...(section && { section }), ...(search && { search }) };
  const query = useQuery({
    queryKey: ['mediaHead', 'assets', String(user?._id || user?.id || ''), params],
    queryFn: () => departmentApi.getMediaHeadAssets(token, params), enabled: Boolean(token),
    staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always', refetchInterval: 30000,
  });
  const data = query.data?.data || {};
  const { summary = {}, projects = [], contributors = [], items = [], pagination = {} } = data;
  const select = (setter, value) => { setter(value); setPage(1); };
  const selectedContributor = contributors.find(contributor => contributor.id === userId);

  return (
    <main className="portal-page">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader title="Digital Asset Management" subtitle="Review creative work by contributor and allocated project" icon="perm_media" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-neutral-500">{query.isFetching ? 'Updating?' : `Last refreshed ${query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString() : '?'}`} ? Refreshes every 30 seconds</span>
          <Link to="/media/dashboard/assets" className="rounded-xl border border-teal-200 px-4 py-2 font-semibold text-teal-700">Project Digital Libraries</Link>
          <Link to="/media/head/approvals" className="rounded-xl bg-teal-700 px-4 py-2 font-semibold text-white">Review approvals</Link>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Monitoring totals">
          {[['All work', 'total', '', ''], ['Pending review', 'pending', 'pending', ''], ['Approved', 'approved', 'approved', ''], ['Rejected', 'rejected', 'rejected', ''], ['Missing files', 'missingFile', '', 'missing-file'], ['No update in 7 days', 'stale', '', 'stale']].map(([label, key, status, flag]) => <button key={key} type="button" onClick={() => { setApprovalStatus(status); setAttention(flag); setPage(1); }} className={`rounded-xl border bg-white p-3 text-left dark:bg-neutral-900 ${approvalStatus === status && attention === flag ? 'border-teal-600' : 'border-neutral-200 dark:border-neutral-700'}`}>
            <span className="block text-xs text-neutral-500">{label}</span><span className="mt-1 block text-2xl font-bold">{summary[key] || 0}</span>
          </button>)}
        </div>
        <form onSubmit={event => { event.preventDefault(); select(setSearch, searchInput.trim()); }} className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <select aria-label="Project" className={fieldClass} value={projectId} onChange={event => select(setProjectId, event.target.value)}>
            <option value="">All projects</option>
            {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select aria-label="Contributor" className={fieldClass} value={userId} onChange={event => select(setUserId, event.target.value)}>
            <option value="">All contributors</option>
            {contributors.map(contributor => <option key={contributor.id} value={contributor.id}>{contributor.name}{contributor.active ? '' : ' (inactive)'}</option>)}
          </select>
          <select aria-label="Creative section" className={fieldClass} value={section} onChange={event => select(setSection, event.target.value)}>
            <option value="">All creative sections</option>
            {Object.entries(SECTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          <div className="flex min-w-0 gap-2">
            <input aria-label="Search assets" placeholder="Search titles…" className={`${fieldClass} w-full`} value={searchInput} onChange={event => setSearchInput(event.target.value)} />
            <button type="submit" className={fieldClass}>Search</button>
          </div>
          <button type="button" onClick={() => query.refetch()} className={fieldClass}>Refresh</button>
        </form>

        {approvalStatus || attention ? <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          <span>Showing {approvalStatus || (attention === 'missing-file' ? 'records without files' : 'unresolved records unchanged for 7 days')}. Totals cover the current project, contributor, section and search.</span>
          <button type="button" onClick={() => { setApprovalStatus(''); setAttention(''); setPage(1); }} className="underline">Clear attention filter</button>
        </div> : null}
        {query.isError ? <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">Could not load assets and allocations. {query.error?.message} <button type="button" onClick={() => query.refetch()} className="underline">Retry</button></div> : null}
        {query.isLoading ? <p role="status" className="py-8">Loading assets and allocations…</p> : query.isError ? null : <>
          <details open={Boolean(userId)} className="mb-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <summary className="cursor-pointer text-lg font-bold">Contributor allocations & workload ({contributors.length})</summary>
            <p className="mb-3 text-sm text-neutral-500">Current project access and records created or last updated{projectId ? ' for the selected project' : ' across all projects'}. Select a contributor to see their work.</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {contributors.filter(contributor => !userId || contributor.id === userId).map(contributor => <div key={contributor.id} className={`rounded-xl border p-3 ${userId === contributor.id ? 'border-teal-600' : 'border-neutral-200 dark:border-neutral-700'}`}>
                <button type="button" onClick={() => select(setUserId, contributor.id)} className="font-bold text-teal-700 dark:text-teal-300">{contributor.name}</button>
                <p className="text-xs text-neutral-500">{contributor.role?.replace(/_/g, ' ')}{contributor.active ? '' : ' · Inactive'} · {contributor.recordCount} creative records</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {contributor.allocatedProjects.length ? contributor.allocatedProjects.map(project => <button type="button" key={project.id} onClick={() => select(setProjectId, project.id)} className="rounded-lg bg-teal-50 px-2 py-1 text-xs text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">{project.name}</button>) : <span className="text-sm text-amber-700 dark:text-amber-300">No projects allocated</span>}
                </div>
                <Link to="/media/head/projects" className="mt-2 inline-block text-xs text-teal-700 underline dark:text-teal-300">Manage project allocations</Link>
              </div>)}
              {!contributors.length ? <p className="text-sm text-neutral-500">No contributors found.</p> : null}
            </div>
          </details>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{selectedContributor ? `${selectedContributor.name} — Creative work` : 'Creative work'} <span className="text-sm font-normal text-neutral-500">({pagination.total || 0})</span></h2>
            {userId ? <button type="button" onClick={() => select(setUserId, '')} className="text-sm text-teal-700 underline dark:text-teal-300">Show all contributors</button> : null}
          </div>
          {!items.length ? <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">No creative work matches these filters.</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(item => <article key={item._id} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase text-neutral-500">{SECTIONS[item.section] || item.section}</span><StatusBadge label={item.approvalStatus || item.status} tone={statusToTone(item.approvalStatus || item.status)} /></div>
              <h3 className="break-words text-lg font-bold">{item.title}</h3>
              <p className="mt-1 text-sm font-semibold text-teal-700 dark:text-teal-300">{item.projectName}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div><dt className="text-neutral-500">Created by</dt><dd>{item.creatorName}</dd></div>
                <div><dt className="text-neutral-500">Last updated by</dt><dd>{item.updatedBy ? item.updatedByName : item.creatorName}</dd></div>
                <div><dt className="text-neutral-500">Updated</dt><dd>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}</dd></div>
              </dl>
              {!item.creatorCurrentlyAllocated ? <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Creator has no current allocation to this project. Historical work is retained.</p> : null}
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-teal-700 dark:text-teal-300">
                {safeFileUrl(item.storageUrl) ? <a href={safeFileUrl(item.storageUrl)} target="_blank" rel="noreferrer">Open file</a> : <span className="font-normal text-neutral-500">No file attached</span>}
                {item.approvalStatus === 'pending' ? <Link to="/media/head/approvals">Review approval</Link> : null}
                {projects.some(project => project.id === item.projectId) ? <Link to={`/media/head/projects/${item.projectId}`}>Open project</Link> : null}
              </div>
            </article>)}
          </div>}
          <div className="mt-5 flex items-center justify-center gap-4 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${fieldClass} disabled:opacity-40`}>Previous</button>
            <span>Page {page} of {pagination.totalPages || 1}</span>
            <button type="button" disabled={page >= (pagination.totalPages || 1)} onClick={() => setPage(page + 1)} className={`${fieldClass} disabled:opacity-40`}>Next</button>
          </div>
        </>}
      </div>
    </main>
  );
}
