import React, { useState } from 'react';
import KPICard from '../../common/KPICard';
import { INPUT, timestamp } from './config';
import { Action, Badge, DataTable, Empty, Icon, Panel } from './ManagementUI';

export function ProjectDirectory({ registry, project, chooseProject, busy }) {
  const [search, setSearch] = useState('');
  const projects = registry.projects.filter(item => (!project || project._id === item._id) && `${item.name} ${item.projectCode || ''}`.toLowerCase().includes(search.toLowerCase()));
  return <Panel title={project ? 'Project API' : 'Project APIs'} description="Each project owns its provider configuration, endpoints and portal permissions." icon="folder_open" action={!project && <div className="relative w-full sm:w-60"><span className="pointer-events-none absolute left-3 top-3 text-neutral-400"><Icon name="search" /></span><input aria-label="Search projects" type="search" className={`${INPUT} pl-10`} placeholder="Search projects…" value={search} onChange={event => setSearch(event.target.value)} /></div>}>
    {!projects.length ? <Empty title={search ? 'No matching projects' : 'No projects available'} description={search ? 'Try a different project name or code.' : 'Create a project in Projects before registering its API.'} /> : <div className="grid gap-4 xl:grid-cols-2">{projects.map(item => {
      const api = registry.apis.find(row => row.projectId === item._id);
      const integrations = (registry.existingIntegrations || []).filter(row => row.projectId === item._id && (row.present || row.imported));
      const endpoints = registry.endpoints.filter(row => row.apiId === api?._id);
      const connections = registry.connections.filter(row => row.apiId === api?._id);
      return <article key={item._id} className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent-soft)] font-bold text-[var(--portal-accent)]">{item.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><h3 className="break-words text-sm font-bold">{item.name}</h3><p className="mt-0.5 text-xs text-neutral-500">{item.projectCode || 'Project workspace'}</p></div></div><Badge tone={api?.enabled ? 'info' : 'neutral'}>{api ? (api.enabled ? 'Provider enabled' : 'Provider disabled') : 'Gateway not registered'}</Badge></div>
        <div className="my-4 min-h-12 space-y-1"><p className="truncate text-xs text-neutral-500" title={api?.baseUrl}>{api?.baseUrl || 'Provider URL not configured'}</p><p className="text-xs text-neutral-600 dark:text-neutral-400">{integrations.length ? `${integrations.length} existing integration${integrations.length === 1 ? '' : 's'} available` : 'No existing integration settings found'}</p></div>
        <div className="mb-4 grid grid-cols-3 gap-2 border-y border-neutral-100 py-3 text-xs dark:border-neutral-800">{[[endpoints.length, 'Endpoints'], [endpoints.filter(row => row.shared).length, 'Shared'], [connections.filter(row => row.status === 'Connected').length, 'Active portals']].map(([count, label]) => <div key={label}><strong className="block text-base">{count}</strong><span className="text-neutral-500">{label}</span></div>)}</div>
        <div className="mt-auto flex items-center justify-between gap-2"><span className="text-xs text-neutral-400">{api?.lastFetchedAt ? `Fetched ${timestamp(api.lastFetchedAt)}` : 'No fetch recorded'}</span><Action disabled={busy} icon="arrow_forward" onClick={() => chooseProject(item._id)}>{project ? 'Open configuration' : 'Manage API'}</Action></div>
      </article>;
    })}</div>}
  </Panel>;
}

export function Overview({ registry, state, project, api, chooseProject, navigateSection, busy }) {
  const active = state.connections.filter(item => item.status === 'Connected').length;
  const failures = state.events.filter(item => item.kind === 'request' && item.status >= 400).length;
  return <>
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KPICard title="Project APIs" value={state.apis.length} icon="api" variant="minimal" context={project ? project.name : 'Registered gateway identities'} />
      <KPICard title="Shared endpoints" value={state.endpoints.filter(item => item.shared).length} icon="share" variant="minimal" context="Explicit sharing policies" />
      <KPICard title="Active connections" value={active} icon="hub" tone="success" variant="minimal" context="Tested and activated" />
      <KPICard title="Recent failures" value={failures} icon="error_outline" tone={failures ? 'danger' : 'neutral'} variant="minimal" context="Within the latest 100 events" />
    </div>
    {project && <Panel title="Connection setup" icon="checklist" description="Complete these steps to share this project's approved data.">
      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Configure provider', Boolean(api?.baseUrl && api?.credentialConfigured), 'API Configuration'],
        ['Approve shared data', state.endpoints.some(item => item.shared), 'Project Data Sharing'],
        ['Map a portal', state.connections.length > 0, 'Connection Configuration'],
        ['Test and activate', active > 0, 'Portal API Mapping'],
      ].map(([label, complete, destination], index) => <li key={label}><button onClick={() => navigateSection(destination)} className="flex min-h-16 w-full items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>{complete ? <Icon name="check" /> : index + 1}</span><span className="text-xs font-semibold">{label}</span></button></li>)}</ol>
    </Panel>}
    <ProjectDirectory registry={registry} project={project} chooseProject={chooseProject} busy={busy} />
    <Panel title="Recent activity" description="Configuration changes and gateway outcomes for this workspace." icon="history" action={<Action onClick={() => navigateSection('Audit History')} disabled={!project}>View audit history</Action>}>
      <DataTable columns={['Activity', 'Result', 'Time']} rows={state.events.slice(0, 6).map(event => ({ key: event._id, cells: [event.action?.replaceAll('.', ' / '), event.status ? <Badge tone={event.status >= 400 ? 'danger' : event.status === 200 ? 'success' : 'neutral'}>{event.status}</Badge> : <Badge>Configuration</Badge>, timestamp(event.createdAt)] }))} emptyTitle="Activity will appear here" emptyDescription="Register an API or test a connection to start recording activity." />
    </Panel>
  </>;
}
