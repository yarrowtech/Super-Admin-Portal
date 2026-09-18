import { useCallback, useEffect, useState } from 'react';
import { policyService, POLICY_CONSUMER_API_URL } from '../../services/policy';
import { Button, EmptyState, Input, Modal, SectionCard, Skeleton } from '../ui';
import { StatusBadge } from '../common';

const STATUS_TONE = { ACTIVE: 'success', REVOKED: 'danger', EXPIRED: 'neutral' };

const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
};

// Lets an admin provision client_id/client_secret pairs for a project — the
// actual "share this policy" mechanism. The project itself is chosen once,
// outside this component (the page's own project filter), not re-selected
// here. A client tied to project X only ever sees project X's published
// policies.
export default function EfnbmmsApiClients({ token, projectId, projectLabel }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState(null);
  const closeCreate = useCallback(() => { setCreateOpen(false); setIssued(null); }, []);
  const [busyId, setBusyId] = useState('');
  const [editing, setEditing] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const closeEdit = useCallback(() => setEditing(null), []);
  const [copiedId, setCopiedId] = useState('');
  const copyId = async (clientId) => { if (await copy(clientId)) { setCopiedId(clientId); window.setTimeout(() => setCopiedId(''), 1500); } };
  const [viewing, setViewing] = useState(null);
  const closeView = useCallback(() => setViewing(null), []);

  const load = useCallback(async () => {
    if (!projectId) { setClients([]); return; }
    setLoading(true); setError('');
    try {
      const res = await policyService.apiClients(token, { projectId });
      setClients(res?.data?.items || []);
    } catch (requestError) { setError(requestError?.message || 'Unable to load API clients.'); }
    finally { setLoading(false); }
  }, [token, projectId]);

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const openCreate = () => { setLabel(''); setCreateOpen(true); };

  const createClient = async (event) => {
    event.preventDefault();
    if (!projectId) return;
    setSaving(true); setError('');
    try {
      const res = await policyService.createApiClient(token, { label, projectId, scopes: ['policies:read'] });
      setIssued(res?.data || null);
      setLabel('');
      await load();
    } catch (requestError) { setError(requestError?.message || 'Unable to create API client.'); }
    finally { setSaving(false); }
  };

  const revoke = async (clientId) => {
    setBusyId(clientId); setError('');
    try { await policyService.revokeApiClient(token, clientId); await load(); }
    catch (requestError) { setError(requestError?.message || 'Unable to revoke client.'); }
    finally { setBusyId(''); }
  };

  const openEdit = (client) => { setEditing(client); setEditLabel(client.label || ''); };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setBusyId(editing.clientId); setError('');
    try {
      await policyService.updateApiClient(token, editing.clientId, { label: editLabel });
      setEditing(null);
      await load();
    } catch (requestError) { setError(requestError?.message || 'Unable to update client.'); }
    finally { setBusyId(''); }
  };

  const remove = async (client) => {
    if (!window.confirm(`Permanently delete API client "${client.label || client.clientId}"? Any consumer still using it will immediately lose access. This cannot be undone.`)) return;
    setBusyId(client.clientId); setError('');
    try { await policyService.deleteApiClient(token, client.clientId); await load(); }
    catch (requestError) { setError(requestError?.message || 'Unable to delete client.'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="mt-6">
      <SectionCard
        title={`API Access · ${projectLabel || 'Project'}`}
        icon="vpn_key"
        description={`Consumer API base: ${POLICY_CONSUMER_API_URL}`}
        action={{ label: 'New API Client', icon: 'add', onClick: openCreate }}
        loading={loading}
        empty={!loading && !clients.length}
        emptyIcon="vpn_key"
        emptyTitle="No API clients yet"
        emptyDescription={`Create a client to let another app fetch ${projectLabel || 'this project'}'s published policies.`}
        emptyAction={{ label: 'New API Client', onClick: openCreate }}
        skeletonRows={2}
      >
        {error && <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{client.label || 'Unnamed consumer'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="relative inline-flex">
                    <button
                      type="button"
                      onClick={() => copyId(client.clientId)}
                      className="flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 font-mono text-xs text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
                      title="Copy client_id"
                    >
                      <span className="material-symbols-outlined text-[14px]">{copiedId === client.clientId ? 'check' : 'content_copy'}</span>
                      {client.clientId}
                    </button>
                    {copiedId === client.clientId && (
                      <span
                        role="status"
                        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-bold text-white shadow-lg dark:bg-white dark:text-neutral-900"
                      >
                        Copied to clipboard!
                        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-white" />
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-neutral-400">·</span>
                  <span className="text-xs text-neutral-500">scopes: {(client.scopes || []).join(', ') || '—'}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={STATUS_TONE[client.status] || 'neutral'} label={client.status} />
                <Button variant="secondary" size="sm" onClick={() => setViewing(client)}>View</Button>
                <Button variant="secondary" size="sm" disabled={busyId === client.clientId} onClick={() => openEdit(client)}>Edit</Button>
                {client.status === 'ACTIVE' && (
                  <Button variant="danger" size="sm" disabled={busyId === client.clientId} onClick={() => revoke(client.clientId)}>Revoke</Button>
                )}
                <Button variant="danger" size="sm" disabled={busyId === client.clientId} onClick={() => remove(client)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <Modal
        open={createOpen}
        title="New API Client"
        onClose={closeCreate}
        footer={issued ? (
          <div className="flex justify-end"><Button onClick={closeCreate}>Done</Button></div>
        ) : (
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeCreate}>Cancel</Button><Button type="submit" form="efnbmms-api-client-form" disabled={saving || !projectId}>{saving ? 'Creating…' : 'Create client'}</Button></div>
        )}
      >
        {issued ? (
          <IssuedCredential issued={issued} />
        ) : (
          <form id="efnbmms-api-client-form" onSubmit={createClient} className="space-y-3">
            <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              Project: {projectLabel || '—'}
            </div>
            <Input label="Consumer label" required placeholder="e.g. MateBid checkout app" value={label} onChange={(event) => setLabel(event.target.value)} />
            <p className="text-xs text-neutral-500">Secret is shown only once — copy it immediately.</p>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(editing)}
        title="Rename API Client"
        description="Update the label shown for this consumer. The client_id, secret, and scopes are unaffected."
        onClose={closeEdit}
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeEdit}>Cancel</Button><Button type="submit" form="efnbmms-api-client-edit-form" disabled={busyId === editing?.clientId}>{busyId === editing?.clientId ? 'Saving…' : 'Save'}</Button></div>}
      >
        <form id="efnbmms-api-client-edit-form" onSubmit={saveEdit} className="space-y-3">
          <Input label="Consumer label" required value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
          <p className="text-xs text-neutral-500">client_id: <code>{editing?.clientId}</code></p>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewing)}
        title={viewing?.label || 'API Client'}
        onClose={closeView}
        footer={<div className="flex justify-end"><Button onClick={closeView}>Close</Button></div>}
      >
        {viewing && <SharedWithClient client={viewing} />}
      </Modal>
    </div>
  );
}

function SharedWithClient({ client }) {
  const [copiedField, setCopiedField] = useState('');
  const envBlock = `EFNBMMS_POLICY_API_URL=${POLICY_CONSUMER_API_URL}\nEFNBMMS_POLICY_CLIENT_ID=${client.clientId}\nEFNBMMS_POLICY_CLIENT_SECRET=<already shared when created — not retrievable>`;
  const doCopy = async (field, value) => { if (await copy(value)) { setCopiedField(field); window.setTimeout(() => setCopiedField(''), 1500); } };
  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-500">This is what was shared with the consuming project. The client secret was only ever shown once at creation and can't be displayed again — if it's been lost, delete this client and create a new one.</p>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Consuming project .env</p>
          <button type="button" onClick={() => doCopy('env', envBlock)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            <span className="material-symbols-outlined text-[14px]">{copiedField === 'env' ? 'check' : 'content_copy'}</span>
            {copiedField === 'env' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs leading-5 text-neutral-100">{envBlock}</pre>
      </div>
    </div>
  );
}

function IssuedCredential({ issued }) {
  const [copiedField, setCopiedField] = useState('');
  const [secretVisible, setSecretVisible] = useState(false);
  const envBlock = `EFNBMMS_POLICY_API_URL=${POLICY_CONSUMER_API_URL}\nEFNBMMS_POLICY_CLIENT_ID=${issued.clientId}\nEFNBMMS_POLICY_CLIENT_SECRET=${issued.clientSecret}`;
  const curl = `curl -X POST ${POLICY_CONSUMER_API_URL}/auth/token \\\n  -H "Content-Type: application/json" \\\n  -d '{"client_id":"${issued.clientId}","client_secret":"${issued.clientSecret}"}'`;
  const doCopy = async (field, value) => { if (await copy(value)) { setCopiedField(field); window.setTimeout(() => setCopiedField(''), 1500); } };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-bold text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
        <span className="material-symbols-outlined text-base">check_circle</span>
        {issued.label ? `API client "${issued.label}" created and saved` : 'Secret rotated and saved'}
      </div>
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <span className="material-symbols-outlined text-base">warning</span>
        Save the client secret now — it will not be shown again.
      </div>
      <CredentialRow icon="badge" label="Client ID" value={issued.clientId} copied={copiedField === 'id'} onCopy={() => doCopy('id', issued.clientId)} />
      <CredentialRow
        icon="password"
        label="Client Secret"
        value={issued.clientSecret}
        masked={!secretVisible}
        onToggleMask={() => setSecretVisible((v) => !v)}
        copied={copiedField === 'secret'}
        onCopy={() => doCopy('secret', issued.clientSecret)}
      />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Consuming project .env</p>
          <button type="button" onClick={() => doCopy('env', envBlock)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            <span className="material-symbols-outlined text-[14px]">{copiedField === 'env' ? 'check' : 'content_copy'}</span>
            {copiedField === 'env' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs leading-5 text-neutral-100">{envBlock}</pre>
        <p className="mt-1 text-[11px] text-neutral-500">Paste into the consuming project's server-side env vars (never a <code>NEXT_PUBLIC_</code>/<code>VITE_</code> prefix).</p>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">Example request</p>
          <button type="button" onClick={() => doCopy('curl', curl)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            <span className="material-symbols-outlined text-[14px]">{copiedField === 'curl' ? 'check' : 'content_copy'}</span>
            {copiedField === 'curl' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs leading-5 text-neutral-100">{curl}</pre>
      </div>
    </div>
  );
}

function CredentialRow({ icon, label, value, masked, onToggleMask, copied, onCopy }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
        {icon && <span className="material-symbols-outlined shrink-0 text-[18px] text-neutral-400">{icon}</span>}
        <code className="flex-1 truncate text-sm text-neutral-800 dark:text-neutral-100">{masked ? '•'.repeat(Math.min(value.length, 32)) : value}</code>
        {onToggleMask && (
          <button type="button" onClick={onToggleMask} className="shrink-0 flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700" aria-label={masked ? 'Show secret' : 'Hide secret'}>
            <span className="material-symbols-outlined text-[18px]">{masked ? 'visibility' : 'visibility_off'}</span>
          </button>
        )}
        <button type="button" onClick={onCopy} className="shrink-0 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-primary hover:bg-primary/10">
          <span className="material-symbols-outlined text-[15px]">{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
