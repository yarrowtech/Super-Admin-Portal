import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';
import StatusBadge from '../common/StatusBadge';
import { statusToTone } from '../../utils/statusTone';
import LibraryEditor, { libraryButton, libraryField } from './LibraryEditor';
import LibraryDetail from './LibraryDetail';
import { LIBRARY_CATEGORIES, LIBRARY_WORKSPACES } from './libraryConfig';

const empty = { brand: 'No master brand assets configured yet.', social: 'No social content has been created for this project.', campaigns: 'No campaigns created yet.', creative: 'No creative assets uploaded yet.', marketing: 'No marketing material created yet.', content: 'No content has been written yet.', documents: 'No documents added yet.', archive: 'No archived material found.' };
const actions = { brand: 'Add Brand Asset', creative: 'Upload Asset', marketing: 'Create Marketing Content', social: 'Create Social Content', content: 'Create Content', campaigns: 'Create Campaign', documents: 'Upload Document' };
const url = value => /^https?:\/\//i.test(value || '') ? value : null;
const date = value => value ? new Date(value).toLocaleDateString() : '—';
const icons = Object.fromEntries(LIBRARY_CATEGORIES.map(([key, , icon]) => [key, icon]));

export default function DigitalLibrary({ onProjectChange }) {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient(), debounce = useRef(null), searchInput = useRef(null);
  const [editor, setEditor] = useState(null);
  const projectId = params.get('project') || '', kind = params.get('category') || '', workspace = params.get('workspace') || '', itemId = params.get('item') || '';
  const isOverview = !kind && !workspace && !params.get('search') && !params.get('relatedTo');
  const canManage = ['media_marketing', 'media_head', 'admin', 'super_admin'].includes(user?.role);
  const canApprove = ['media_head', 'admin', 'super_admin', 'ceo'].includes(user?.role);
  const identity = String(user?._id || user?.id || '');
  const overview = useQuery({ queryKey: ['media', 'library', 'overview', identity], queryFn: () => departmentApi.getMediaLibraryOverview(token), enabled: !!token, staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always' });
  const data = overview.data?.data || {}, projects = data.projects || [], categories = data.categories || [];
  const project = projects.find(project => project.id === projectId);
  const projectScope = useQuery({ queryKey: ['media', 'library', 'scope', identity, projectId], queryFn: () => departmentApi.getMediaLibraryOverview(token, { projectId }), enabled: !!token && !!project, staleTime: 0 });
  const owners = projectId ? projectScope.data?.data?.owners || [] : data.owners || [];
  const totals = project ? { ...project.counts, total: project.total, pending: project.pending } : data.totals || {};
  const searchValue = params.get('search') || '';
  useEffect(() => { if (searchInput.current) searchInput.current.value = searchValue; }, [searchValue]);
  useEffect(() => () => clearTimeout(debounce.current), [projectId, kind, workspace]);
  const navigate = (changes, replace = false) => {
    setParams(current => {
      const next = new URLSearchParams(current);
      Object.entries(changes).forEach(([key, value]) => value ? next.set(key, String(value)) : next.delete(key));
      if (!Object.hasOwn(changes, 'page')) next.delete('page');
      return next;
    }, { replace });
  };
  const chooseProject = id => {
    clearTimeout(debounce.current);
    setParams(id ? { project: id } : {}); onProjectChange?.(id);
  };
  const listParams = { ...(projectId && { projectId }), ...(kind && { kind }), ...(workspace && { workspace }), page: Number(params.get('page')) || 1, limit: 24,
    ...Object.fromEntries(['search', 'subcategory', 'assetType', 'platform', 'campaignId', 'status', 'approvalStatus', 'ownerId', 'tag', 'dateFrom', 'dateTo', 'sort', 'relatedTo'].filter(key => params.get(key)).map(key => [key, params.get(key)])),
  };
  if (params.get('calendar') && kind === 'social') listParams.sort = 'calendar';
  const records = useQuery({ queryKey: ['media', 'library', 'items', identity, listParams], queryFn: () => departmentApi.getMediaLibraryItems(token, listParams), enabled: !!token && !isOverview && (!projectId || !!project), staleTime: 0 });
  const recent = useQuery({ queryKey: ['media', 'library', 'recent', identity, projectId], queryFn: () => departmentApi.getMediaLibraryItems(token, { ...(projectId && { projectId }), limit: 6 }), enabled: !!token && isOverview && !!project, staleTime: 0 });
  const pending = useQuery({ queryKey: ['media', 'library', 'pending', identity, projectId], queryFn: () => departmentApi.getMediaLibraryItems(token, { projectId, workspace: 'approvals', limit: 6 }), enabled: !!token && isOverview && !!project, staleTime: 0 });
  const category = categories.find(category => category.key === kind);
  const sectionLabel = category?.label || LIBRARY_WORKSPACES.find(([key]) => key === workspace)?.[1] || (params.get('relatedTo') ? 'Related Material' : searchValue ? 'Search Results' : params.get('view') === 'projects' ? 'All Projects' : 'Overview');
  const filterKeys = ['subcategory', 'assetType', 'platform', 'campaignId', 'status', 'approvalStatus', 'ownerId', 'tag', 'dateFrom', 'dateTo'];
  const activeFilterCount = filterKeys.filter(key => params.get(key)).length;
  const primaryKind = actions[kind] ? kind : 'creative';
  const campaignQuery = useQuery({ queryKey: ['media', 'library', 'campaign-filter', identity, projectId], queryFn: () => departmentApi.getMediaLibraryItems(token, { ...(projectId && { projectId }), kind: 'campaigns', limit: 100 }), enabled: !!token && !isOverview && (!projectId || !!project) });
  const changed = () => { client.invalidateQueries({ queryKey: ['media', 'library'] }); client.invalidateQueries({ queryKey: ['mediaHead'] }); };
  const openCategory = key => navigate({ category: key, workspace: '', item: '', subcategory: '', platform: '', search: '', campaignId: '', relatedTo: '' });
  const openItem = id => navigate({ item: id });
  const openCreate = key => { if (project && canManage) setEditor({ kind: key || 'creative', project }); };
  const listView = params.get('view') === 'list';
  const renderCards = (items, compact = false) => <div className={listView && !compact ? 'space-y-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>{items.map(item => <button type="button" key={item._id} onClick={() => openItem(item._id)} className={`group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-teal-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${listView && !compact ? 'flex items-center gap-4 p-3' : ''}`}>
    {listView && !compact ? <span className="material-symbols-outlined text-teal-700">{icons[item.libraryKind] || 'description'}</span> : <div className="flex h-36 items-center justify-center bg-slate-50 dark:bg-neutral-950">{url(item.thumbnailUrl || item.storageUrl) && item.mimeType?.startsWith('image/') ? <img loading="lazy" className="h-full w-full object-contain p-3" src={url(item.thumbnailUrl) || url(item.storageUrl)} alt={item.title} /> : <span className="material-symbols-outlined text-4xl text-teal-700">{icons[item.libraryKind] || 'description'}</span>}</div>}
    <div className={`min-w-0 flex-1 ${listView && !compact ? '' : 'p-4'}`}><div className="flex flex-wrap items-center gap-2">{item.isMaster || item.libraryKind === 'brand' ? <span className="rounded bg-teal-800 px-2 py-1 text-[10px] font-bold text-white">MASTER</span> : null}<StatusBadge label={item.status} tone={statusToTone(item.status)} /></div><h3 className="mt-2 break-words font-bold text-slate-950 dark:text-white">{item.title}</h3><p className="mt-1 text-xs text-slate-500">{item.projectName} · {item.subcategory || item.libraryKind}</p><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>{item.ownerName}</span><span>{item.version?.current || 'v1.0'} · {date(item.updatedAt)}</span></div>{item.libraryKind === 'social' ? <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.social?.platform || item.metadata?.platform} · {item.social?.caption || item.metadata?.caption}</p> : null}{item.approvalStatus === 'approved' && item.libraryKind === 'brand' ? <p className="mt-2 text-xs font-bold text-teal-700">APPROVED · CURRENT VERSION</p> : null}</div>
  </button>)}</div>;

  return <main className="portal-page"><div className="portal-page-inner portal-page-inner--media">
    <PortalHeader title="Digital Asset Management" subtitle="Project digital memory · Brand, creative, campaigns and content" icon="local_library" />
    <nav aria-label="Library breadcrumb" className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-500">
      <button type="button" className="hover:text-teal-700" onClick={() => chooseProject('')}>Digital Library</button>
      <span aria-hidden="true">/</span><span>{project?.name || 'All Projects'}</span>
      <span aria-hidden="true">/</span><span aria-current="page" className="font-semibold text-teal-700">{sectionLabel}</span>
    </nav>
    <section className="mb-5 rounded-2xl border border-teal-200 bg-white p-4 dark:border-teal-900 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-3">{url(project?.logo?.url) ? <img src={url(project.logo.url)} alt="Project logo" className="h-14 w-14 rounded-xl object-contain" /> : <span className="material-symbols-outlined rounded-xl bg-teal-50 p-3 text-teal-700">folder_copy</span>}<div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">{project ? 'Project Digital Library' : 'All Projects'}</p><h2 className="text-2xl font-bold">{project?.name || 'Digital Libraries'}</h2><p className="mt-1 max-w-xl text-sm text-slate-500">{project?.description || 'Choose a project to explore its digital material and create new work.'}</p></div></div>
        <label className="min-w-52 text-xs font-bold uppercase tracking-wide text-slate-500">Project<select aria-label="Library project" className={libraryField} value={projectId} onChange={event => chooseProject(event.target.value)}><option value="">All Projects</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label></div>
      <div className="mt-4 flex flex-wrap items-start gap-2"><button className={libraryButton} onClick={() => navigate({ category: '', workspace: '', item: '', search: '', campaignId: '', relatedTo: '', view: '' })}>Library Overview</button>{canManage ? <>
        <button type="button" className={`${libraryButton} bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200`} disabled={!project} onClick={() => openCreate(primaryKind)}>{actions[primaryKind]}</button>
        <details className="relative"><summary className={`${libraryButton} cursor-pointer`}>More creation options</summary><div className="absolute right-0 z-20 mt-2 grid w-64 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">{Object.keys(actions).filter(key => key !== primaryKind).map(key => <button key={key} type="button" className={`${libraryButton} text-left`} disabled={!project} onClick={event => { event.currentTarget.closest('details').open = false; openCreate(key); }}>{actions[key]}</button>)}</div></details>
      </> : null}<button className={`${libraryButton} ml-auto`} onClick={changed}>Refresh</button></div>
      {!project && canManage ? <p className="mt-3 text-xs text-slate-500">Select an allocated project before creating or uploading material.</p> : null}
    </section>
    {overview.isError ? <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{overview.error.message}<button className={libraryButton} onClick={() => overview.refetch()}>Retry</button></div> : overview.isLoading ? <div role="status" className="h-48 animate-pulse rounded-xl bg-slate-100">Loading project libraries…</div> : projectId && !project ? <div role="alert" className="rounded-xl border p-6">This project is not allocated to your account. <button className={libraryButton} onClick={() => chooseProject('')}>All Projects</button></div> : <>
      <form className="mb-5 flex gap-2" onSubmit={event => { event.preventDefault(); const input = event.currentTarget.elements.search.value; navigate({ search: input, item: '' }); }}><input ref={searchInput} name="search" aria-label="Search project library" className={`${libraryField} mt-0`} placeholder="Search project library…" defaultValue={params.get('search') || ''} onChange={event => { clearTimeout(debounce.current); const value = event.target.value; debounce.current = setTimeout(() => navigate({ search: value, item: '' }, true), 350); }} /><button className={libraryButton}>Search</button></form>
      {isOverview ? <>
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Projects', project ? 1 : projects.length], ['Total Library Items', totals.total || 0], ['Brand Assets', totals.brand || 0], ['Creative Assets', totals.creative || 0], ['Social Content', totals.social || 0], ['Campaigns', totals.campaigns || 0], ['Content & Documents', (totals.content || 0) + (totals.documents || 0)], ['Pending Approval', totals.pending || 0]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
        {!project ? <section><h2 className="mb-4 text-lg font-bold">Project Libraries</h2>{projects.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{projects.map(project => <button key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-teal-500 dark:border-neutral-800 dark:bg-neutral-900" onClick={() => chooseProject(project.id)}><h3 className="text-lg font-bold">{project.name}</h3><p className="mt-2 text-sm text-slate-500">{project.total} library items · {project.counts.campaigns} campaigns · {project.counts.social} social content</p><p className="mt-3 text-sm font-bold text-teal-700">Open Digital Library →</p></button>)}</div> : <div className="rounded-xl border border-dashed p-8 text-center"><h3 className="font-bold">No projects allocated to this account.</h3><p className="mt-2 text-sm text-slate-500">Ask Media Head to allocate projects to your signed-in account.</p><button className={`${libraryButton} mt-4`} onClick={() => overview.refetch()}>Refresh projects</button></div>}</section> : <>
          <h2 className="mb-4 text-lg font-bold">Library</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{categories.map(category => <button key={category.key} onClick={() => openCategory(category.key)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-teal-500 dark:border-neutral-800 dark:bg-neutral-900"><span className="material-symbols-outlined text-teal-700">{icons[category.key]}</span><h3 className="mt-2 font-bold">{category.label}</h3><p className="mt-1 text-xs text-slate-500">{category.description}</p><p className="mt-3 text-sm font-bold">{project.counts[category.key] || 0} items · Open →</p></button>)}</div>
          <section className="mt-7"><h2 className="mb-4 text-lg font-bold">Recently Updated</h2>{recent.isLoading ? <p>Loading recent work…</p> : recent.isError ? <p role="alert">{recent.error.message}</p> : recent.data?.data?.items.length ? renderCards(recent.data.data.items, true) : <p className="text-sm text-slate-500">Start this project’s library by adding its brand foundation or first creative.</p>}</section>
          <section className="mt-7"><div className="mb-4 flex justify-between"><h2 className="text-lg font-bold">Pending Approval</h2><button className={libraryButton} onClick={() => navigate({ workspace: 'approvals', category: '' })}>View All</button></div>{pending.isError ? <p role="alert">{pending.error.message}</p> : pending.data?.data?.items.length ? renderCards(pending.data.data.items, true) : <p className="text-sm text-slate-500">No material waiting for review.</p>}</section>
        </>}
      </> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">{project?.name || 'All Projects'} / {category?.label || LIBRARY_WORKSPACES.find(([key]) => key === workspace)?.[1] || (params.get('relatedTo') ? 'Related Material' : 'Search Results')}</h2><div className="flex gap-2"><button className={libraryButton} onClick={() => navigate({ view: '' })}>Grid</button><button className={libraryButton} onClick={() => navigate({ view: 'list' })}>List</button>{kind === 'social' ? <button className={libraryButton} onClick={() => navigate({ calendar: params.get('calendar') ? '' : '1' })}>Social Calendar</button> : null}</div></div>
        {category?.description ? <p className="mb-4 text-sm text-slate-500">{category.description}</p> : null}
        <details key={`${projectId}:${kind}:${workspace}`} open={activeFilterCount > 0 || undefined} className="mb-5 rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <summary className="cursor-pointer text-sm font-semibold">Filters{activeFilterCount ? ` (${activeFilterCount} active)` : ''}</summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs text-slate-500">{kind === 'social' ? 'Platform' : 'Subcategory'}<select className={libraryField} value={params.get(kind === 'social' ? 'platform' : 'subcategory') || ''} onChange={event => navigate(kind === 'social' ? { platform: event.target.value } : { subcategory: event.target.value })}><option value="">All subcategories</option>{category?.subcategories.map(value => <option key={value}>{value}</option>)}</select></label>
          <label className="text-xs text-slate-500">Campaign<select className={libraryField} value={params.get('campaignId') || ''} onChange={event => navigate({ campaignId: event.target.value })}><option value="">All campaigns</option>{campaignQuery.data?.data?.items.map(item => <option key={item._id} value={item._id}>{item.title}</option>)}</select></label>
          <label className="text-xs text-slate-500">Status<select className={libraryField} value={params.get('status') || ''} onChange={event => navigate({ status: event.target.value })}><option value="">All statuses</option>{['Draft', 'In Review', 'Approved', 'Scheduled', 'Published', 'Rejected', 'Archived'].map(status => <option key={status}>{status}</option>)}</select></label>
          <label className="text-xs text-slate-500">Owner<select className={libraryField} value={params.get('ownerId') || ''} onChange={event => navigate({ ownerId: event.target.value })}><option value="">All owners</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.name}</option>)}</select></label>
          <label className="text-xs text-slate-500">Tag<input className={libraryField} defaultValue={params.get('tag') || ''} key={`tag:${params.get('tag')}`} onBlur={event => navigate({ tag: event.target.value.replace(/^#/, '') })} placeholder="Filter tag" /></label>
          <label className="text-xs text-slate-500">Asset type<input className={libraryField} defaultValue={params.get('assetType') || ''} key={`type:${params.get('assetType')}`} onBlur={event => navigate({ assetType: event.target.value })} placeholder="e.g. Video" /></label>
          <label className="text-xs text-slate-500">Updated from<input className={libraryField} type="date" value={params.get('dateFrom') || ''} onChange={event => navigate({ dateFrom: event.target.value })} /></label>
          <label className="text-xs text-slate-500">Updated to<input className={libraryField} type="date" value={params.get('dateTo') || ''} onChange={event => navigate({ dateTo: event.target.value })} /></label>
          </div>
          {activeFilterCount ? <button type="button" className={`${libraryButton} mt-3`} onClick={() => navigate(Object.fromEntries(filterKeys.map(key => [key, ''])))}>Clear filters</button> : null}
        </details>
        {records.isLoading ? <p role="status" className="py-8">Loading project material…</p> : records.isError ? <div role="alert" className="rounded-xl border p-6">{records.error.message}<button className={libraryButton} onClick={() => records.refetch()}>Retry</button></div> : records.data?.data?.items.length ? params.get('calendar') && kind === 'social' ? <div className="space-y-3">{records.data.data.items.map(item => <button key={item._id} onClick={() => openItem(item._id)} className={`${libraryButton} flex w-full flex-wrap items-center justify-between gap-2 text-left`}><span>{date(item.social?.scheduledAt || item.publishAt)} · {item.title}</span><span>{item.social?.platform} · {item.status}</span></button>)}</div> : renderCards(records.data.data.items) : <div className="rounded-2xl border border-dashed p-8 text-center"><p className="font-semibold">{params.get('search') || [...params.keys()].some(key => ['status', 'tag', 'ownerId', 'campaignId', 'subcategory', 'dateFrom', 'dateTo', 'assetType'].includes(key)) ? 'No material matches these filters.' : empty[kind] || 'No material found in this workspace.'}</p>{project && actions[kind] && canManage ? <button className={`${libraryButton} mt-4`} onClick={() => openCreate(kind)}>{actions[kind]}</button> : null}</div>}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm"><button disabled={(records.data?.data?.pagination.page || 1) <= 1} className={libraryButton} onClick={() => navigate({ page: Number(params.get('page') || 1) - 1 })}>Previous</button><span>{records.data?.data?.pagination.total || 0} items · Page {records.data?.data?.pagination.page || 1} of {records.data?.data?.pagination.totalPages || 1}</span><button disabled={(records.data?.data?.pagination.page || 1) >= (records.data?.data?.pagination.totalPages || 1)} className={libraryButton} onClick={() => navigate({ page: Number(params.get('page') || 1) + 1 })}>Next</button></div>
      </>}
    </>}
    {editor ? <LibraryEditor token={token} project={editor.project} categories={categories} owners={owners} tags={projectScope.data?.data?.tags || data.tags || []} initialKind={editor.kind} record={editor.record} onClose={() => setEditor(null)} onSaved={changed} /> : null}
    {itemId && !editor ? <LibraryDetail key={itemId} identity={identity} token={token} id={itemId} owners={owners} canManage={canManage} canApprove={canApprove} onClose={() => navigate({ item: '' })} onNavigateItem={openItem} onRelated={record => navigate({ project: record.projectId, relatedTo: record._id, category: '', workspace: 'recent', item: '' })} onChanged={changed} onEdit={record => setEditor({ project: projects.find(project => project.id === record.projectId), kind: record.libraryKind, record })} /> : null}
  </div></main>;
}
