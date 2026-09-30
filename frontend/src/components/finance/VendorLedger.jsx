import { useState } from 'react';
import { financeApi } from '../../services/finance';
import Button from '../common/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DataTable from '../ui/DataTable';

const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value) || 0);
const empty = () => ({ type: 'bill', amount: '', reference: '', date: new Date().toISOString().slice(0, 10), dueDate: '', method: 'bank', note: '' });
export default function VendorLedger({ vendors, token, user, onSaved }) {
  const [vendorId, setVendorId] = useState('');
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const vendor = vendors.find(item => item._id === vendorId);
  const head = ['finance_manager', 'admin', 'super_admin'].includes(user?.role);
  const canWrite = head || user?.role === 'finance_employee';
  const field = key => ({ value: form[key], onChange: e => setForm(previous => ({ ...previous, [key]: e.target.value })) });
  const submit = async event => {
    event.preventDefault();
    if (saving || !vendor) return;
    setSaving(true); setError(''); setMessage('');
    try {
      await financeApi.addVendorLedgerEntry(vendorId, { ...form, amount: Number(form.amount) }, token);
      setForm(empty());
      setMessage('Entry recorded. Vendor balance updated.');
      onSaved();
    } catch (err) { setError(err.message || 'Could not record entry.'); }
    finally { setSaving(false); }
  };
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h2 className="text-lg font-bold">Vendor account</h2>
      <p className="mb-4 text-sm text-neutral-500">Record supplier bills and payments, then review the account history. Payments are recorded by the Finance Head.</p>
      <Select label="Vendor" value={vendorId} disabled={saving} onChange={event => { setVendorId(event.target.value); setForm(empty()); setError(''); setMessage(''); }} options={[{ value: '', label: 'Select vendor' }, ...vendors.map(item => ({ value: item._id, label: item.name }))]} />
      {vendor && <>
        <p className="my-4 font-semibold">Outstanding payable: {money(vendor.balance)}</p>
        {canWrite && vendor.status === 'active' && <form onSubmit={submit} className="mb-5 space-y-3">
          <fieldset disabled={saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select label="Entry type" {...field('type')} options={[{ value: 'bill', label: 'Supplier bill' }, ...(head ? [{ value: 'payment', label: 'Payment made' }] : [])]} />
            <Input label="Amount" type="number" min="0.01" step="0.01" max={form.type === 'payment' ? vendor.balance : undefined} required {...field('amount')} />
            <Input label="Reference" maxLength={120} required {...field('reference')} />
            <Input label="Entry date" type="date" required {...field('date')} />
            {form.type === 'bill' ? <Input label="Due date" type="date" min={form.date} {...field('dueDate')} /> : <Select label="Payment method" {...field('method')} options={['bank', 'cash', 'online'].map(value => ({ value, label: value }))} />}
            <Input label="Note" maxLength={500} {...field('note')} />
          </fieldset>
          <Button type="submit" disabled={saving || (form.type === 'payment' && Number(vendor.balance) <= 0)}>{saving ? 'Saving...' : form.type === 'bill' ? 'Record bill' : 'Record payment made'}</Button>
          <p className="text-xs text-neutral-500">This records a completed payment; it does not initiate a bank transfer.</p>
        </form>}
        {error && <p role="alert" className="mb-3 text-sm text-rose-600">{error}</p>}
        {message && <p role="status" className="mb-3 text-sm text-emerald-600">{message}</p>}
        <DataTable rows={[...(vendor.ledger || [])].reverse()} rowKey="_id" emptyTitle="No entries recorded" columns={[
          { key: 'date', header: 'Date', render: row => new Date(row.date).toLocaleDateString('en-IN') },
          { key: 'type', header: 'Type', render: row => row.type === 'bill' ? 'Bill' : 'Payment' },
          { key: 'reference', header: 'Reference' },
          { key: 'amount', header: 'Amount', render: row => money(row.amount) },
          { key: 'createdByName', header: 'Recorded by' },
          { key: 'note', header: 'Note' },
        ]} />
      </>}
    </section>
  );
}
