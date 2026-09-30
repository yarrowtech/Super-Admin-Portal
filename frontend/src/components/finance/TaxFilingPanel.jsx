import { useCallback, useEffect, useState } from 'react';
import { financeApi } from '../../services/finance';
import Button from '../common/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DataTable from '../ui/DataTable';
import ErrorState from '../ui/ErrorState';

const card = 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6';
const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);
const day = (v) => (v ? new Date(v).toLocaleDateString('en-IN') : '—');
const iso = (d) => d.toISOString().slice(0, 10);
const monthRange = () => {
  const now = new Date();
  return { from: iso(new Date(Date.UTC(now.getFullYear(), now.getMonth() - 1, 1))), to: iso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), 0))) };
};
const emptyRule = () => ({ kind: 'gst', code: '', name: '', section: '', rate: '', effectiveFrom: iso(new Date()), notes: '' });

// Tax rules drive every invoice's GST/TDS; worksheets prepare filings (no GSTN/TRACES connection).
export default function TaxFilingPanel({ token, isHead, canExportAudit }) {
  const [rules, setRules] = useState({ loading: true, error: '', items: [] });
  const [form, setForm] = useState(emptyRule);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [range, setRange] = useState(monthRange);
  const [sheet, setSheet] = useState({ kind: 'gst', loading: false, error: '', data: null });

  const loadRules = useCallback(async () => {
    try {
      const res = await financeApi.getTaxRules(token);
      setRules({ loading: false, error: '', items: res?.data || [] });
    } catch (err) {
      setRules({ loading: false, error: err.message || 'Could not load tax rules', items: [] });
    }
  }, [token]);
  useEffect(() => { loadRules(); }, [loadRules]);

  const field = (key) => ({ value: form[key], onChange: (e) => setForm((p) => ({ ...p, [key]: e.target.value })) });

  const addRule = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError(''); setMessage('');
    try {
      await financeApi.createTaxRule({ ...form, rate: form.rate }, token);
      setMessage(`${form.code.toUpperCase()} at ${form.rate}% is effective from ${day(form.effectiveFrom)}.`);
      setForm(emptyRule());
      loadRules();
    } catch (err) { setFormError(err.message || 'Could not save the rule'); }
    finally { setSaving(false); }
  };

  const closeRule = async (rule) => {
    const end = window.prompt(`Last day ${rule.code} applies (YYYY-MM-DD):`, iso(new Date()));
    if (!end) return;
    try { await financeApi.updateTaxRule(rule._id, { effectiveTo: end }, token); setMessage(`${rule.code} closed from ${day(end)}.`); loadRules(); }
    catch (err) { setFormError(err.message || 'Could not close the rule'); }
  };

  const loadSheet = async (kind) => {
    setSheet({ kind, loading: true, error: '', data: null });
    try {
      const res = kind === 'gst' ? await financeApi.getGstReturn(token, range) : await financeApi.getTdsReturn(token, range);
      setSheet({ kind, loading: false, error: '', data: res?.data });
    } catch (err) { setSheet({ kind, loading: false, error: err.message || 'Could not prepare the worksheet', data: null }); }
  };

  const download = async (kind) => {
    try { await financeApi.download(kind, range, token); }
    catch (err) { setSheet((s) => ({ ...s, error: err.message })); }
  };

  const d = sheet.data;
  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Tax rules</h2>
        <p className="mb-4 text-sm text-neutral-500">Invoices can only use GST and TDS rates that have an active rule on the invoice date. To change a rate, close the old rule and add a new one; issued invoices keep the rate they were issued with.</p>
        {rules.error && <ErrorState description={rules.error} onRetry={loadRules} />}
        <DataTable
          rows={rules.items}
          rowKey="_id"
          loading={rules.loading}
          emptyTitle="No tax rules configured"
          emptyDescription="Until rules are added, invoices can only be issued without GST or TDS."
          columns={[
            { key: 'kind', header: 'Tax', render: (r) => r.kind.toUpperCase() },
            { key: 'code', header: 'Code', render: (r) => <span className="font-semibold">{r.code}</span> },
            { key: 'rate', header: 'Rate', render: (r) => `${r.rate}%` },
            { key: 'section', header: 'Section', render: (r) => r.section || '—' },
            { key: 'effectiveFrom', header: 'Effective', render: (r) => `${day(r.effectiveFrom)} → ${r.effectiveTo ? day(r.effectiveTo) : 'open'}` },
            { key: 'actions', header: '', render: (r) => isHead && !r.effectiveTo && <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => closeRule(r)}>Close</button> },
          ]}
        />
        {isHead && (
          <form onSubmit={addRule} className="mt-5 space-y-3">
            <fieldset disabled={saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Tax" {...field('kind')} options={[{ value: 'gst', label: 'GST' }, { value: 'tds', label: 'TDS' }]} />
              <Input label="Code" placeholder={form.kind === 'gst' ? 'GST18' : '194J'} maxLength={40} required {...field('code')} />
              <Input label="Name" placeholder="Standard rate" maxLength={120} required {...field('name')} />
              <Input label="Rate %" type="number" min="0" max="100" step="0.01" required {...field('rate')} />
              {form.kind === 'tds' && <Input label="Section" placeholder="194J" maxLength={40} {...field('section')} />}
              <Input label="Effective from" type="date" required {...field('effectiveFrom')} />
              <Input label="Notes / source" placeholder="Notification or circular reference" maxLength={1000} {...field('notes')} />
            </fieldset>
            {formError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{formError}</p>}
            <Button type="submit" size="sm" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Add rule'}</Button>
          </form>
        )}
        {message && <p role="status" className="mt-3 text-sm text-emerald-600">{message}</p>}
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Filing preparation</h2>
        <p className="mb-4 text-sm text-neutral-500">Worksheets are built from issued invoices and credit/debit notes. Online filing (GSTN, TRACES) is <strong>not connected</strong>, so file through the government portal or your GSP and record the acknowledgement in the tracker below.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr,1fr,auto,auto] sm:items-end">
          <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          <Button type="button" size="sm" variant="secondary" onClick={() => loadSheet('gst')} disabled={sheet.loading}>GST worksheet</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => loadSheet('tds')} disabled={sheet.loading}>TDS worksheet</Button>
        </div>
        {sheet.loading && <p className="mt-4 text-sm text-neutral-500">Preparing…</p>}
        {sheet.error && <p role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-300">{sheet.error}</p>}
        {d && sheet.kind === 'gst' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Output GST" value={money(d.outputTax)} />
              <Stat label="Note adjustments" value={money(d.noteAdjustment)} />
              <Stat label="Net output GST" value={money(d.netOutputTax)} />
            </div>
            <DataTable rows={d.rates} rowKey="rate" emptyTitle="No invoices in this period" columns={[
              { key: 'rate', header: 'Rate', render: (r) => `${r.rate}%` },
              { key: 'lines', header: 'Lines' },
              { key: 'taxableValue', header: 'Taxable value', render: (r) => money(r.taxableValue) },
              { key: 'tax', header: 'GST', render: (r) => money(r.tax) },
            ]} />
          </div>
        )}
        {d && sheet.kind === 'tds' && (
          <div className="mt-4 space-y-3">
            <Stat label="TDS deducted by customers (claimable)" value={money(d.tdsReceivable)} />
            <DataTable rows={d.rows} rowKey="invoiceNumber" emptyTitle="No TDS deductions in this period" columns={[
              { key: 'invoiceNumber', header: 'Invoice' },
              { key: 'customer', header: 'Customer' },
              { key: 'section', header: 'Section', render: (r) => r.section || '—' },
              { key: 'rate', header: 'Rate', render: (r) => `${r.rate}%` },
              { key: 'tds', header: 'TDS', render: (r) => money(r.tds) },
            ]} />
          </div>
        )}
        {d && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => download(sheet.kind)}>
              <span className="material-symbols-outlined mr-1 text-[16px]">download</span>Export {sheet.kind.toUpperCase()} CSV
            </Button>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">Online filing: not connected</span>
          </div>
        )}
        {canExportAudit && (
          <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
            <p className="mb-2 text-sm text-neutral-500">Audit data export: every financial change in the date range above, with who made it and when.</p>
            <Button type="button" size="sm" variant="secondary" onClick={() => download('audit')}>
              <span className="material-symbols-outlined mr-1 text-[16px]">download</span>Export audit trail
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
    </div>
  );
}
