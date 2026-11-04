/**
 * Client 360 — the full relationship in one panel: profile, pipeline stage,
 * contacts, follow-ups, and a unified activity timeline. Everything is fetched
 * in a single /clients/:id/overview call.
 */
import { useState, useEffect, useCallback } from 'react';
import Drawer from '../../ui/Drawer';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import {
  apiFetch, DEPT_BADGE_TONE, PRIORITY_TONE, fmt, fmtDateTime,
  relativeDue, userLabel, StatusPicker, TextArea,
} from './crmShared';

const TYPE_ICONS = {
  email: 'email', call: 'call', meeting: 'meeting_room', visit: 'location_on',
  message: 'chat_bubble', proposal: 'description', approval: 'check_circle',
  note: 'edit_note', status_change: 'update', other: 'more_horiz',
};

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: 'person' },
  { id: 'timeline',  label: 'Timeline',  icon: 'forum' },
  { id: 'followups', label: 'Follow-ups',icon: 'event_available' },
  { id: 'contacts',  label: 'Contacts',  icon: 'contacts' },
  { id: 'history',   label: 'Stage Log', icon: 'history' },
];

function Field({ label, value, mono = false, href }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
      {href && value && value !== '—' ? (
        <a href={href} className="text-sm font-medium text-[var(--portal-accent)] hover:underline break-words">{value}</a>
      ) : (
        <p className={`text-sm text-neutral-800 dark:text-neutral-200 break-words ${mono ? 'font-mono text-xs' : ''}`}>
          {value || '—'}
        </p>
      )}
    </div>
  );
}

