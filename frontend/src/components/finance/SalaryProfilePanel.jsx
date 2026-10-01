import { useCallback, useEffect, useState } from 'react';
import { financeApi } from '../../services/finance';
import Button from '../common/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DataTable from '../ui/DataTable';
import ErrorState from '../ui/ErrorState';

const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);
const paise = (n) => Number(n || 0) / 100;
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');
const emptyForm = () => ({ employee: '', departmentId: '', basePay: '', allowances: '', deductions: '', effectiveFrom: new Date().toISOString().slice(0, 10) });

// Finance-head only: authorizes the salary components every payroll run is calculated from.
export default function SalaryProfilePanel({ token, departments, onSaved }) {
  // `loading` is derived from whether the stored result matches the current request,
  // so the effect never writes state synchronously.
  const [state, setState] = useState({ key: null, error: '', profiles: [], employees: [] });
  const [nonce, setNonce] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const key = `${token || ''}#${nonce}`;

  useEffect(() => {
    let alive = true;
    Promise.all([financeApi.getSalaryProfiles(token), financeApi.getSalaryEmployees(token)]).then(
      ([profiles, employees]) => { if (alive) setState({ key, error: '', profiles: profiles?.data || [], employees: employees?.data || [] }); },
      (err) => { if (alive) setState({ key, error: err.message || 'Could not load salary profiles', profiles: [], employees: [] }); },
    );
    return () => { alive = false; };
  }, [key, token]);
  const load = useCallback(() => setNonce((n) => n + 1), []);
  const loading = state.key !== key;

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })) });
  const net = (Number(form.basePay) || 0) + (Number(form.allowances) || 0) - (Number(form.deductions) || 0);

  const existing = state.profiles.find((p) => String(p.employee?._id || p.employee) === String(form.employee));

  const save = async (e) => {
    e.preventDefault();
    if (net <= 0) { setError('Net salary must be greater than zero.'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      await financeApi.saveSalaryProfile({
        employee: form.employee,
        departmentId: form.departmentId,
        basePay: form.basePay,
        allowances: form.allowances || 0,
        deductions: form.deductions || 0,
        effectiveFrom: form.effectiveFrom,
      }, token);
      setMessage(`Salary authorized — net ${money(net)} per month.`);
      setForm(emptyForm());
      load();
      onSaved?.();
    } catch (err) { setError(err.message || 'Could not save the salary profile'); }
    finally { setSaving(false); }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
      <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Salary profiles</h2>
      <p className="mb-4 text-sm text-neutral-500">Payroll runs take gross pay and deductions from these authorized amounts, so a run never carries typed-in figures. Saving an employee again replaces their profile for future runs; runs already processed keep the amounts they were approved with.</p>
      {state.error && <ErrorState description={state.error} onRetry={load} />}
      <DataTable
        rows={state.profiles}
        rowKey="_id"
        loading={loading}
        emptyTitle="No salary profiles yet"
        emptyDescription="Add one below before creating a payroll run."
        columns={[
          { key: 'employee', header: 'Employee', render: (r) => <span className="font-semibold">{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—'}</span> },
          { key: 'base', header: 'Base', render: (r) => money(paise(r.baseMinor)) },
          { key: 'allow', header: 'Allowances', render: (r) => money(paise(r.allowanceMinor)) },
          { key: 'deduct', header: 'Deductions', render: (r) => money(paise(r.deductionMinor)) },
          { key: 'net', header: 'Net', render: (r) => <span className="font-semibold">{money(paise(r.baseMinor) + paise(r.allowanceMinor) - paise(r.deductionMinor))}</span> },
          { key: 'effectiveFrom', header: 'Effective', render: (r) => day(r.effectiveFrom) },
        ]}
      />
      <form onSubmit={save} className="mt-5 space-y-3">
        <fieldset disabled={saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Employee" {...field('employee')} required options={[{ value: '', label: 'Select an employee' }, ...state.employees.map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))]} />
          <Select label="Department" {...field('departmentId')} required options={[{ value: '', label: 'Select a department' }, ...departments.map((d) => ({ value: d._id, label: d.name }))]} />
          <Input label="Base pay (monthly)" type="number" min="0.01" step="0.01" required {...field('basePay')} />
          <Input label="Allowances" type="number" min="0" step="0.01" {...field('allowances')} />
          <Input label="Deductions" type="number" min="0" step="0.01" {...field('deductions')} />
          <Input label="Effective from" type="date" required {...field('effectiveFrom')} />
        </fieldset>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Net payable: <span className="font-bold text-neutral-900 dark:text-white">{money(net)}</span>
          {existing && <span className="ml-2 text-xs text-amber-600 dark:text-amber-300">Replaces the existing profile for this employee.</span>}
        </p>
        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        {message && <p role="status" className="text-sm text-emerald-600">{message}</p>}
        <Button type="submit" size="sm" variant="primary" disabled={saving || net <= 0}>{saving ? 'Saving…' : 'Authorize salary'}</Button>
      </form>
    </section>
  );
}
