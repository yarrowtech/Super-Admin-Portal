import { useCallback, useEffect, useState } from 'react';
import { financeApi } from '../../services/finance';
import Button from '../common/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DataTable from '../ui/DataTable';
import ErrorState from '../ui/ErrorState';

const card = 'rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6';
const money = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);
const signedCls = (v) => (Number(v) < 0 ? 'text-rose-600 dark:text-rose-300' : '');
const thisYear = new Date().getFullYear();
const yearStart = `${thisYear}-01-01`;
const today = new Date().toISOString().slice(0, 10);

// Loads one report whenever `args` change; `loading` is derived from whether the stored
// result belongs to the current request, so the effect never writes state synchronously.
function useReport(fetcher, token, params) {
  const [state, setState] = useState({ key: null, error: '', data: null });
  const [nonce, setNonce] = useState(0);
  const serialized = JSON.stringify(params ?? null);
  const key = `${serialized}#${nonce}`;
  useEffect(() => {
    let alive = true;
    const arg = JSON.parse(serialized);
    (arg === null ? fetcher(token) : fetcher(token, arg)).then(
      (res) => { if (alive) setState({ key, error: '', data: res?.data ?? null }); },
      (err) => { if (alive) setState({ key, error: err.message || 'Could not load report', data: null }); },
    );
    return () => { alive = false; };
    // `fetcher` is a stable module-level API function; `key` covers token+params+reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, token]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return [{ loading: state.key !== key, error: state.key === key ? state.error : '', data: state.data }, reload];
}

// Monthly/yearly summary, revenue by customer and customer balances; all computed server-side
// from posted journals and issued invoices.
export default function FinanceReportExtras({ token }) {
  const [year, setYear] = useState(String(thisYear));
  const [range, setRange] = useState({ from: yearStart, to: today });
  const [pnl, reloadPnl] = useReport(financeApi.getDepartmentalPnl, token, range);
  const [period, reloadPeriod] = useReport(financeApi.getPeriodSummary, token, year);
  const [revenue, reloadRevenue] = useReport(financeApi.getRevenueReport, token, range);
  const [balances, reloadBalances] = useReport(financeApi.getCustomerBalances, token, null);
  const [downloadError, setDownloadError] = useState('');

  const download = async (kind, params) => {
    setDownloadError('');
    try { await financeApi.download(kind, params, token); } catch (err) { setDownloadError(err.message); }
  };

  const t = period.data?.totals;
  return (
    <div className="space-y-4">
      {downloadError && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300">{downloadError}</p>}

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Departmental profit &amp; loss</h2>
            <p className="text-sm text-neutral-500">{pnl.data?.basis || 'Revenue and direct costs per department, from posted journal lines.'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
        </div>
        {pnl.error && <ErrorState description={pnl.error} onRetry={reloadPnl} />}
        <DataTable
          rows={pnl.data?.departments || []}
          rowKey="department"
          loading={pnl.loading}
          emptyTitle="No posted activity in this range"
          emptyDescription="Revenue and costs appear here once invoices, expenses or payroll are posted to the ledger."
          columns={[
            { key: 'department', header: 'Department', render: (r) => <span className="font-semibold">{r.department}</span> },
            { key: 'revenue', header: 'Revenue', render: (r) => money(r.revenue) },
            { key: 'expenses', header: 'Direct costs', render: (r) => money(r.expenses) },
            { key: 'netIncome', header: 'Net', render: (r) => <span className={`font-semibold ${signedCls(r.netIncome)}`}>{money(r.netIncome)}</span> },
            { key: 'margin', header: 'Margin', render: (r) => (r.margin === null ? '—' : <span className={signedCls(r.margin)}>{r.margin.toFixed(1)}%</span>) },
          ]}
        />
        {pnl.data?.totals && (
          <p className="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            All departments: revenue {money(pnl.data.totals.revenue)} · direct costs {money(pnl.data.totals.expenses)} · net <span className={signedCls(pnl.data.totals.netIncome)}>{money(pnl.data.totals.netIncome)}</span>
          </p>
        )}
      </section>
      <section className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Monthly summary and cash flow</h2>
            <p className="text-sm text-neutral-500">Revenue and expenses on an accrual basis from posted journals; cash in/out from the cash and bank account.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Select label="Year" value={year} onChange={(e) => setYear(e.target.value)} options={Array.from({ length: 6 }, (_, i) => String(thisYear - i)).map((y) => ({ value: y, label: y }))} />
            <Button type="button" size="sm" variant="secondary" onClick={() => download('period', { year })}>CSV</Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => download('report', { format: 'pdf', from: `${year}-01-01`, to: `${year}-12-31` })}>PDF statement</Button>
          </div>
        </div>
        {period.error && <ErrorState description={period.error} onRetry={reloadPeriod} />}
        <DataTable
          rows={period.data?.months || []}
          rowKey="month"
          loading={period.loading}
          emptyTitle="No posted activity this year"
          columns={[
            { key: 'month', header: 'Month' },
            { key: 'revenue', header: 'Revenue', render: (r) => money(r.revenue) },
            { key: 'expenses', header: 'Expenses', render: (r) => money(r.expenses) },
            { key: 'netIncome', header: 'Net income', render: (r) => <span className={signedCls(r.netIncome)}>{money(r.netIncome)}</span> },
            { key: 'cashIn', header: 'Cash in', render: (r) => money(r.cashIn) },
            { key: 'cashOut', header: 'Cash out', render: (r) => money(r.cashOut) },
            { key: 'netCash', header: 'Net cash', render: (r) => <span className={signedCls(r.netCash)}>{money(r.netCash)}</span> },
          ]}
        />
        {t && (
          <p className="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            {year} total: revenue {money(t.revenue)} · expenses {money(t.expenses)} · net income <span className={signedCls(t.netIncome)}>{money(t.netIncome)}</span> · net cash <span className={signedCls(t.netCash)}>{money(t.netCash)}</span>
          </p>
        )}
      </section>

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Revenue by customer</h2>
            <p className="text-sm text-neutral-500">{revenue.data?.basis || 'Issued customer invoices by issue date.'}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Input label="From" type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            <Input label="To" type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
        </div>
        {revenue.error && <ErrorState description={revenue.error} onRetry={reloadRevenue} />}
        <DataTable
          rows={revenue.data?.rows || []}
          rowKey="customer"
          loading={revenue.loading}
          emptyTitle="No invoices issued in this range"
          columns={[
            { key: 'customer', header: 'Customer', render: (r) => <span className="font-semibold">{r.customer}</span> },
            { key: 'invoices', header: 'Invoices' },
            { key: 'billed', header: 'Billed', render: (r) => money(r.billed) },
            { key: 'gst', header: 'GST', render: (r) => money(r.gst) },
            { key: 'collected', header: 'Collected', render: (r) => money(r.collected) },
            { key: 'outstanding', header: 'Outstanding', render: (r) => money(r.outstanding) },
          ]}
        />
      </section>

      <section className={card}>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Customer balances</h2>
        <p className="mb-4 text-sm text-neutral-500">Open receivables per customer, with unapplied advance receipts.</p>
        {balances.error && <ErrorState description={balances.error} onRetry={reloadBalances} />}
        <DataTable
          rows={balances.data || []}
          rowKey="customer"
          loading={balances.loading}
          emptyTitle="No open customer balances"
          columns={[
            { key: 'customer', header: 'Customer', render: (r) => <span className="font-semibold">{r.customer}</span> },
            { key: 'invoices', header: 'Invoices' },
            { key: 'outstanding', header: 'Outstanding', render: (r) => money(r.outstanding) },
            { key: 'overdue', header: 'Overdue', render: (r) => <span className={Number(r.overdue) > 0 ? 'font-semibold text-rose-600 dark:text-rose-300' : ''}>{money(r.overdue)}</span> },
            { key: 'unappliedCredit', header: 'Unapplied receipts', render: (r) => money(r.unappliedCredit) },
          ]}
        />
      </section>
    </div>
  );
}