export default function ClientDetailDrawer({ open, clientId, token, statuses, onClose, onChanged, onEdit }) {
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  // Inline stage change — the most common single action on a client record,
  // so it lives in the header rather than behind the edit modal.
  const [stageOpen, setStageOpen]   = useState(false);
  const [stage, setStage]           = useState('');
  const [stageReason, setStageReason] = useState('');
  const [savingStage, setSavingStage] = useState(false);

  const load = useCallback(() => {
    if (!clientId) return;
    setLoading(true);
    apiFetch(`/clients/${clientId}/overview`, token)
      .then(r => { setData(r.data); setStage(r.data?.client?.status || ''); })
      .catch(err => { toast.error(err.message); setData(null); })
      .finally(() => setLoading(false));
  }, [clientId, token]);

  useEffect(() => { if (open) { setTab('overview'); setStageOpen(false); load(); } }, [open, load]);

  const client = data?.client;

  const saveStage = async () => {
    if (!stage || stage === client?.status) { setStageOpen(false); return; }
    setSavingStage(true);
    try {
      await apiFetch(`/clients/${clientId}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: stage, statusReason: stageReason }),
      });
      toast.success(`Moved to “${stage}”`);
      setStageOpen(false);
      setStageReason('');
      load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingStage(false);
    }
  };

  const completeFollowUp = async (id) => {
    try {
      await apiFetch(`/followups/${id}`, token, { method: 'PUT', body: JSON.stringify({ status: 'completed' }) });
      toast.success('Follow-up completed');
      load();
      onChanged?.();
    } catch (err) { toast.error(err.message); }
  };

  const pendingFollowUps = (data?.followups || []).filter(f => f.status === 'pending');
  const overdueCount = pendingFollowUps.filter(f => new Date(f.dueDate) < new Date()).length;

  return (
    <Drawer open={open} title={client?.name || 'Client'} onClose={onClose} className="w-full max-w-2xl">
      {loading ? (
        <div className="space-y-3 p-1">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : !client ? (
        <EmptyState icon="person_off" title="Client not found" />
      ) : (
        <div className="space-y-5">
          {/* ── Header ── */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black"
                style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
              >
                {(client.name?.[0] || '?').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black text-neutral-900 dark:text-neutral-100">{client.name}</p>
                <p className="font-mono text-xs text-neutral-500">{client.clientId}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <StatusBadge tone={DEPT_BADGE_TONE[client.department] || 'neutral'} label={client.department} />
                  <StatusBadge tone={PRIORITY_TONE[client.priority] || 'neutral'} label={client.priority} />
                  {overdueCount > 0 && <StatusBadge tone="danger" label={`${overdueCount} overdue`} />}
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => onEdit?.(client)}>Edit</Button>
            </div>

            {/* Stage control */}
            <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
              {!stageOpen ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Pipeline Stage</p>
                    <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{client.status}</p>
                  </div>
                  <Button variant="accent" size="sm" onClick={() => { setStage(client.status); setStageOpen(true); }}>
                    Move Stage
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <StatusPicker statuses={statuses} value={stage} onChange={e => setStage(e.target.value)} label="Move to stage" />
                  <TextArea
                    label="Reason (optional)"
                    rows={2}
                    value={stageReason}
                    onChange={e => setStageReason(e.target.value)}
                    placeholder="Why is this moving?"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setStageOpen(false)}>Cancel</Button>
                    <Button variant="accent" size="sm" loading={savingStage} onClick={saveStage}>Save Stage</Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-700">
            {TABS.map(t => {
              const count = t.id === 'followups' ? data.followups?.length
                : t.id === 'contacts' ? data.contacts?.length
                : t.id === 'timeline' ? data.communications?.length
                : t.id === 'history' ? client.statusHistory?.length
                : null;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'border-[var(--portal-accent)] text-[var(--portal-accent)]'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                  {t.label}
                  {count ? <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] dark:bg-neutral-700">{count}</span> : null}
                </button>
              );
            })}
          </div>

          {/* ── Overview ── */}
          {tab === 'overview' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Person" value={client.contactPerson} />
              <Field label="Owner" value={client.owner ? userLabel(client.owner) : '—'} />
              <Field label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
              <Field label="Phone" value={client.phone} href={client.phone ? `tel:${client.phone}` : undefined} />
              <Field label="Website" value={client.website} href={client.website ? (client.website.startsWith('http') ? client.website : `https://${client.website}`) : undefined} />
              <Field label="Source" value={client.source} />
              <Field label="Related Project" value={client.relatedProject} />
              <Field label="Marketing Channel" value={client.marketingChannel} />
              <Field label="Last Contacted" value={fmt(client.lastContactedAt)} />
              <Field label="Next Follow-up" value={fmt(client.nextFollowUpAt)} />
              <Field label="Created" value={fmt(client.createdAt)} />
              <Field label="Created By" value={client.createdBy ? userLabel(client.createdBy) : '—'} />
              <div className="col-span-2">
                <Field label="Address" value={client.address} />
              </div>
              {client.notes && (
                <div className="col-span-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Notes</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          {tab === 'timeline' && (
            !data.communications?.length
              ? <EmptyState icon="forum" title="No activity yet" description="Logged calls, emails and stage moves appear here" />
              : (
                <ol className="relative space-y-4 border-l border-neutral-200 pl-5 dark:border-neutral-700">
                  {data.communications.map(c => (
                    <li key={c._id} className="relative">
                      <span
                        className="absolute -left-[26px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white dark:ring-neutral-900"
                        style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
                      >
                        <span className="material-symbols-outlined text-[13px]">{TYPE_ICONS[c.type] || 'chat'}</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {c.subject || c.type?.replace(/_/g, ' ')}
                        </p>
                        <StatusBadge tone="neutral" label={c.direction} dot={false} />
                        {c.isInternal && <StatusBadge tone="neutral" label="Internal" dot={false} />}
                      </div>
                      {c.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">{c.body}</p>}
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {c.createdBy ? `${userLabel(c.createdBy)} · ` : ''}{fmtDateTime(c.occurredAt || c.createdAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )
          )}

          {/* ── Follow-ups ── */}
          {tab === 'followups' && (
            !data.followups?.length
              ? <EmptyState icon="event_available" title="No follow-ups" description="Schedule one from the Follow-ups module" />
              : (
                <div className="space-y-2">
                  {data.followups.map(f => {
                    const overdue = f.status === 'pending' && new Date(f.dueDate) < new Date();
                    return (
                      <div
                        key={f._id}
                        className={`flex items-start gap-3 rounded-xl border p-3 ${
                          overdue
                            ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10'
                            : 'border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        <span className="material-symbols-outlined mt-0.5 text-[18px] text-neutral-400">
                          {TYPE_ICONS[f.type] || 'event'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-bold capitalize text-neutral-900 dark:text-neutral-100">{f.type}</p>
                            <StatusBadge tone={PRIORITY_TONE[f.priority] || 'neutral'} label={f.priority} dot={false} />
                            <StatusBadge
                              tone={f.status === 'completed' ? 'success' : overdue ? 'danger' : 'warning'}
                              label={overdue ? 'overdue' : f.status}
                              dot={false}
                            />
                          </div>
                          {f.notes && <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-400">{f.notes}</p>}
                          <p className="mt-0.5 text-xs text-neutral-400">
                            {fmt(f.dueDate)}
                            {f.status === 'pending' && ` · ${relativeDue(f.dueDate)}`}
                            {f.assignedTo && ` · ${userLabel(f.assignedTo)}`}
                          </p>
                        </div>
                        {f.status === 'pending' && (
                          <Button variant="success" size="sm" onClick={() => completeFollowUp(f._id)}>Done</Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
          )}

          {/* ── Contacts ── */}
          {tab === 'contacts' && (
            !data.contacts?.length
              ? <EmptyState icon="contacts" title="No contacts" description="Add people from the Contacts module and link them to this client" />
              : (
                <div className="space-y-2">
                  {data.contacts.map(c => (
                    <div key={c._id} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                        style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }}
                      >
                        {(c.firstName?.[0] || '?').toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{c.firstName} {c.lastName}</p>
                          {c.isPrimary && <StatusBadge tone="info" label="Primary" dot={false} />}
                        </div>
                        <p className="text-xs text-neutral-500">{[c.title, c.email, c.phone].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
          )}

          {/* ── Stage log ── */}
          {tab === 'history' && (
            !client.statusHistory?.length
              ? <EmptyState icon="history" title="No stage changes" description="Pipeline movements are recorded here" />
              : (
                <ol className="relative space-y-4 border-l border-neutral-200 pl-5 dark:border-neutral-700">
                  {[...client.statusHistory].reverse().map((h, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[23px] h-2.5 w-2.5 rounded-full ring-4 ring-white dark:ring-neutral-900" style={{ background: 'var(--portal-accent)' }} />
                      <p className="text-sm text-neutral-800 dark:text-neutral-200">
                        <span className="text-neutral-500">{h.fromStatus || '—'}</span>
                        <span className="mx-1.5">→</span>
                        <span className="font-bold">{h.toStatus}</span>
                      </p>
                      {h.reason && <p className="mt-0.5 text-sm text-neutral-500">{h.reason}</p>}
                      <p className="mt-0.5 text-xs text-neutral-400">
                        {h.changedBy ? `${userLabel(h.changedBy)} · ` : ''}{fmtDateTime(h.changedAt)}
                      </p>
                    </li>
                  ))}
                </ol>
              )
          )}
        </div>
      )}
    </Drawer>
  );
}
