import { useEffect, useRef, useState } from 'react';
const inputClass = 'mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700';

export default function WorkspaceRecordEditor({ kind, record, productId, options, optionsLoading, error, saving, onClose, onSave }) {
  const editing = Boolean(record._id);
  const formRef = useRef(null);
  const [form, setForm] = useState(() => ({ name: record.name || '', description: record.description || '', status: record.status || (kind === 'ticket' ? 'open' : 'active'),
    productId: record.productId || productId || '', customerId: record.customerId || '', planId: record.planId || '', email: record.email || '', phone: record.phone || '', priority: record.priority || 'normal',
    price: record.amountMinor === undefined ? '' : String(record.amountMinor / 100), currency: record.currency || 'INR', billingInterval: record.billingInterval || 'monthly',
    startsAt: record.startsAt ? new Date(record.startsAt).toISOString().slice(0, 10) : '', endsAt: record.endsAt ? new Date(record.endsAt).toISOString().slice(0, 10) : '',
  }));
  useEffect(() => { const previous = document.activeElement; formRef.current?.querySelector('input')?.focus(); return () => previous?.focus(); }, []);
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value, ...(field === 'productId' ? { planId: '' } : {}) }));
  const submit = (event) => {
    event.preventDefault();
    const body = { name: form.name, description: form.description, status: form.status };
    if (!editing) body.idempotencyKey = record.idempotencyKey;
    if (!editing && ['plan', 'subscription'].includes(kind)) body.productId = form.productId;
    if (!editing && kind === 'ticket' && form.productId) body.productId = form.productId;
    if (!editing && kind === 'subscription') { body.customerId = form.customerId; body.planId = form.planId; }
    if (kind === 'customer') { body.email = form.email; body.phone = form.phone; }
    if (kind === 'ticket') body.priority = form.priority;
    if (kind === 'plan') { body.amountMinor = Math.round(Number(form.price) * 100); body.currency = form.currency; body.billingInterval = form.billingInterval; }
    if (kind === 'subscription') { if (form.startsAt) body.startsAt = new Date(form.startsAt).toISOString(); if (form.endsAt) body.endsAt = new Date(form.endsAt).toISOString(); }
    onSave(body);
  };
  const field = (name, label, type = 'text', required = false) => <label className="block text-sm">{label}<input className={inputClass} type={type} required={required} value={form[name]} onChange={set(name)} maxLength={name === 'name' ? 200 : undefined} {...(type === 'number' ? { min: 0, step: '0.01' } : {})} /></label>;
  const select = (name, label, values, required = true) => <label className="block text-sm">{label}<select required={required} className={inputClass} value={form[name]} onChange={set(name)}><option value="">Select</option>{values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
  const statuses = kind === 'ticket' ? ['open', 'in_progress', 'resolved', 'closed'] : ['active', 'inactive'];
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onKeyDown={(event) => {
    if (event.key === 'Escape' && !saving) onClose();
    if (event.key === 'Tab') { const fields = [...formRef.current.querySelectorAll('input, select, textarea, button')].filter((element) => !element.disabled); if (event.shiftKey && document.activeElement === fields[0]) { event.preventDefault(); fields.at(-1)?.focus(); } else if (!event.shiftKey && document.activeElement === fields.at(-1)) { event.preventDefault(); fields[0]?.focus(); } }
  }}><form ref={formRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="record-editor-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-6 text-neutral-900 shadow-xl dark:bg-neutral-950 dark:text-white">
    <h2 id="record-editor-title" className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} {kind}</h2><fieldset disabled={saving} className="mt-4 space-y-4">
      {field('name', 'Name', 'text', true)}<label className="block text-sm">Description<textarea className={inputClass} rows={3} maxLength={5000} value={form.description} onChange={set('description')} /></label>
      {select('status', 'Status', statuses.map((value) => ({ value, label: value.replaceAll('_', ' ') })))}
      {!editing && ['plan', 'subscription', 'ticket'].includes(kind) ? select('productId', 'Product', (options?.products || []).filter((item) => item.status === 'active').map((item) => ({ value: item._id, label: item.name })), kind !== 'ticket') : null}
      {!editing && kind === 'subscription' ? <>{select('customerId', 'Customer', (options?.customers || []).filter((item) => item.status === 'active').map((item) => ({ value: item._id, label: item.name })))}{select('planId', 'Plan', (options?.plans || []).filter((item) => item.status === 'active' && item.productId === form.productId).map((item) => ({ value: item._id, label: item.name })))}</> : null}
      {kind === 'plan' ? <div className="grid grid-cols-2 gap-4">{field('price', 'Price', 'number', true)}{select('currency', 'Currency', ['INR', 'USD', 'EUR', 'GBP'].map((value) => ({ value, label: value })))}{select('billingInterval', 'Billing interval', ['monthly', 'yearly', 'one_time'].map((value) => ({ value, label: value.replaceAll('_', ' ') })))}</div> : null}
      {kind === 'subscription' ? <div className="grid grid-cols-2 gap-4">{field('startsAt', 'Start date', 'date')}{field('endsAt', 'End date', 'date')}</div> : null}
      {kind === 'customer' ? <>{field('email', 'Email', 'email')}{field('phone', 'Phone', 'tel')}</> : null}
      {kind === 'ticket' ? select('priority', 'Priority', ['low', 'normal', 'high', 'urgent'].map((value) => ({ value, label: value }))) : null}
    </fieldset>{optionsLoading ? <p className="mt-3 text-sm">Loading options...</p> : null}{error ? <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p> : null}
    <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={saving || optionsLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button></div>
  </form></div>;
}
