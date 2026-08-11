import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { portalSupportApi } from '../../services/portalSupportApi';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import IconButton from '../common/IconButton';
import Button from '../common/Button';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const STATUS_TONE = { open: 'info', in_progress: 'warning', resolved: 'success', closed: 'neutral' };
const PRIORITY_TONE = { low: 'neutral', normal: 'info', high: 'warning', urgent: 'danger' };

const Skeleton = ({ rows = 5 }) => (
  <div className="animate-pulse space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
    ))}
  </div>
);

const PORTALS = ['', 'hr', 'manager', 'employee', 'it', 'ceo', 'law', 'finance', 'media', 'sales', 'research', 'outsourcing'];
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const initials = (u) => `${u?.firstName?.[0] || ''}${u?.lastName?.[0] || ''}`.toUpperCase() || '?';

const PORTAL_COLORS = {
  hr: '#3b82f6', manager: '#8b5cf6', employee: '#10b981', it: '#f59e0b',
  ceo: '#ef4444', law: '#6366f1', finance: '#14b8a6', media: '#f97316',
  sales: '#ec4899', research: '#84cc16', outsourcing: '#06b6d4', other: '#6b7280',
};

const PortalBadge = ({ portal }) => {
  const color = PORTAL_COLORS[portal] || '#6b7280';
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize" style={{ background: `${color}20`, color }}>
      {portal}
    </span>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const AdminSupportCenter = () => {
  const { token } = useAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', portal: '' });
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [liveTicketToast, setLiveTicketToast] = useState(null);
  const liveToastTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const r = await portalSupportApi.getAllTickets(token, params);
      setTickets(r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [token, filters]);

  useEffect(() => { load(); }, [load]);

  // Real-time socket: join support:admins room, reload on new tickets/updates.
  // Kept as a bespoke bottom-right toast — this is a live-event notification
  // (can fire while the admin isn't taking any action), not action-confirmation
  // feedback, so it intentionally doesn't go through the shared useToast().
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', 'support:admins');
    socket.on('support:new_ticket', (data) => {
      load();
      const msg = `New ${data?.priority || ''} ticket from ${data?.portal || ''} portal`.trim();
      setLiveTicketToast({ msg, id: Date.now() });
      clearTimeout(liveToastTimer.current);
      liveToastTimer.current = setTimeout(() => setLiveTicketToast(null), 5000);
    });
    socket.on('support:ticket_updated', () => load());
    return () => { socket.disconnect(); clearTimeout(liveToastTimer.current); };
  }, [token]);

  const handleSelect = (t) => {
    setSelected(t);
    setReplyText('');
    setNewStatus(t.status);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const payload = {};
      if (newStatus !== selected.status) payload.status = newStatus;
      if (replyText.trim()) payload.reply = replyText.trim();
      if (!payload.status && !payload.reply) { toast.warning('Nothing to save.'); setSaving(false); return; }
      const r = await portalSupportApi.updateTicket(token, selected._id, payload);
      setSelected(r.data);
      setReplyText('');
      setNewStatus(r.data.status);
      toast.success('Ticket updated.');
      load();
    } catch (e) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // KPIs
  const kpis = {
    open: tickets.filter((t) => t.status === 'open').length,
    inProgress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    urgent: tickets.filter((t) => t.priority === 'urgent').length,
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        {/* Real-time toast */}
        {liveTicketToast && (
          <div key={liveTicketToast.id} className="animate-in slide-in-from-bottom-4 fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl dark:bg-white dark:text-neutral-900">
            <span className="material-symbols-outlined text-lg text-indigo-400 dark:text-indigo-600">confirmation_number</span>
            {liveTicketToast.msg}
            <button type="button" onClick={() => setLiveTicketToast(null)} className="ml-1 text-white/50 hover:text-white dark:text-neutral-400 dark:hover:text-neutral-900" aria-label="Dismiss">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        <PortalHeader
          title="Support Center"
          subtitle="Manage support tickets from all portals"
          icon="support_agent"
          showSearch={false}
          showNotifications={false}
          showThemeToggle={false}
        >
          <Button variant="secondary" size="md" className="min-h-11" onClick={load} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
            Refresh
          </Button>
        </PortalHeader>

        {/* KPI cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KPICard title="Open" value={kpis.open} icon="inbox" compact />
          <KPICard title="In Progress" value={kpis.inProgress} icon="hourglass_top" compact />
          <KPICard title="Resolved" value={kpis.resolved} icon="check_circle" compact />
          <KPICard title="Urgent" value={kpis.urgent} icon="priority_high" compact />
        </div>

        {/* Filters */}
        <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Filter:</span>
            <select value={filters.portal} onChange={(e) => setFilters({ ...filters, portal: e.target.value })} className="min-h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              <option value="">All Portals</option>
              {PORTALS.filter(Boolean).map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="min-h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="min-h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="min-h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white">
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="access">Access</option>
              <option value="payroll">Payroll</option>
              <option value="hr">HR</option>
              <option value="system">System</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Ticket list + detail panel */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* List */}
          <div className="min-w-0 flex-1 space-y-2">
            {loading ? <Skeleton /> : tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-16 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">inbox</span>
                <p className="font-semibold text-neutral-500">No tickets found</p>
                <p className="text-xs text-neutral-400">Try adjusting filters or check back later.</p>
              </div>
            ) : tickets.map((t) => (
              <button
                key={t._id}
                type="button"
                onClick={() => handleSelect(t)}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${selected?._id === t._id ? 'border-primary/50 bg-primary/5 dark:bg-primary/10' : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60'}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                    {initials(t.user)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-neutral-900 dark:text-white">{t.subject}</p>
                      <PortalBadge portal={t.portal} />
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {t.user?.firstName} {t.user?.lastName} · {t.category} · {fmt(t.createdAt)}
                      {t.replies?.length > 0 && ` · ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusBadge tone={STATUS_TONE[t.status]} label={String(t.status || '').replace(/_/g, ' ')} />
                    <StatusBadge tone={PRIORITY_TONE[t.priority]} label={t.priority} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <aside className="w-full shrink-0 lg:w-[420px]">
              <div className="sticky top-4 rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                {/* Header */}
                <div className="border-b border-neutral-200 p-5 dark:border-neutral-800">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-400">#{selected._id.slice(-8).toUpperCase()}</p>
                      <h3 className="mt-0.5 text-base font-bold text-neutral-900 dark:text-white">{selected.subject}</h3>
                      <p className="mt-1 text-xs text-neutral-500">
                        {selected.user?.firstName} {selected.user?.lastName} · {selected.user?.email}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <StatusBadge tone={STATUS_TONE[selected.status]} label={String(selected.status || '').replace(/_/g, ' ')} />
                        <StatusBadge tone={PRIORITY_TONE[selected.priority]} label={selected.priority} />
                        <PortalBadge portal={selected.portal} />
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{selected.category}</span>
                      </div>
                    </div>
                    <IconButton icon="close" tooltip="Close panel" onClick={() => setSelected(null)} />
                  </div>
                </div>

                {/* Thread */}
                <div className="max-h-80 space-y-3 overflow-y-auto p-5">
                  <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60">
                    <p className="mb-1 text-xs text-neutral-400">Original request · {fmtTime(selected.createdAt)}</p>
                    <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{selected.description}</p>
                  </div>
                  {selected.replies?.map((r, i) => (
                    <div key={i} className={`rounded-xl p-3 ${r.isAdminReply ? 'bg-primary/5 dark:bg-primary/10' : 'border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
                      <p className="mb-1 text-xs text-neutral-400">
                        {r.isAdminReply ? `${r.authorName || 'Admin'}` : 'User'} · {fmtTime(r.createdAt)}
                      </p>
                      <p className={`whitespace-pre-wrap text-sm ${r.isAdminReply ? 'text-primary' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {r.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="space-y-3 border-t border-neutral-200 p-5 dark:border-neutral-800">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Change Status</label>
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="app-input">
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-neutral-500">Reply</label>
                    <textarea
                      rows={3}
                      placeholder="Write a reply to the user…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="app-input"
                    />
                  </div>
                  <Button variant="primary" size="md" fullWidth loading={saving} onClick={handleSave}>
                    Send Reply & Save
                  </Button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
};

export default AdminSupportCenter;
