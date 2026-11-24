import React, { useState } from 'react';
import ExistingProjectApis from '../ExistingProjectApis';
import { INPUT } from './config';
import { RemoveAction, Action, Badge, CopyValue, Empty, Field, Notice, Panel } from './ManagementUI';

export function ProviderSettings({ registry, project, api, editable, busy, run, send, chooseProject }) {
  const [draftUrl, setUrl] = useState(null);
  const url = draftUrl ?? api?.baseUrl ?? '';
  const hasExistingProvider = registry.existingIntegrations?.some(item => item.projectId === project._id && item.present);
  return <>
    <ExistingProjectApis integrations={registry.existingIntegrations || []} projects={registry.projects} projectId={project._id} editable={editable} busy={busy} send={send} run={run} chooseProject={chooseProject} />
    <Panel title="Primary provider" description="The default upstream connection for this project's endpoints." icon="settings_input_component" action={<Badge tone={api?.enabled ? 'info' : 'neutral'}>{api ? (api.enabled ? 'Enabled' : 'Disabled') : 'Awaiting registration'}</Badge>}>
      {!api ? <Empty title="No managed API registered" description={hasExistingProvider
        ? 'Register the existing provider above to create this project?s gateway identity and start configuring endpoints and portal access.'
        : 'Use Register project API to create a gateway identity for this project.'} /> : <form className="space-y-5" onSubmit={async event => { event.preventDefault(); const result = await run(() => send(`/apis/${api._id}`, { baseUrl: url, enabled: true }, 'patch'), 'Provider URL saved and enabled'); if (result.ok) setUrl(null); }}>
        <Field label="Provider URL" hint="Use the public HTTPS base URL. Endpoint paths are configured separately."><input type="url" required className={INPUT} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://provider.example.com/api/v1" disabled={!editable || busy} /></Field>
        {editable && !api.enabled && api.environmentIntegrationId && <Action disabled={busy} onClick={() => run(() => send(`/apis/${api._id}`, { enabled: true }, 'patch'), 'Gateway provider enabled')}>Enable gateway</Action>}
        <Notice>Saving updates the backend environment and applies the new configuration immediately. Connection changes require a new test before activation.</Notice>
        {editable && <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800"><Action type="submit" variant="accent" icon="save" loading={busy} disabled={!url.trim()}>Save and enable</Action><Action disabled={busy || !api.enabled} onClick={() => run(() => send(`/apis/${api._id}`, { enabled: false }, 'patch'), 'Gateway provider disabled')}>Disable gateway provider</Action>{!api.enabled && <RemoveAction label="gateway registration" description="Removes the managed registration and any generated provider settings. Existing project routes keep their live configuration." path={`/apis/${api._id}`} {...{ busy, run, send }} />}</div>}
      </form>}
    </Panel>
    {api && <Panel title="Gateway identity" description="Use this namespace when connecting an authorized portal backend." icon="fingerprint"><div className="space-y-4"><Field label="Project gateway path"><CopyValue value={`/api/v1/projects/${api.namespace}`} /></Field><details className="text-xs text-neutral-500"><summary className="cursor-pointer font-semibold">Technical identifiers</summary><dl className="mt-3 grid gap-2"><div><dt>API ID</dt><dd className="break-all font-mono">{api._id}</dd></div><div><dt>Project ID</dt><dd className="break-all font-mono">{api.projectId}</dd></div><div><dt>API version</dt><dd>{api.version}</dd></div></dl></details></div></Panel>}
  </>;
}

export function ProviderCredential({ registry, project, api, editable, busy, run, send, chooseProject }) {
  const [token, setToken] = useState('');
  return <>
    <ExistingProjectApis integrations={registry.existingIntegrations || []} projects={registry.projects} projectId={project._id} editable={editable} busy={busy} send={send} run={run} chooseProject={chooseProject} />
    <Panel title="Provider bearer credential" icon="key" description="Stored credentials are never shown. Enter a new value to replace the current credential." action={<Badge tone={api?.credentialConfigured ? 'success' : 'warning'}>{api?.credentialConfigured ? 'Credential stored' : 'Not configured'}</Badge>}>
      {!api ? <Empty title="No project API registered" description="Register a project API before adding its credential." /> : api.environmentIntegrationId && !(registry.existingIntegrations || []).find(item => item.id === api.environmentIntegrationId)?.bearer ? <Notice>This provider uses its own authentication fields. Update them in the existing integration settings above.</Notice> : <form className="space-y-4" onSubmit={async event => { event.preventDefault(); const value = token; setToken(''); await run(() => send(`/apis/${api._id}/credential`, { token: value }), 'Provider credential updated'); }}>
        <Field label="New provider-issued bearer token" hint="Leave the field empty to keep the current credential."><input type="password" autoComplete="new-password" minLength={16} required className={INPUT} value={token} onChange={event => setToken(event.target.value)} disabled={!editable || busy} placeholder="Enter a new token" /></Field>
        {!registry.capabilities.encryptionReady && <Notice tone="warning">The backend infrastructure encryption key must be configured before credentials can be saved.</Notice>}
        <Notice>The credential is saved to the backend environment with an encrypted database copy. Existing connections require retesting after rotation.</Notice>
        {editable && <Action variant="accent" type="submit" icon="lock" loading={busy} disabled={!token || !registry.capabilities.encryptionReady}>Update credential</Action>}
      </form>}
    </Panel>
  </>;
}

export function Documentation({ api, token, client, run, busy }) {
  const [docs, setDocs] = useState(null);
  return <Panel title="API documentation" icon="description" description="Generated from the project's registered endpoints and sharing policies." action={<Action variant="accent" icon="refresh" disabled={!api || busy} onClick={() => run(async () => { const data = await client.get(`/api/api-management/apis/${api._id}/documentation`, token, { cache: false }); setDocs(data); }, 'Documentation generated')}>{docs ? 'Regenerate' : 'Generate documentation'}</Action>}>
    {!docs ? <Empty title="Documentation is ready to generate" description="Generate the current OpenAPI definition to review endpoints, authentication and approved data contracts." icon="description" /> : <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold">{docs.info.title}</h3><p className="mt-1 text-xs text-neutral-500">OpenAPI {docs.openapi} · {Object.keys(docs.paths || {}).length} endpoint paths</p></div><Action icon="download" onClick={() => { const url = URL.createObjectURL(new Blob([JSON.stringify(docs, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `${api.namespace}-openapi.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }}>Export JSON</Action></div><pre tabIndex={0} aria-label="OpenAPI document" className="max-h-[32rem] overflow-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-xs leading-relaxed dark:border-neutral-800 dark:bg-neutral-950">{JSON.stringify(docs, null, 2)}</pre></div>}
  </Panel>;
}
