import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { portalSupportApi } from '../../services/portalSupportApi';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

// ─── Design tokens ────────────────────────────────────────────────────────────
const tone = {
  open:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  resolved:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  closed:      'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  low:         'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  normal:      'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high:        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  urgent:      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};
const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[value] || tone.low}`}>
    {String(value || '').replace(/_/g, ' ')}
  </span>
);
const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);
const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);
const Sel = ({ children, ...props }) => (
  <select className="rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" {...props}>{children}</select>
);
const Txa = ({ className = '', ...props }) => (
  <textarea className={`w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white ${className}`} {...props} />
);
const BtnPrimary = ({ children, className = '', ...props }) => (
  <button className={`inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 ${className}`} {...props}>{children}</button>
);
const Skeleton = ({ rows = 5 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
    ))}
  </div>
);
const KpiCard = ({ label, value, icon, color }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
      <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
    </div>
    <div>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
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
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', portal: '' });
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

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

  // Real-time socket: join support:admins room, reload on new tickets/updates
  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', 'support:admins');
    socket.on('support:new_ticket', (data) => {
      load();
      const msg = `New ${data?.priority || ''} ticket from ${data?.portal || ''} portal`.trim();
      setToast({ msg, id: Date.now() });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    });
    socket.on('support:ticket_updated', () => load());
    return () => { socket.disconnect(); clearTimeout(toastTimer.current); };
  }, [token]);

  const handleSelect = (t) => {
    setSelected(t);
    setReplyText('');
    setNewStatus(t.status);
    setSaveMsg('');
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setSaveMsg('');
    try {
      const payload = {};
      if (newStatus !== selected.status) payload.status = newStatus;
      if (replyText.trim()) payload.reply = replyText.trim();
      if (!payload.status && !payload.reply) { setSaveMsg('Nothing to save.'); setSaving(false); return; }
      const r = await portalSupportApi.updateTicket(token, selected._id, payload);
      setSelected(r.data);
      setReplyText('');
      setNewStatus(r.data.status);
      setSaveMsg('Saved!');
      load();
    } catch (e) {
      setSaveMsg(e.message || 'Failed to save');
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
    <div className="space-y-5 p-4 md:p-6">
      {/* Real-time toast */}
      {toast && (
        <div key={toast.id} className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl dark:bg-white dark:text-neutral-900 animate-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[18px] text-indigo-400 dark:text-indigo-600">confirmation_number</span>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 text-white/50 hover:text-white dark:text-neutral-400 dark:hover:text-neutral-900">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {/* Header */}
      <header className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <span className="material-symbols-outlined text-[20px] text-white">support_agent</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">Support Center</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage support tickets from all portals</p>
          </div>
        </div>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Open" value={kpis.open} icon="inbox" color="bg-blue-600" />
        <KpiCard label="In Progress" value={kpis.inProgress} icon="hourglass_top" color="bg-amber-500" />
        <KpiCard label="Resolved" value={kpis.resolved} icon="check_circle" color="bg-emerald-600" />
        <KpiCard label="Urgent" value={kpis.urgent} icon="priority_high" color="bg-rose-600" />
      </div>

      {/* Filters */}
      <Card>
        <Inner className="py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500">Filter:</span>
            <Sel value={filters.portal} onChange={(e) => setFilters({ ...filters, portal: e.target.value })}>
              <option value="">All Portals</option>
              {PORTALS.filter(Boolean).map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </Sel>
            <Sel value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Sel>
            <Sel value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Sel>
            <Sel value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
              <option value="">All Categories</option>
              <option value="general">General</option>
              <option value="technical">Technical</option>
              <option value="access">Access</option>
              <option value="payroll">Payroll</option>
              <option value="hr">HR</option>
              <option value="system">System</option>
              <option value="account">Account</option>
              <option value="other">Other</option>
            </Sel>
            <button onClick={load} className="flex items-center gap-1 rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
              <span className="material-symbols-outlined text-[14px]">refresh</span> Refresh
            </button>
          </div>
        </Inner>
      </Card>

      {/* Ticket list + detail panel */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* List */}
        <div className="flex-1 space-y-2 min-w-0">
          {loading ? <Skeleton /> : tickets.length === 0 ? (
            <Card>
              <Inner>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">inbox</span>
                  <p className="font-semibold text-neutral-500">No tickets found</p>
                  <p className="text-xs text-neutral-400">Try adjusting filters or check back later.</p>
                </div>
              </Inner>
            </Card>
          ) : tickets.map((t) => (
            <button key={t._id} onClick={() => handleSelect(t)}
              className={`w-full rounded-xl border p-4 text-left transition ${selected?._id === t._id ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/20' : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-900'}`}>
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200">
                  {initials(t.user)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900 dark:text-white truncate">{t.subject}</p>
                    <PortalBadge portal={t.portal} />
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {t.user?.firstName} {t.user?.lastName} · {t.category} · {fmt(t.createdAt)}
                    {t.replies?.length > 0 && ` · ${t.replies.length} ${t.replies.length === 1 ? 'reply' : 'replies'}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pill value={t.status} />
                  <Pill value={t.priority} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <aside className="w-full lg:w-[420px] shrink-0">
            <Card className="sticky top-4">
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
                      <Pill value={selected.status} />
                      <Pill value={selected.priority} />
                      <PortalBadge portal={selected.portal} />
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{selected.category}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="ml-2 shrink-0 rounded-xl p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              </div>

              {/* Thread */}
              <div className="max-h-80 overflow-y-auto p-5 space-y-3">
                <div className="rounded-xl bg-neutral-50 p-3 dark:bg-neutral-900">
                  <p className="mb-1 text-xs text-neutral-400">Original request · {fmtTime(selected.createdAt)}</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.description}</p>
                </div>
                {selected.replies?.map((r, i) => (
                  <div key={i} className={`rounded-xl p-3 ${r.isAdminReply ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white border border-neutral-100 dark:bg-neutral-900 dark:border-neutral-800'}`}>
                    <p className="mb-1 text-xs text-neutral-400">
                      {r.isAdminReply ? `👤 ${r.authorName || 'Admin'}` : 'User'} · {fmtTime(r.createdAt)}
                    </p>
                    <p className={`text-sm whitespace-pre-wrap ${r.isAdminReply ? 'text-indigo-800 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {r.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="border-t border-neutral-200 p-5 space-y-3 dark:border-neutral-800">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Change Status</label>
                  <Sel value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full">
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </Sel>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-500">Reply</label>
                  <Txa rows={3} placeholder="Write a reply to the user…" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                </div>
                {saveMsg && (
                  <p className={`text-xs font-semibold ${saveMsg === 'Saved!' ? 'text-emerald-600' : 'text-rose-600'}`}>{saveMsg}</p>
                )}
                <BtnPrimary onClick={handleSave} disabled={saving} className="w-full justify-center">
                  {saving ? 'Saving…' : 'Send Reply & Save'}
                </BtnPrimary>
              </div>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
};

export default AdminSupportCenter;
