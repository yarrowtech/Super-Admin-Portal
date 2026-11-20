import React, { useState } from 'react';
import { INPUT } from './api-management/config';
import { Action, Badge, Field, Icon, Notice, Panel } from './api-management/ManagementUI';

export default function ExistingProjectApis({ integrations, projects, projectId, editable, busy, send, run, chooseProject }) {
  const [drafts, setDrafts] = useState({});
  const items = integrations.filter(item => projectId ? item.projectId === projectId || (!item.projectId && !item.projectCode) : item.present || item.imported);
  if (!items.length) return null;
  const change = (integrationId, key, value) => setDrafts(previous => ({ ...previous, [integrationId]: { ...previous[integrationId], [key]: value } }));
  return <Panel title="Existing integrations" description="Keep your existing project APIs and environment settings. Register an adapter before editing it here." icon="cable">
    <div className="space-y-3">{items.map(item => {
      const ownerId = item.projectId || (!item.projectCode ? projectId : '');
      const project = projects.find(row => row._id === ownerId);
      const draft = drafts[item.id] || {};
      const changes = Object.fromEntries(Object.entries(draft).filter(([key, value]) => value !== '' && (item.fields.find(field => field.key === key)?.type === 'secret' || value !== item.fields.find(field => field.key === key)?.value)));
      return <article key={item.id} className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800"><Icon name="cable" /></span><div className="min-w-0"><h3 className="text-sm font-bold">{item.name}</h3><p className="mt-1 text-xs text-neutral-500">{project?.name || (item.projectCode ? `Owning project: ${item.projectCode}` : 'Select an owning project')}</p></div></div><div className="flex flex-wrap gap-2"><Badge tone={item.configured ? 'info' : 'neutral'}>{item.configured ? 'Configured · unverified' : 'Not configured'}</Badge><Badge>{item.imported ? 'Registered' : 'Existing adapter'}</Badge></div></div>
          <p className="mt-3 break-all font-mono text-xs leading-relaxed text-neutral-500">{item.baseUrl || 'Provider URL not configured'}</p>
          {!projectId && item.projectId && <div className="mt-3"><Action icon="arrow_forward" disabled={busy} onClick={() => chooseProject(item.projectId)}>Manage project</Action></div>}
          {editable && projectId && !item.imported && <div className="mt-3"><Action variant="accent" icon="add_link" disabled={busy || !ownerId} onClick={() => run(() => send(`/existing-integrations/${item.id}/import`, { projectId: ownerId }), 'Existing API registered. Current environment values were preserved.')}>Register existing API</Action></div>}
        </div>
        {projectId && item.imported && <details className="group border-t border-neutral-100 dark:border-neutral-800"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-[var(--portal-accent)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]"><span>{editable ? 'Edit connection settings' : 'View connection settings'}</span><Icon name="expand_more" className="transition-transform group-open:rotate-180" /></summary>
          <form className="space-y-4 border-t border-neutral-100 p-4 dark:border-neutral-800" onSubmit={async event => {
            event.preventDefault();
            const settings = changes;
            setDrafts(previous => ({ ...previous, [item.id]: Object.fromEntries(Object.entries(previous[item.id] || {}).filter(([key]) => item.fields.find(field => field.key === key)?.type !== 'secret')) }));
            const result = await run(() => send(`/existing-integrations/${item.id}`, { projectId: ownerId, settings, revision: item.revision }, 'patch'), 'Settings saved to the backend environment and applied immediately');
            if (result.ok) setDrafts(previous => ({ ...previous, [item.id]: {} }));
          }}>
            <fieldset disabled={!editable || busy} className="grid gap-4 sm:grid-cols-2">{item.fields.map(field => <Field key={field.key} label={field.label} hint={field.type === 'secret' ? (field.configured ? 'A credential is stored. Leave blank to keep it.' : 'No credential has been configured.') : undefined}><input className={INPUT} type={field.type === 'secret' ? 'password' : field.type === 'url' ? 'url' : 'text'} autoComplete={field.type === 'secret' ? 'new-password' : 'off'} value={draft[field.key] ?? (field.type === 'secret' ? '' : field.value || '')} placeholder={field.type === 'secret' ? 'Enter a new credential to replace it' : 'Not configured'} onChange={event => change(item.id, field.key, event.target.value)} /></Field>)}</fieldset>
            {item.note && <Notice>{item.note}</Notice>}
            <details className="text-xs text-neutral-500"><summary className="cursor-pointer font-semibold">Environment variables</summary><ul className="mt-2 space-y-1">{item.fields.map(field => <li key={field.key} className="break-all font-mono">{field.key}</li>)}</ul><p className="mt-2">Only changed values are saved to backend/.env. Unrelated settings remain unchanged.</p></details>
            {editable && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">{Object.keys(changes).length > 0 && <span className="mr-auto text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>}<Action disabled={busy || !Object.keys(draft).length} onClick={() => setDrafts(previous => ({ ...previous, [item.id]: {} }))}>Reset</Action><Action type="submit" variant="accent" icon="save" loading={busy} disabled={!Object.keys(changes).length}>Save settings</Action></div>}
          </form>
        </details>}
      </article>;
    })}</div>
  </Panel>;
}
