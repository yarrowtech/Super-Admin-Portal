import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { API_BASE_URL } from '../../../config/backend';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';
import SectionCard from '../../ui/SectionCard';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import DataTable from '../../ui/DataTable';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';

// ── API helper ────────────────────────────────────────────────────────────────
const apiFetch = async (path, token, options = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/v1/crm${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
};

// ── Shared constants ──────────────────────────────────────────────────────────
const DEPT_TABS = [
  { key: 'all',       label: 'All Media & Marketing' },
  { key: 'media',     label: 'Media' },
  { key: 'marketing', label: 'Marketing' },
];

// The department selector is a working context, not a per-visit choice — persist it
// so an operator returning to the CRM stays in the department they were working in.
const DEPT_STORAGE_KEY = 'crm.department';
const VALID_DEPTS = DEPT_TABS.map(t => t.key);

const NAV_GROUPS_STORAGE_KEY = 'crm.collapsedNavGroups';

const readCollapsedGroups = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(NAV_GROUPS_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(g => typeof g === 'string') : [];
  } catch {
    return [];
  }
};

const readStoredDepartment = () => {
  try {
    const stored = localStorage.getItem(DEPT_STORAGE_KEY);
    return VALID_DEPTS.includes(stored) ? stored : 'all';
  } catch {
    return 'all';
  }
};

const DEPT_BADGE_TONE = { media: 'info', marketing: 'success', both: 'neutral' };
const PRIORITY_TONE   = { low: 'success', medium: 'warning', high: 'danger', urgent: 'danger' };

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

// ── Field helpers ─────────────────────────────────────────────────────────────
const DEPT_OPTIONS    = [{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }, { value:'both', label:'Both' }];
const PRIORITY_OPTIONS= [{ value:'low', label:'Low' }, { value:'medium', label:'Medium' }, { value:'high', label:'High' }, { value:'urgent', label:'Urgent' }];

