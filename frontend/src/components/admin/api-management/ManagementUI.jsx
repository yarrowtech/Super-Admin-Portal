import React, { useId, useState } from 'react';
import Button from '../../common/Button';
import SectionCard from '../../ui/SectionCard';
import Modal from '../../ui/Modal';
import { INPUT } from './config';

export function Icon({ name, className = '' }) {
  return <span aria-hidden="true" className={`material-symbols-outlined text-[19px] ${className}`}>{name}</span>;
}
export function Action({ children, variant = 'secondary', icon, ...props }) {
  return <Button size="sm" variant={variant} icon={icon ? <Icon name={icon} /> : undefined} {...props}>{children}</Button>;
}
export function Panel({ children, className = '', ...props }) {
  return <SectionCard className={`mb-5 ${className}`} {...props}>{children}</SectionCard>;
}
export function Field({ label, hint, children, className = '' }) {
  const id = useId();
  return <div className={`min-w-0 ${className}`}><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</label>{React.isValidElement(children) ? React.cloneElement(children, { id, 'aria-describedby': hint ? `${id}-hint` : undefined }) : children}{hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{hint}</p>}</div>;
}
export function Select({ options, placeholder = 'Select an option', ...props }) {
  return <select className={INPUT} {...props}><option value="">{placeholder}</option>{options.map(option => <option key={option.value ?? option._id} value={option.value ?? option._id}>{option.label ?? option.name}</option>)}</select>;
}
export function Badge({ children, tone = 'neutral' }) {
  const colors = {
    neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  };
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${colors[tone] || colors.neutral}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{children}</span>;
}
export function ConnectionStatus({ status }) {
  return <Badge tone={{ Connected: 'success', Pending: 'warning', Error: 'danger', 'Not Connected': 'info' }[status]}>{status === 'Not Connected' ? 'Test passed · inactive' : status}</Badge>;
}
export function Empty({ title, description, icon = 'inbox', action }) {
  return <div className="flex flex-col items-center rounded-xl border border-dashed border-neutral-200 px-5 py-10 text-center dark:border-neutral-700"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800"><Icon name={icon} /></div><h3 className="text-sm font-semibold">{title}</h3>{description && <p className="mt-1.5 max-w-md text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}
export function DataTable({ columns, rows, emptyTitle = 'No activity yet', emptyDescription, emptyAction }) {
  if (!rows.length) return <Empty title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  return <div className="max-w-full overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800"><table className="w-full text-left text-sm"><thead className="bg-neutral-50 dark:bg-neutral-950"><tr>{columns.map(column => <th key={column} scope="col" className="whitespace-nowrap border-b border-neutral-200 px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">{column}</th>)}</tr></thead><tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">{rows.map((row, index) => <tr key={row.key ?? index} className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">{(row.cells || row).map((cell, cellIndex) => <td key={cellIndex} className="max-w-sm px-4 py-3.5 align-top [overflow-wrap:anywhere]">{cell ?? <span className="text-neutral-400">—</span>}</td>)}</tr>)}</tbody></table></div>;
}
export function Notice({ children, tone = 'info' }) {
  return <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-relaxed ${tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200' : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400'}`}><Icon name={tone === 'warning' ? 'info' : 'info_outline'} className="mt-0.5 shrink-0" /><div className="min-w-0">{children}</div></div>;
}
export function CopyValue({ value, label = 'Copy', secret = false }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return <div className="flex min-w-0 flex-wrap items-start gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950"><code className={`min-w-0 flex-1 break-all text-xs leading-relaxed ${secret ? 'select-all' : ''}`}>{value}</code><Action icon={copied ? 'check' : 'content_copy'} onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setError(false); } catch { setError(true); } }}>{copied ? 'Copied' : label}</Action>{error && <p className="w-full text-xs text-red-600">Copy is unavailable. Select the value and copy it manually.</p>}</div>;
}
export function ConfirmDialog({ title, description, confirmLabel, onConfirm, onClose, busy, children }) {
  const [error, setError] = useState('');
  const confirm = async () => {
    setError('');
    try { const result = await onConfirm(); if (result?.ok === false) setError(result.error || 'The change could not be saved. Please try again.'); }
    catch { setError('The change could not be saved. Please try again.'); }
  };
  return <Modal open title={title} description={description} onClose={busy ? () => {} : onClose} footer={<div className="flex justify-end gap-2"><Action disabled={busy} onClick={onClose}>Cancel</Action><Action variant="accent" loading={busy} onClick={confirm}>{confirmLabel}</Action></div>}><div className="space-y-4">{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</p>}{children}</div></Modal>;
}
export function SecretDialog({ value, onClose, title = 'New server credential' }) {
  return <Modal open title={title} description="This credential is shown only once." onClose={onClose} footer={<div className="flex justify-end"><Action variant="accent" onClick={onClose}>I have saved this credential</Action></div>}><div className="space-y-4"><Notice tone="warning">Save this value in the destination server's secret store. Keep it out of frontend code and browser storage.</Notice><CopyValue value={value} secret /></div></Modal>;
}
