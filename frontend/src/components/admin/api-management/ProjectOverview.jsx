import React, { useState } from 'react';
import KPICard from '../../common/KPICard';
import { INPUT, timestamp } from './config';
import { Action, Badge, DataTable, Empty, Icon, Panel } from './ManagementUI';

const DIRECTORY_FILTERS = [['all', 'All'], ['registered', 'Registered'], ['unregistered', 'Not registered']];

export function ProjectDirectory({ registry, project, chooseProject, busy }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const term = search.trim().toLowerCase();
  const projects = registry.projects.filter(item => {
    if (project && project._id !== item._id) return false;
    if (term && !`${item.name} ${item.projectCode || ''}`.toLowerCase().includes(term)) return false;
    if (status === 'all') return true;
    const registered = registry.apis.some(row => row.projectId === item._id);
    return status === 'registered' ? registered : !registered;
  });
  const filtered = Boolean(term) || status !== 'all';
  return <Panel title={project ? 'Project API' : 'Project APIs'} description="Each project owns its provider configuration, endpoints and portal permissions." icon="folder_open" action={!project && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
    <div className="inline-flex shrink-0 rounded-xl bg-neutral-100 p-0.5 dark:bg-neutral-800" role="group" aria-label="Filter projects by registration">
      {DIRECTORY_FILTERS.map(([value, label]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)}
        className={`rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-1 ${status === value ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-neutral-100' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>{label}</button>)}
    </div>
    <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none"><span className="pointer-events-none absolute left-3 top-3 text-neutral-400"><Icon name="search" /></span><input aria-label="Search projects" type="search" className={`${INPUT} pl-10`} placeholder="Search projects…" value={search} onChange={event => setSearch(event.target.value)} /></div>
  </div>}>
    {!projects.length ? <Empty title={filtered ? 'No matching projects' : 'No projects available'} description={filtered ? 'Try a different project name, code or filter.' : 'Create a project in Projects before registering its API.'} action={filtered ? <Action icon="filter_alt_off" onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</Action> : undefined} /> : <div className="grid gap-4 xl:grid-cols-2">{projects.map(item => {
      const api = registry.apis.find(row => row.projectId === item._id);
      const integrations = (registry.existingIntegrations || []).filter(row => row.projectId === item._id && (row.present || row.imported));
      const endpoints = registry.endpoints.filter(row => row.apiId === api?._id);
      const connections = registry.connections.filter(row => row.apiId === api?._id);
      return <article key={item._id} className="flex min-w-0 flex-col rounded-2xl border border-neutral-200 p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-600">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent-soft)] font-bold text-[var(--portal-accent)]">{item.name.slice(0, 2).toUpperCase()}</span><div className="min-w-0"><h3 className="break-words text-sm font-bold">{item.name}</h3><p className="mt-0.5 text-xs text-neutral-500">{item.projectCode || 'Project workspace'}</p></div></div><Badge tone={api?.enabled ? 'info' : 'neutral'}>{api ? (api.enabled ? 'Provider enabled' : 'Provider disabled') : 'Gateway not registered'}</Badge></div>
        <div className="my-4 min-h-12 space-y-1"><p className="truncate text-xs text-neutral-500" title={api?.baseUrl}>{api?.baseUrl || 'Provider URL not configured'}</p><p className="text-xs text-neutral-600 dark:text-neutral-400">{integrations.length ? `${integrations.length} existing integration${integrations.length === 1 ? '' : 's'} available` : 'No existing integration settings found'}</p></div>
        <div className="mb-4 grid grid-cols-3 gap-2 border-y border-neutral-100 py-3 text-xs dark:border-neutral-800">{[[endpoints.length, 'Endpoints'], [endpoints.filter(row => row.shared).length, 'Shared'], [connections.filter(row => row.status === 'Connected').length, 'Active portals']].map(([count, label]) => <div key={label}><strong className={`block text-base tabular-nums ${count ? '' : 'text-neutral-300 dark:text-neutral-600'}`}>{count}</strong><span className="text-neutral-500">{label}</span></div>)}</div>
        <div className="mt-auto flex items-center justify-between gap-2"><span className="text-xs text-neutral-400">{api?.lastFetchedAt ? `Fetched ${timestamp(api.lastFetchedAt)}` : 'No fetch recorded'}</span><Action disabled={busy} icon="arrow_forward" onClick={() => chooseProject(item._id)}>{project ? 'Open configuration' : 'Manage API'}</Action></div>
      </article>;
    })}</div>}
  </Panel>;
}

function SetupChecklist({ api, state, active, navigateSection, busy }) {
  const steps = [
    ['Configure provider', Boolean(api?.baseUrl && api?.credentialConfigured), 'API Configuration', 'Set the provider URL and credential.'],
    ['Approve shared data', state.endpoints.some(item => item.shared), 'Project Data Sharing', 'Choose the datasets and fields to expose.'],
    ['Map a portal', state.connections.length > 0, 'Connection Configuration', 'Point a portal client at this project.'],
    ['Test and activate', active > 0, 'Portal API Mapping', 'Verify the mapping, then switch it live.'],
  ];
  const done = steps.filter(([, complete]) => complete).length;
  const nextStep = steps.findIndex(([, complete]) => !complete);
  const finished = nextStep === -1;
  return <Panel title="Connection setup" icon={finished ? 'task_alt' : 'checklist'}
    description={finished ? 'This project is configured and sharing approved data.' : `Next: ${steps[nextStep][0].toLowerCase()}. ${steps[nextStep][3]}`}
    action={<Badge tone={finished ? 'success' : 'info'}>{done} of {steps.length} complete</Badge>}>
    <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Connection setup progress">
      <div className={`h-full rounded-full transition-[width] duration-500 ${finished ? 'bg-emerald-500' : 'bg-[var(--portal-accent)]'}`} style={{ width: `${(done / steps.length) * 100}%` }} />
    </div>
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{steps.map(([label, complete, destination, hint], index) => {
      const isNext = index === nextStep;
      return <li key={label}>
        <button type="button" disabled={busy} onClick={() => navigateSection(destination)}
          className={`flex min-h-20 w-full flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${isNext ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800'}`}>
          <span className="flex w-full items-center gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : isNext ? 'bg-[var(--portal-accent)] text-white' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>{complete ? <Icon name="check" /> : index + 1}</span>
            <span className={`min-w-0 flex-1 text-xs font-semibold ${isNext ? 'text-[var(--portal-accent)]' : ''}`}>{label}</span>
            {isNext && <Icon name="arrow_forward" className="shrink-0 text-[16px] text-[var(--portal-accent)]" />}
          </span>
          <span className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">{complete ? 'Done' : hint}</span>
        </button>
      </li>;
    })}</ol>
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
      <KPICard title="Recent failures" value={failures} icon="error" tone={failures ? 'danger' : 'neutral'} variant="minimal" context="Within the latest 100 events" />
    </div>
    {project && <SetupChecklist api={api} state={state} active={active} navigateSection={navigateSection} busy={busy} />}
    <ProjectDirectory registry={registry} project={project} chooseProject={chooseProject} busy={busy} />
    <Panel title="Recent activity" description="Configuration changes and gateway outcomes for this workspace." icon="history" action={<Action onClick={() => navigateSection('Audit History')} disabled={!project}>View audit history</Action>}>
      <DataTable columns={['Activity', 'Result', 'Time']} rows={state.events.slice(0, 6).map(event => ({ key: event._id, cells: [event.action?.replaceAll('.', ' / '), event.status ? <Badge tone={event.status >= 400 ? 'danger' : event.status === 200 ? 'success' : 'neutral'}>{event.status}</Badge> : <Badge>Configuration</Badge>, timestamp(event.createdAt)] }))} emptyTitle="Activity will appear here" emptyDescription="Register an API or test a connection to start recording activity." />
    </Panel>
  </>;
}