// ── CRM Dashboard ─────────────────────────────────────────────────────────────
function CRMDashboard({ token, department }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/dashboard?department=${department}`, token)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token, department]);

  const kpis = data ? [
    { title: 'Media Clients',        value: data.totalMedia,           icon: 'movie',          tone: 'info',    tooltip: 'Active clients associated with Media' },
    { title: 'Marketing Clients',    value: data.totalMarketing,       icon: 'campaign',       tone: 'success', tooltip: 'Active clients associated with Marketing' },
    { title: 'Shared Clients',       value: data.totalBoth,            icon: 'hub',            tone: 'neutral', tooltip: 'Clients linked to both departments' },
    { title: 'Active Relationships', value: data.activeClients,        icon: 'handshake',      tone: 'accent'  },
    { title: 'Pending Follow-ups',   value: data.pendingFollowUps,     icon: 'event_available',tone: 'warning' },
    { title: 'Overdue Follow-ups',   value: data.overdueFollowUps,     icon: 'event_busy',     tone: 'danger'  },
    { title: 'Activity (7 days)',    value: data.recentCommunications, icon: 'forum',          tone: 'info'    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : kpis.map(k => (
              <KPICard key={k.title} title={k.title} value={k.value ?? 0} icon={k.icon} tone={k.tone} tooltip={k.tooltip} />
            ))
        }
      </div>

      {/* Status breakdown */}
      <SectionCard
        title="Clients by Status"
        icon="bar_chart"
        loading={loading}
        empty={!loading && !data?.statusBreakdown?.length}
        emptyTitle="No client data yet"
        emptyDescription="Add clients to see status distribution"
        skeletonRows={5}
      >
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {data?.statusBreakdown?.map(s => (
            <div key={s._id} className="flex items-center justify-between px-1 py-3">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{s._id}</span>
              <div className="flex items-center gap-3">
                {/* bar */}
                <div className="h-2 w-32 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (s.count / (data?.activeClients || 1)) * 100)}%`,
                      background: 'var(--portal-accent)',
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-bold text-neutral-900 dark:text-neutral-100">{s.count}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Client form modal ─────────────────────────────────────────────────────────
const BLANK_CLIENT = { name:'', contactPerson:'', email:'', phone:'', website:'', address:'', department:'media', priority:'medium', status:'New Enquiry', relatedProject:'', source:'', notes:'' };

function ClientFormModal({ open, onClose, onSaved, token, editData }) {
  const toast = useToast();
  const [form, setForm] = useState(BLANK_CLIENT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editData ? { ...BLANK_CLIENT, ...editData } : BLANK_CLIENT);
  }, [editData, open]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editData?._id) {
        await apiFetch(`/clients/${editData._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Client updated');
      } else {
        await apiFetch('/clients', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Client created');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editData ? 'Edit Client' : 'Add New Client'}
      description="Client or organisation managed by the Media / Marketing CRM"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="accent" type="submit" form="crm-client-form" loading={saving}>
            {editData ? 'Save Changes' : 'Create Client'}
          </Button>
        </div>
      }
    >
      <form id="crm-client-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Client / Organisation Name *" name="name" required value={form.name} onChange={set('name')} placeholder="e.g. Acme Media Ltd" />
          </div>
          <Input label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={set('contactPerson')} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
          <Input label="Website" name="website" value={form.website} onChange={set('website')} />
          <Select
            label="Department *"
            name="department"
            required
            value={form.department}
            onChange={set('department')}
            options={DEPT_OPTIONS}
          />
          <Select
            label="Priority"
            name="priority"
            value={form.priority}
            onChange={set('priority')}
            options={PRIORITY_OPTIONS}
          />
          <Input label="Related Project" name="relatedProject" value={form.relatedProject} onChange={set('relatedProject')} />
          <Input label="Client Source" name="source" value={form.source} onChange={set('source')} placeholder="e.g. Referral, Website, Campaign" />
          <div className="sm:col-span-2">
            <Input label="Address" name="address" value={form.address} onChange={set('address')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Clients module ────────────────────────────────────────────────────────────
function ClientsModule({ token, department }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ department, page, limit: 15, ...(search ? { search } : {}) }).toString();
    apiFetch(`/clients?${q}`, token)
      .then(r => { setClients(r.data || []); setTotal(r.total || 0); setTotalPages(r.pages || 1); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, search, page]);

  useEffect(() => { setPage(1); }, [department, search]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { key:'clientId', header:'ID', render:r => <span className="font-mono text-xs text-neutral-500">{r.clientId}</span> },
    { key:'name', header:'Client', render:r => (
      <div>
        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</p>
        {r.contactPerson && <p className="text-xs text-neutral-500">{r.contactPerson}</p>}
      </div>
    )},
    { key:'email', header:'Email', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.email||'—'}</span> },
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
    { key:'status', header:'Status', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.status}</span> },
    { key:'priority', header:'Priority', render:r => <StatusBadge tone={PRIORITY_TONE[r.priority]||'neutral'} label={r.priority} /> },
    { key:'lastContactedAt', header:'Last Contact', render:r => <span className="text-xs text-neutral-400">{fmt(r.lastContactedAt)}</span> },
    { key:'nextFollowUpAt', header:'Next Follow-up', render:r => {
      const overdue = r.nextFollowUpAt && new Date(r.nextFollowUpAt) < new Date();
      return <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-neutral-400'}`}>{fmt(r.nextFollowUpAt)}</span>;
    }},
  ];

  return (
    <>
      <ClientFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSaved={load}
        token={token}
        editData={editTarget}
      />

      <SectionCard
        title={`Clients${total ? ` (${total})` : ''}`}
        icon="groups"
        description="All Media & Marketing client relationships"
        loading={loading}
        empty={!loading && clients.length === 0}
        emptyTitle="No clients yet"
        emptyDescription="Create your first client record to get started"
        emptyAction={{ label:'Add Client', onClick:() => setModalOpen(true) }}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="h-9 w-48 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
              Add Client
            </Button>
          </div>
        }
        noBodyPadding
      >
        <DataTable
          columns={columns}
          rows={clients}
          rowKey="_id"
          onRowClick={r => { setEditTarget(r); setModalOpen(true); }}
          emptyTitle="No clients"
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}

// ── Contacts module ───────────────────────────────────────────────────────────
const BLANK_CONTACT = { firstName:'', lastName:'', title:'', email:'', phone:'', department:'media', role:'', isPrimary:false, notes:'' };

