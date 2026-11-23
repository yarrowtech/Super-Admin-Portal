import React, { useRef, useState } from 'react';
import { blankEndpoint, INPUT } from './config';
import { RemoveAction, Action, Badge, DataTable, Empty, Field, Notice, Panel, Select } from './ManagementUI';

export default function EndpointManager({ registry, state, project, api, editable, busy, run, send }) {
  const [draft, setDraft] = useState(blankEndpoint(api?._id || ''));
  const [fieldText, setFieldText] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const editorRef = useRef(null);
  const update = values => setDraft(previous => ({ ...previous, ...values }));
  const reset = () => { setEditingId(''); setDraft(blankEndpoint(api?._id || '')); setFieldText(''); setEditorOpen(false); };
  const open = endpoint => {
    const value = endpoint ? Object.fromEntries(Object.keys(blankEndpoint('')).map(key => [key, endpoint[key] ?? blankEndpoint(api._id)[key]])) : blankEndpoint(api._id);
    setDraft(value); setEditingId(endpoint?._id || ''); setFieldText(value.fields.join(', ')); setEditorOpen(true);
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const fields = [...new Set(fieldText.split(',').map(value => value.trim()).filter(Boolean))];
  const validFields = fields.length > 0 && fields.every(name => /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(name));
  const schemaFor = schema => Object.fromEntries(fields.map(name => [name, schema[name] || 'string']));
  const sharedFields = draft.sharedFields.filter(name => fields.includes(name));
  return <>
    <Panel title="Endpoints & shared data" description="Each endpoint belongs to this project. Select exactly which fields can be shared." icon="route" action={editable && <Action variant="accent" icon="add" disabled={!api || busy} onClick={() => open()}>Add endpoint</Action>}>
      <DataTable columns={['Endpoint', 'Module / dataset', 'Method', 'Sharing', 'Actions']} rows={state.endpoints.map(endpoint => ({ key: endpoint._id, cells: [<div><p className="font-semibold">{endpoint.name}</p><code className="mt-1 block text-xs text-neutral-500">{endpoint.path}</code></div>, <div>{endpoint.module}<p className="mt-1 text-xs text-neutral-500">{endpoint.dataset}</p></div>, <Badge tone={endpoint.method === 'GET' ? 'info' : 'warning'}>{endpoint.method}</Badge>, <div><Badge tone={endpoint.shared ? 'success' : 'neutral'}>{endpoint.shared ? `${endpoint.sharedFields.length} fields shared` : 'Not shared'}</Badge><p className="mt-1.5 text-xs text-neutral-500">{endpoint.operation}</p></div>, editable ? <div className="flex flex-wrap gap-2"><Action disabled={busy} icon="edit" onClick={() => open(endpoint)}>Edit</Action><RemoveAction label="endpoint" description={endpoint.name} path={`/endpoints/${endpoint._id}`} {...{ busy, run, send }} /></div> : <span className="text-xs text-neutral-500">Read only</span>] }))} emptyTitle="No endpoints registered" emptyDescription="Add an actual provider endpoint, define its fields, then approve what this project can share." />
    </Panel>
    {!api && <Notice>Register this project's API before adding endpoints.</Notice>}
    {editorOpen && <div ref={editorRef} className="scroll-mt-5"><Panel title={editingId ? 'Edit endpoint' : 'New endpoint'} icon="edit_note" description={`Data provider: ${project.name}`} action={<Action disabled={busy} onClick={reset}>Cancel</Action>}>
      <form className="space-y-6" onSubmit={async event => {
        event.preventDefault();
        const body = { ...draft, apiId: api._id, fields, sharedFields, responseSchema: schemaFor(draft.responseSchema), requestSchema: draft.method === 'GET' ? {} : schemaFor(draft.requestSchema) };
        const result = await run(() => send(editingId ? `/endpoints/${editingId}` : '/endpoints', body, editingId ? 'put' : 'post'), 'Endpoint and sharing policy saved');
        if (result.ok) reset();
      }}>
        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
          <Field label="Endpoint name"><input className={INPUT} value={draft.name} maxLength={150} required onChange={event => update({ name: event.target.value })} placeholder="e.g. Customer overview" /></Field>
          <Field label="Provider connection"><Select value={draft.providerIntegrationId} onChange={event => update({ providerIntegrationId: event.target.value })} placeholder="Default project provider" options={(registry.existingIntegrations || []).filter(item => item.projectId === project._id && item.imported && item.bearer).map(item => ({ value: item.id, label: item.name }))} /></Field>
          <Field label="Module"><input className={INPUT} value={draft.module} maxLength={100} required onChange={event => update({ module: event.target.value })} placeholder="e.g. Customers" /></Field>
          <Field label="Dataset"><input className={INPUT} value={draft.dataset} maxLength={100} required onChange={event => update({ dataset: event.target.value })} placeholder="e.g. Approved profiles" /></Field>
          <Field label="Endpoint path" hint="Relative to this provider's configured URL."><input className={INPUT} value={draft.path} required onChange={event => update({ path: event.target.value })} placeholder="/customers" /></Field>
          <Field label="HTTP method"><select className={INPUT} value={draft.method} onChange={event => update({ method: event.target.value, operation: { GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update' }[event.target.value] })}>{['GET', 'POST', 'PUT', 'PATCH'].map(method => <option key={method}>{method}</option>)}</select></Field>
          <Field label="Response records path" hint="Leave empty for a root object or array. Use data.items for an envelope."><input className={INPUT} value={draft.recordsPath} onChange={event => update({ recordsPath: event.target.value })} placeholder="data.items" /></Field>
          {draft.method === 'GET' ? <Field label="Delivery permission"><select className={INPUT} value={draft.operation} onChange={event => update({ operation: event.target.value })}><option value="read">Live reads</option><option value="sync">Live reads and synchronization</option></select></Field> : <Notice tone="warning">This endpoint permits {draft.operation} operations. Grant write access only after verifying the provider contract.</Notice>}
        </fieldset>
        <div className="space-y-4 border-t border-neutral-100 pt-5 dark:border-neutral-800"><Field label="Available fields" hint="Comma-separated scalar field names. Choose a type and sharing permission for each field below."><input className={INPUT} value={fieldText} onChange={event => setFieldText(event.target.value)} placeholder="name, email, status" required disabled={busy} /></Field>
          {fieldText && !validFields && <p role="alert" className="text-xs text-red-600">Use field names beginning with a letter and containing only letters, numbers or underscores.</p>}
          {fields.length ? <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"><div className="grid grid-cols-[1fr_7rem_4.5rem] gap-2 bg-neutral-50 px-3 py-2 text-[11px] font-bold uppercase text-neutral-500 dark:bg-neutral-950"><span>Field</span><span>Type</span><span>Share</span></div>{fields.map(name => <div key={name} className="grid grid-cols-[1fr_7rem_4.5rem] items-center gap-2 border-t border-neutral-100 px-3 py-2 dark:border-neutral-800"><span className="min-w-0 break-all font-mono text-xs">{name}</span><select aria-label={`${name} data type`} className={`${INPUT} min-h-9 px-2`} value={draft.responseSchema[name] || 'string'} disabled={busy} onChange={event => update({ responseSchema: { ...draft.responseSchema, [name]: event.target.value }, requestSchema: { ...draft.requestSchema, [name]: event.target.value } })}>{['string', 'number', 'boolean'].map(type => <option key={type}>{type}</option>)}</select><input className="h-4 w-4 accent-[var(--portal-accent)]" type="checkbox" aria-label={`Share ${name}`} checked={sharedFields.includes(name)} disabled={busy} onChange={event => update({ sharedFields: event.target.checked ? [...sharedFields, name] : sharedFields.filter(field => field !== name) })} /></div>)}</div> : <Empty title="Define the available fields" description="Shared fields and data types will appear here." icon="view_column" />}
          <label className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 text-sm dark:bg-neutral-950"><input className="h-4 w-4 accent-[var(--portal-accent)]" type="checkbox" checked={draft.shared} onChange={event => update({ shared: event.target.checked })} disabled={busy} /><span>Enable sharing for the selected fields</span></label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800"><Action onClick={reset} disabled={busy}>Cancel</Action><Action type="submit" variant="accent" icon="save" loading={busy} disabled={!validFields || (draft.shared && !sharedFields.length)}>Save endpoint</Action></div>
      </form>
    </Panel></div>}
  </>;
}
