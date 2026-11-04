/**
 * Shared CRM primitives: API helper, option hooks and the client/owner pickers.
 *
 * These live outside AdminCRMPage so every module resolves clients and users the
 * same way. The pickers matter: CRMFollowUp and CRMCommunication both declare
 * `client` as required, so a form without a client selector could never submit.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../../config/backend';
import Select from '../../ui/Select';

// ── API helper ────────────────────────────────────────────────────────────────
export const apiFetch = async (path, token, options = {}) => {
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
export const DEPT_BADGE_TONE = { media: 'info', marketing: 'success', both: 'neutral' };
export const PRIORITY_TONE   = { low: 'success', medium: 'warning', high: 'danger', urgent: 'danger' };

// Solid colours for priority edge-rails. StatusBadge tones are tints — too light
// to read as a 6px marker, so rails need their own full-strength values.
export const PRIORITY_RAIL = { low: '#10b981', medium: '#f59e0b', high: '#f97316', urgent: '#e11d48' };

export const DEPT_OPTIONS = [
  { value: 'media', label: 'Media' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'both', label: 'Both' },
];
export const SINGLE_DEPT_OPTIONS = DEPT_OPTIONS.filter(o => o.value !== 'both');
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const fmt = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** "3 days overdue" / "in 2 days" — relative phrasing reads faster than a date in a task list. */
export const relativeDue = (d) => {
  if (!d) return null;
  const days = Math.round((new Date(d) - new Date()) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  return days < 0 ? `${Math.abs(days)} days overdue` : `Due in ${days} days`;
};

export const userLabel = (u) =>
  !u ? '—' : [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Unknown';

/** `YYYY-MM-DD` for <input type="date">, which rejects a full ISO timestamp. */
export const toDateInput = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

// ── Data hooks ────────────────────────────────────────────────────────────────

/** Clients trimmed to picker fields. Unpaginated, so every client is selectable. */
export function useClientOptions(token, department) {
  const [clients, setClients] = useState([]);
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/clients/options?department=${department}`, token)
      .then(r => { if (!cancelled) setClients(r.data || []); })
      .catch(() => { if (!cancelled) setClients([]); });
    return () => { cancelled = true; };
  }, [token, department]);
  return clients;
}

export function useUserOptions(token) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    let cancelled = false;
    apiFetch('/users', token)
      .then(r => { if (!cancelled) setUsers(r.data || []); })
      .catch(() => { if (!cancelled) setUsers([]); });
    return () => { cancelled = true; };
  }, [token]);
  return users;
}

/** Configured pipeline stages, used to drive status <select>s instead of free text. */
export function useStatusOptions(token, department) {
  const [statuses, setStatuses] = useState([]);
  const reload = useCallback(() => {
    apiFetch(`/statuses?department=${department}`, token)
      .then(r => setStatuses(r.data || []))
      .catch(() => setStatuses([]));
  }, [token, department]);
  useEffect(() => { reload(); }, [reload]);
  return [statuses, reload];
}

// ── Pickers ───────────────────────────────────────────────────────────────────

export function ClientPicker({ clients, value, onChange, label = 'Client *', required = true, allowNone = false }) {
  const options = [
    { value: '', label: allowNone ? '— None —' : 'Select a client…' },
    ...clients.map(c => ({ value: c._id, label: `${c.name}${c.clientId ? ` (${c.clientId})` : ''}` })),
  ];
  return (
    <Select
      label={label}
      name="client"
      required={required}
      value={value || ''}
      onChange={onChange}
      options={options}
      helperText={!clients.length ? 'No clients available — create a client first' : undefined}
    />
  );
}

export function UserPicker({ users, value, onChange, label = 'Assigned To', name = 'assignedTo' }) {
  const options = [
    { value: '', label: '— Unassigned —' },
    ...users.map(u => ({ value: u._id, label: userLabel(u) })),
  ];
  return <Select label={label} name={name} value={value || ''} onChange={onChange} options={options} />;
}

export function StatusPicker({ statuses, value, onChange, label = 'Status', name = 'status' }) {
  // Keep an existing value selectable even when it is not (or no longer) a
  // configured stage, so editing an old record never silently rewrites its status.
  const names = statuses.map(s => s.name);
  const options = [
    ...(value && !names.includes(value) ? [{ value, label: `${value} (unconfigured)` }] : []),
    ...statuses.map(s => ({ value: s.name, label: s.name })),
  ];
  if (!options.length) options.push({ value: value || '', label: value || 'No statuses configured' });
  return <Select label={label} name={name} value={value || ''} onChange={onChange} options={options} />;
}

/** Textarea styled to match the Input primitive, which has no multiline variant. */
export function TextArea({ label, rows = 3, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>}
      <textarea
        rows={rows}
        className={`min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 ${className}`}
        {...props}
      />
    </label>
  );
}

/** Confirm-before-destroy, so deletes never fire straight off a click. */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolver.current = resolve;
    setState(typeof opts === 'string' ? { message: opts } : opts);
  }), []);
  const settle = useCallback((ok) => { resolver.current?.(ok); resolver.current = null; setState(null); }, []);
  return { confirmState: state, confirm, settle };
}