function ContactsModule({ token, department }) {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_CONTACT);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/contacts?department=${department}`, token)
      .then(r => setContacts(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(BLANK_CONTACT); setModalOpen(true); };
  const openEdit   = (c)  => { setEditTarget(c); setForm({ ...BLANK_CONTACT, ...c }); setModalOpen(true); };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget?._id) {
        await apiFetch(`/contacts/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Contact updated');
      } else {
        await apiFetch('/contacts', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Contact created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key:'name', header:'Name', render:r => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-xs font-bold" style={{ color:'var(--portal-accent)' }}>
          {(r.firstName?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{r.firstName} {r.lastName}</p>
          {r.role && <p className="text-xs text-neutral-500">{r.role}</p>}
        </div>
      </div>
    )},
    { key:'title', header:'Title', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.title||'—'}</span> },
    { key:'email', header:'Email', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.email||'—'}</span> },
    { key:'phone', header:'Phone', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.phone||'—'}</span> },
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
    { key:'client', header:'Client', render:r => <span className="text-xs text-neutral-500">{r.client?.name||'—'}</span> },
  ];

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? 'Edit Contact' : 'New Contact'} onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-contact-form" loading={saving}>{editTarget ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form id="crm-contact-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="First Name *" required name="firstName" value={form.firstName} onChange={set('firstName')} />
          <Input label="Last Name"     name="lastName"  value={form.lastName}  onChange={set('lastName')} />
          <Input label="Title"         name="title"     value={form.title}     onChange={set('title')} />
          <Input label="Email"         name="email"     type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone"         name="phone"     type="tel"  value={form.phone} onChange={set('phone')} />
          <Input label="Role"          name="role"      value={form.role}      onChange={set('role')} />
          <Select label="Department *" name="department" required value={form.department} onChange={set('department')} options={DEPT_OPTIONS} />
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="isPrimary" checked={form.isPrimary} onChange={set('isPrimary')} className="h-4 w-4 rounded border-neutral-300" />
            <label htmlFor="isPrimary" className="text-sm text-neutral-700 dark:text-neutral-300">Primary contact</label>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</label>
            <textarea rows={2} name="notes" value={form.notes} onChange={set('notes')} className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
          </div>
        </form>
      </Modal>

      <SectionCard title="Contacts" icon="contacts" description="People within client organisations"
        loading={loading} empty={!loading && contacts.length === 0}
        emptyTitle="No contacts yet" emptyAction={{ label:'Add Contact', onClick:openCreate }}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Add Contact</Button>}
        noBodyPadding
      >
        <DataTable columns={columns} rows={contacts} rowKey="_id" onRowClick={openEdit} emptyTitle="No contacts" />
      </SectionCard>
    </>
  );
}

// ── Status Management ─────────────────────────────────────────────────────────
function StatusModule({ token, department }) {
  const toast = useToast();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState({ name:'', department: department === 'all' ? 'shared' : department, color:'#6366f1', order:0, description:'' });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/statuses?department=${department}`, token)
      .then(r => setStatuses(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/statuses', token, { method:'POST', body: JSON.stringify(form) });
      toast.success('Status created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const mediaStatuses    = statuses.filter(s => s.department === 'media');
  const marketingStatuses= statuses.filter(s => s.department === 'marketing');
  const sharedStatuses   = statuses.filter(s => s.department === 'shared');

  const StatusGroup = ({ title, items, tone }) => (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p>
      {items.length === 0
        ? <p className="text-sm text-neutral-400 italic">None configured</p>
        : <div className="flex flex-wrap gap-2">
            {items.map(s => (
              <span key={s._id} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
      }
    </div>
  );

  return (
    <>
      <Modal open={modalOpen} title="New Status" description="Add a configurable status for client relationship workflows" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-status-form" loading={saving}>Create Status</Button>
          </div>
        }
      >
        <form id="crm-status-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Status Name *" required name="name" value={form.name} onChange={set('name')} placeholder="e.g. Proposal Sent" />
          </div>
          <Select label="Department" name="department" value={form.department} onChange={set('department')}
            options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }, { value:'shared', label:'Shared (both)' }]}
          />
          <Input label="Sort Order" name="order" type="number" value={form.order} onChange={set('order')} />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Colour</label>
            <input type="color" value={form.color} onChange={set('color')} className="h-11 w-full cursor-pointer rounded-lg border border-neutral-200 p-1 dark:border-neutral-700" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Description" name="description" value={form.description} onChange={set('description')} placeholder="Optional — shown in status tooltips" />
          </div>
        </form>
      </Modal>

      <SectionCard title="Status Management" icon="flag" description="Department-aware configurable relationship statuses"
        loading={loading}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => setModalOpen(true)}>Add Status</Button>}
      >
        <div className="space-y-6">
          <StatusGroup title="Media Statuses"      items={mediaStatuses} />
          <StatusGroup title="Marketing Statuses"  items={marketingStatuses} />
          <StatusGroup title="Shared Statuses"     items={sharedStatuses} />
        </div>
      </SectionCard>
    </>
  );
}

// ── Follow-ups ────────────────────────────────────────────────────────────────
const BLANK_FOLLOWUP = { department:'media', type:'call', priority:'medium', notes:'', dueDate:'', nextAction:'' };

function FollowUpsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState(BLANK_FOLLOWUP);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/followups?department=${department}&status=${statusFilter}`, token)
      .then(r => setItems(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/followups', token, { method:'POST', body: JSON.stringify(form) });
      toast.success('Follow-up created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (id) => {
    try {
      await apiFetch(`/followups/${id}`, token, { method:'PUT', body: JSON.stringify({ status:'completed' }) });
      toast.success('Marked complete');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const STATUS_TABS = ['pending','completed','overdue','cancelled'];
  const TYPE_ICONS  = { call:'call', email:'email', meeting:'meeting_room', visit:'location_on', proposal:'description', approval:'check_circle', other:'more_horiz' };

  return (
    <>
      <Modal open={modalOpen} title="New Follow-up" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-followup-form" loading={saving}>Create Follow-up</Button>
          </div>
        }
      >
        <form id="crm-followup-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Department *" required name="department" value={form.department} onChange={set('department')}
            options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }]} />
          <Select label="Type" name="type" value={form.type} onChange={set('type')}
            options={Object.keys(TYPE_ICONS).map(t => ({ value:t, label:t.charAt(0).toUpperCase()+t.slice(1) }))} />
          <Select label="Priority" name="priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <Input label="Due Date *" required name="dueDate" type="date" value={form.dueDate} onChange={set('dueDate')} />
          <div className="sm:col-span-2">
            <Input label="Notes" name="notes" value={form.notes} onChange={set('notes')} placeholder="What needs to happen?" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Next Action" name="nextAction" value={form.nextAction} onChange={set('nextAction')} />
          </div>
        </form>
      </Modal>

      <SectionCard
        title="Follow-ups"
        icon="event_available"
        description="Track client follow-up actions across Media & Marketing"
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle={`No ${statusFilter} follow-ups`}
        emptyAction={statusFilter === 'pending' ? { label:'Create Follow-up', onClick:() => setModalOpen(true) } : undefined}
        action={
          <div className="flex items-center gap-2">
            {/* Status tabs */}
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {STATUS_TABS.map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${statusFilter===s ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}
                >
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => setModalOpen(true)}>Add</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {items.map(f => {
            const overdue = f.status === 'pending' && new Date(f.dueDate) < new Date();
            return (
              <div key={f._id} className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${overdue ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/50'}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                  <span className="material-symbols-outlined text-xl">{TYPE_ICONS[f.type]||'event'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{f.client?.name || 'No client linked'}</p>
                    <StatusBadge tone={DEPT_BADGE_TONE[f.department]||'neutral'} label={f.department} />
                    <StatusBadge tone={PRIORITY_TONE[f.priority]||'neutral'} label={f.priority} />
                    {overdue && <StatusBadge tone="danger" label="Overdue" />}
                  </div>
                  {f.notes && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{f.notes}</p>}
                  <p className="mt-1 text-xs text-neutral-400">Due: <span className={overdue ? 'font-semibold text-red-600' : ''}>{fmt(f.dueDate)}</span></p>
                </div>
                {f.status === 'pending' && (
                  <Button variant="success" size="sm" onClick={() => markComplete(f._id)}>Done</Button>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

// ── Communication History ─────────────────────────────────────────────────────
const TYPE_ICONS_COMMS = { email:'email', call:'call', meeting:'meeting_room', visit:'location_on', message:'chat_bubble', proposal:'description', approval:'check_circle', note:'edit_note', status_change:'update' };
const BLANK_COMM = { department:'media', type:'note', direction:'outbound', subject:'', body:'', isInternal:false };

function CommunicationsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState(BLANK_COMM);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/communications?department=${department}&page=${page}&limit=20`, token)
      .then(r => { setItems(r.data || []); setTotal(r.total||0); setTotalPages(r.pages||1); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, page]);

  useEffect(() => { setPage(1); }, [department]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/communications', token, { method:'POST', body: JSON.stringify(form) });
      toast.success('Communication logged');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const DIRECTION_TONE = { outbound:'info', inbound:'success', internal:'neutral' };

  return (
    <>
      <Modal open={modalOpen} title="Log Communication" description="Record any client interaction for the unified history" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-comm-form" loading={saving}>Log</Button>
          </div>
        }
      >
        <form id="crm-comm-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Type" name="type" value={form.type} onChange={set('type')}
            options={Object.keys(TYPE_ICONS_COMMS).map(t => ({ value:t, label:t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }))} />
          <Select label="Direction" name="direction" value={form.direction} onChange={set('direction')}
            options={[{ value:'outbound', label:'Outbound' }, { value:'inbound', label:'Inbound' }, { value:'internal', label:'Internal' }]} />
          <Select label="Department *" required name="department" value={form.department} onChange={set('department')}
            options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }]} />
          <Input label="Subject" name="subject" value={form.subject} onChange={set('subject')} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes / Body</label>
            <textarea rows={4} name="body" value={form.body} onChange={set('body')} className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isInternal" checked={form.isInternal} onChange={set('isInternal')} className="h-4 w-4 rounded border-neutral-300" />
            <label htmlFor="isInternal" className="text-sm text-neutral-600 dark:text-neutral-400">Internal note (not shared with client)</label>
          </div>
        </form>
      </Modal>

      <SectionCard
        title={`Communication History${total ? ` (${total})` : ''}`}
        icon="forum"
        description="Chronological record of all client interactions"
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle="No communications logged"
        emptyAction={{ label:'Log First Entry', onClick:() => setModalOpen(true) }}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => { setForm(BLANK_COMM); setModalOpen(true); }}>Log</Button>}
      >
        <div className="space-y-2">
          {items.map(c => (
            <div key={c._id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                <span className="material-symbols-outlined text-[18px]">{TYPE_ICONS_COMMS[c.type]||'chat'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.subject || c.type?.replace('_',' ')}</p>
                  <StatusBadge tone={DEPT_BADGE_TONE[c.department]||'neutral'} label={c.department} dot={false} />
                  <StatusBadge tone={DIRECTION_TONE[c.direction]||'neutral'} label={c.direction} dot={false} />
                  {c.isInternal && <StatusBadge tone="neutral" label="Internal" dot={false} />}
                </div>
                {c.body && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{c.body}</p>}
                <p className="mt-1 text-xs text-neutral-400">
                  {c.createdBy ? `${c.createdBy.firstName} ${c.createdBy.lastName} · ` : ''}
                  {new Date(c.occurredAt || c.createdAt).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}

// ── Email & Content ───────────────────────────────────────────────────────────
const BLANK_TEMPLATE = { name:'', department:'shared', type:'other', subject:'', body:'' };
const TEMPLATE_TYPE_OPTIONS = ['introduction','followup','proposal','meeting','delivery','outreach','update','other'].map(t => ({ value:t, label:t.charAt(0).toUpperCase()+t.slice(1) }));

function EmailModule({ token, department }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [form, setForm]           = useState(BLANK_TEMPLATE);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/email-templates?department=${department}`, token)
      .then(r => setTemplates(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/email-templates', token, { method:'POST', body: JSON.stringify(form) });
      toast.success('Template created');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const TYPE_ICONS_EMAIL = { introduction:'waving_hand', followup:'replay', proposal:'description', meeting:'calendar_month', delivery:'local_shipping', outreach:'send', update:'update', other:'email' };

  return (
    <>
      <Modal open={modalOpen} title="New Email Template" description="Use {{variable}} placeholders for dynamic content" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-email-form" loading={saving}>Create Template</Button>
          </div>
        }
      >
        <form id="crm-email-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Input label="Template Name *" required name="name" value={form.name} onChange={set('name')} />
            </div>
            <Select label="Type" name="type" value={form.type} onChange={set('type')} options={TEMPLATE_TYPE_OPTIONS} />
            <Select label="Department" name="department" value={form.department} onChange={set('department')}
              options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }, { value:'shared', label:'Shared' }]} />
          </div>
          <Input label="Subject *" required name="subject" value={form.subject} onChange={set('subject')} placeholder="e.g. Introduction — {{company_name}}" />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Body *</label>
            <textarea required rows={8} name="body" value={form.body} onChange={set('body')}
              placeholder="Dear {{contact_name}},&#10;&#10;..."
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
            <p className="mt-1 text-xs text-neutral-400">Variables: {'{{contact_name}}'}, {'{{company_name}}'}, {'{{sender_name}}'}</p>
          </div>
        </form>
      </Modal>

      {/* Template viewer */}
      <Modal open={Boolean(viewModal)} title={viewModal?.name || 'Template'} onClose={() => setViewModal(null)}>
        {viewModal && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={DEPT_BADGE_TONE[viewModal.department]||'neutral'} label={viewModal.department} />
              <StatusBadge tone="neutral" label={viewModal.type} />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Subject</p>
              <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{viewModal.subject}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Body</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-neutral-700 dark:text-neutral-300">{viewModal.body}</pre>
            </div>
          </div>
        )}
      </Modal>

      <SectionCard title="Email & Content Templates" icon="email" description="Reusable email templates for Media & Marketing communications"
        loading={loading}
        empty={!loading && templates.length === 0}
        emptyTitle="No templates yet"
        emptyAction={{ label:'Create Template', onClick:() => setModalOpen(true) }}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => { setForm(BLANK_TEMPLATE); setModalOpen(true); }}>New Template</Button>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <button key={t._id} type="button" onClick={() => setViewModal(t)}
              className="flex flex-col items-start gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--portal-accent)] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
              style={{ boxShadow:'var(--erp-shadow-soft)' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                <span className="material-symbols-outlined text-[18px]">{TYPE_ICONS_EMAIL[t.type]||'email'}</span>
              </div>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{t.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500 truncate">{t.subject}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                <StatusBadge tone={DEPT_BADGE_TONE[t.department]||'neutral'} label={t.department} dot={false} />
                <StatusBadge tone="neutral" label={t.type} dot={false} />
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

// ── Vendors & Third Parties ───────────────────────────────────────────────────
const BLANK_VENDOR = { name:'', department:'media', entityType:'vendor', category:'', contactPerson:'', email:'', phone:'', website:'', notes:'' };

function VendorsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [entityFilter, setEntityFilter] = useState('vendor');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_VENDOR);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/vendors?department=${department}&entityType=${entityFilter}`, token)
      .then(r => setItems(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, entityFilter]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditTarget(null); setForm({ ...BLANK_VENDOR, entityType: entityFilter }); setModalOpen(true); };
  const openEdit   = (v)  => { setEditTarget(v); setForm({ ...BLANK_VENDOR, ...v }); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget?._id) {
        await apiFetch(`/vendors/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Updated');
      } else {
        await apiFetch('/vendors', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key:'name', header:'Name', render:r => <span className="font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</span> },
    { key:'category', header:'Category', render:r => <span className="text-sm text-neutral-500">{r.category||'—'}</span> },
    { key:'contactPerson', header:'Contact', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.contactPerson||'—'}</span> },
    { key:'email', header:'Email', render:r => <span className="text-sm text-neutral-500">{r.email||'—'}</span> },
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
  ];

  const entityLabel = entityFilter === 'vendor' ? 'Vendors' : 'Third Parties';

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? `Edit ${entityLabel.slice(0,-1)}` : `New ${entityLabel.slice(0,-1)}`} onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-vendor-form" loading={saving}>{editTarget ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form id="crm-vendor-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Name *" required name="name" value={form.name} onChange={set('name')} />
          </div>
          <Select label="Department" name="department" value={form.department} onChange={set('department')} options={DEPT_OPTIONS} />
          <Select label="Entity Type" name="entityType" value={form.entityType} onChange={set('entityType')}
            options={[{ value:'vendor', label:'Vendor' }, { value:'third_party', label:'Third Party' }]} />
          <Input label="Category" name="category" value={form.category} onChange={set('category')} placeholder="e.g. Photography, Analytics" />
          <Input label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={set('contactPerson')} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
          <div className="sm:col-span-2">
            <Input label="Website" name="website" value={form.website} onChange={set('website')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</label>
            <textarea rows={2} name="notes" value={form.notes} onChange={set('notes')} className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
          </div>
        </form>
      </Modal>

      <SectionCard
        title={entityLabel}
        icon={entityFilter === 'vendor' ? 'store' : 'integration_instructions'}
        description={entityFilter === 'vendor' ? 'Media & Marketing service vendors' : 'Third-party integrations and partners'}
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle={`No ${entityLabel.toLowerCase()} yet`}
        emptyAction={{ label:`Add ${entityLabel.slice(0,-1)}`, onClick: openCreate }}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {[['vendor','Vendors'],['third_party','Third Parties']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setEntityFilter(v)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${entityFilter===v ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}>{l}</button>
              ))}
            </div>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Add</Button>
          </div>
        }
        noBodyPadding
      >
        <DataTable columns={columns} rows={items} rowKey="_id" onRowClick={openEdit} emptyTitle={`No ${entityLabel.toLowerCase()}`} />
      </SectionCard>
    </>
  );
}

// ── Reports & Analytics ───────────────────────────────────────────────────────
function AnalyticsModule({ token, department }) {
  const toast = useToast();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/analytics?department=${department}`, token)
      .then(r => setData(r.data))
      .catch(err => { toast.error(err.message); setData(null); })
      .finally(() => setLoading(false));
  }, [token, department]);

  const Chart = ({ title, rows, keyField = '_id', valueField = 'count', colorFn }) => {
    const max = Math.max(...(rows||[]).map(r => r[valueField]), 1);
    return (
      <SectionCard title={title} icon="bar_chart" loading={loading} empty={!loading && !rows?.length} emptyTitle="No data yet" skeletonRows={4}>
        <div className="space-y-2.5">
          {(rows||[]).slice(0,10).map((r,i) => (
            <div key={r[keyField]||i} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-neutral-600 dark:text-neutral-400 capitalize">{String(r[keyField]||'—').replace(/_/g,' ')}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800" style={{ height:8 }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${(r[valueField]/max)*100}%`, background: colorFn ? colorFn(i) : 'var(--portal-accent)' }} />
              </div>
              <span className="w-8 text-right text-sm font-bold text-neutral-900 dark:text-neutral-100">{r[valueField]}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    );
  };

  const PALETTE = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Chart title="Clients by Department" rows={data?.clientsByDept} colorFn={i => PALETTE[i%PALETTE.length]} />
      <Chart title="Clients by Status"     rows={data?.clientsByStatus} colorFn={i => PALETTE[i%PALETTE.length]} />
      <Chart title="Follow-ups by Status"  rows={data?.followupsByStatus} colorFn={i => PALETTE[(i+2)%PALETTE.length]} />
      <Chart title="Communications by Type" rows={data?.commsByType} colorFn={i => PALETTE[(i+4)%PALETTE.length]} />
    </div>
  );
}

// ── CRM Settings ──────────────────────────────────────────────────────────────
function SettingsModule() {
  const ENDPOINTS = [
    '/api/v1/crm/dashboard','/api/v1/crm/clients','/api/v1/crm/contacts',
    '/api/v1/crm/statuses','/api/v1/crm/email-templates','/api/v1/crm/followups',
    '/api/v1/crm/communications','/api/v1/crm/vendors','/api/v1/crm/analytics',
  ];
  const PERMISSIONS = [
    ['Super Admin / Admin', 'Full CRM access — all departments, all records, all settings'],
    ['media_head',          'Media CRM records — clients, contacts, follow-ups, communications'],
    ['media_marketing',     'Marketing CRM records'],
    ['media_sales',         'Marketing context — clients and follow-ups'],
    ['CRM Viewer (future)', 'Read-only access to assigned records'],
  ];
  return (
    <div className="space-y-5">
      <SectionCard title="Permissions Matrix" icon="security" description="Who can access what within the CRM">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {PERMISSIONS.map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3 py-3">
              <span className="material-symbols-outlined mt-0.5 text-[18px]" style={{ color:'var(--portal-accent)' }}>shield_person</span>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{role}</p>
                <p className="text-xs text-neutral-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="API Endpoints" icon="api" description="Internal REST endpoints — require Bearer token with CRM role">
        <div className="space-y-1.5">
          {ENDPOINTS.map(ep => (
            <div key={ep} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
              <StatusBadge tone="info" label="GET/POST" dot={false} />
              <code className="text-xs text-neutral-700 dark:text-neutral-300">{ep}</code>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Scope Rules" icon="gavel" description="Data governance enforced at both frontend and backend">
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          {[
            'This CRM serves ONLY Media and Marketing departments.',
            'Every record carries a department field: "media", "marketing", or "both".',
            'Shared clients (both) are visible to authorised users of either department.',
            'Finance, HR, IT, LAW, and YarrowTech records are never imported here.',
            'No separate CRM exists inside the Media or Marketing portal — this is the single source.',
            'Status history is immutable once written; soft-delete via isActive = false.',
          ].map((r,i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-emerald-500">check_circle</span>
              {r}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

// ── Module registry ───────────────────────────────────────────────────────────
const MODULES = [
  { id:'dashboard', label:'Dashboard',           icon:'dashboard',              Component: CRMDashboard },
  { id:'clients',   label:'Clients',              icon:'groups',                 Component: ClientsModule },
  { id:'contacts',  label:'Contacts',             icon:'contacts',               Component: ContactsModule },
  { id:'statuses',  label:'Status Management',    icon:'flag',                   Component: StatusModule },
  { id:'email',     label:'Email & Content',      icon:'email',                  Component: EmailModule },
  { id:'followups', label:'Follow-ups',           icon:'event_available',        Component: FollowUpsModule },
  { id:'comms',     label:'Communication History',icon:'forum',                  Component: CommunicationsModule },
  { id:'vendors',   label:'Vendors & 3rd Parties',icon:'store',                  Component: VendorsModule },
  { id:'analytics', label:'Reports & Analytics',  icon:'bar_chart',              Component: AnalyticsModule },
  { id:'settings',  label:'CRM Settings',         icon:'settings',               Component: SettingsModule },
];

// Navigation grouping. Module ids are unchanged — these groups are presentation only,
// so existing /admin/crm/:id routes keep working. Leads & Opportunities and a split
// Third-Party Providers section are part of the CRM roadmap but not yet built; they
// are deliberately absent here rather than shown as dead links.
const NAV_GROUPS = [
  { id:'overview',     label:'Overview',                      moduleIds:['dashboard'] },
  { id:'relationship', label:'Relationship Management',       moduleIds:['clients','contacts','statuses'] },
  { id:'activities',   label:'Activities & Communication',    moduleIds:['followups','comms','email'] },
  { id:'network',      label:'Business Network',              moduleIds:['vendors'] },
  { id:'intelligence', label:'Intelligence & Configuration',  moduleIds:['analytics','settings'] },
];

const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));

const NAV_GROUPS_RESOLVED = NAV_GROUPS.map(group => ({
  ...group,
  modules: group.moduleIds.map(id => MODULE_BY_ID[id]).filter(Boolean),
}));

// ── Root page ─────────────────────────────────────────────────────────────────
export default function AdminCRMPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const urlSegment   = location.pathname.split('/').pop();
  const activeId     = MODULES.find(m => m.id === urlSegment)?.id ?? 'dashboard';
  const [department, setDepartment] = useState(readStoredDepartment);

  const selectDepartment = useCallback((key) => {
    setDepartment(key);
    try { localStorage.setItem(DEPT_STORAGE_KEY, key); } catch {}
  }, []);

  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);

  const toggleGroup = useCallback((groupId) => {
    setCollapsedGroups((prev) => {
      const next = prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId];
      try { localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const { Component: ActiveComponent } = MODULES.find(m => m.id === activeId) || MODULES[0];

  return (
    <div className="flex h-full min-h-screen flex-col" style={{ '--portal-accent':'#6366f1', '--portal-accent-soft':'rgba(99,102,241,0.1)' }}>
      {/* Portal header */}
      <div className="px-4 pt-4 pb-0 lg:px-6 lg:pt-5">
        <PortalHeader
          title="CRM Management"
          subtitle="Media & Marketing — Centralised Client Relationship Management"
          icon="contact_page"
          user={user}
          showThemeToggle
        >
          {/* Department filter in header right slot */}
          <div
            role="group"
            aria-label="Department filter"
            className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800"
          >
            {DEPT_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={department === key}
                onClick={() => selectDepartment(key)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 ${
                  department === key
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </PortalHeader>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar nav */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:flex">
          <nav className="flex flex-col gap-1 overflow-y-auto p-2">
            {NAV_GROUPS_RESOLVED.map(({ id: groupId, label: groupLabel, modules }) => {
              const open = !collapsedGroups.includes(groupId);
              const groupHasActive = modules.some(m => m.id === activeId);
              return (
                <div key={groupId} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupId)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600 focus:outline-none focus-visible:ring-2 dark:hover:text-neutral-300"
                  >
                    <span className="truncate">{groupLabel}</span>
                    {/* A collapsed group still signals that something inside it is active. */}
                    {!open && groupHasActive && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background:'var(--portal-accent)' }} />
                    )}
                    <span className={`material-symbols-outlined ml-auto text-[16px] transition-transform ${open ? '' : '-rotate-90'}`}>
                      expand_more
                    </span>
                  </button>

                  {open && (
                    <div className="flex flex-col gap-0.5 pb-1">
                      {modules.map(({ id, label, icon }) => {
                        const active = activeId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => navigate(`/admin/crm/${id}`)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 ${
                              active
                                ? 'bg-[var(--portal-accent-soft)] font-semibold'
                                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                            }`}
                            style={active ? { color:'var(--portal-accent)' } : {}}
                            aria-current={active ? 'page' : undefined}
                          >
                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                            <span className="truncate">{label}</span>
                            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background:'var(--portal-accent)' }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Mobile horizontal tab strip */}
        <div className="flex w-full flex-col lg:hidden">
          <div className="flex overflow-x-auto border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            {/* Same grouping as the desktop sidebar, flattened into a scrollable strip
                with group labels acting as separators. */}
            <div className="flex items-center gap-1 px-3 py-2">
              {NAV_GROUPS_RESOLVED.map(({ id: groupId, label: groupLabel, modules }, groupIndex) => (
                <React.Fragment key={groupId}>
                  {groupIndex > 0 && (
                    <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
                  )}
                  <span className="shrink-0 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {groupLabel}
                  </span>
                  {modules.map(({ id, label, icon }) => {
                    const active = activeId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => navigate(`/admin/crm/${id}`)}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                          active ? 'text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400'
                        }`}
                        style={active ? { background:'var(--portal-accent)' } : {}}
                      >
                        <span className="material-symbols-outlined text-[16px]">{icon}</span>
                        {label}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Mobile content */}
          <main className="flex-1 overflow-y-auto p-4">
            <ActiveComponent token={token} department={department} />
          </main>
        </div>

        {/* Desktop content */}
        <main className="hidden flex-1 overflow-y-auto p-5 lg:block lg:p-6">
          <ActiveComponent token={token} department={department} />
        </main>
      </div>
    </div>
  );
}
