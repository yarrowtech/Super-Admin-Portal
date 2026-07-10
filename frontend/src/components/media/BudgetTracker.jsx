import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const input = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500';

const BudgetTracker = ({ projectId }) => {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [totalBudget, setTotalBudget] = useState('');
  const [expenseForm, setExpenseForm] = useState({ platform: '', category: 'general', amount: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!token || !projectId) return;
    try {
      const [summaryRes, expensesRes] = await Promise.all([
        departmentApi.getMediaBudgetSummary(token, { projectId }),
        departmentApi.getMediaExpenses(token, { projectId }),
      ]);
      setSummary(summaryRes?.data || null);
      setTotalBudget(String(summaryRes?.data?.totalBudget ?? ''));
      setExpenses(expensesRes?.data?.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load budget data.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const saveTotalBudget = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await departmentApi.updateMediaBudgetAllocation(token, { totalBudget: Number(totalBudget) || 0 }, { projectId });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to update budget.');
    } finally {
      setBusy(false);
    }
  };

  const recordExpense = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await departmentApi.createMediaExpense(token, {
        platform: expenseForm.platform.trim(),
        category: expenseForm.category.trim() || 'general',
        amount: Number(expenseForm.amount) || 0,
        note: expenseForm.note.trim(),
      }, { projectId });
      setExpenseForm({ platform: '', category: 'general', amount: '', note: '' });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setBusy(false);
    }
  };

  if (!projectId) {
    return (
      <section className={card}>
        <h2 className="text-xl font-black text-slate-950 dark:text-neutral-100">Budget Control</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Select a project to manage campaign budget and expenses.</p>
      </section>
    );
  }

  const tiles = [
    ['Total', money(summary?.totalBudget)],
    ['Used', money(summary?.used)],
    ['Remaining', money(summary?.remaining)],
    ['ROI', `${(summary?.roi || 0).toFixed(1)}%`],
    ['ROAS', `${(summary?.roas || 0).toFixed(2)}x`],
    ['Cost / Lead', money(summary?.cpl)],
  ];

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">payments</span>
          <div>
            <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Budget Control</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Allocate spend, record expenses, and monitor ROI, ROAS, and cost per lead.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([label, value]) => (
          <div key={label} className={card}>
            <p className="text-[11px] font-semibold uppercase text-neutral-500 dark:text-neutral-400">{label}</p>
            <p className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form onSubmit={saveTotalBudget} className={card}>
          <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Total project budget</p>
          <div className="flex gap-2">
            <input type="number" min="0" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} className={`flex-1 ${input}`} placeholder="0" />
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">Save</button>
          </div>
        </form>

        <form onSubmit={recordExpense} className={`${card} grid grid-cols-2 gap-2`}>
          <p className="col-span-2 mb-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Record expense</p>
          <input value={expenseForm.platform} onChange={(e) => setExpenseForm((f) => ({ ...f, platform: e.target.value }))} placeholder="Platform" className={input} />
          <input value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category" className={input} />
          <input type="number" min="0" required value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} placeholder="Amount" className={input} />
          <input value={expenseForm.note} onChange={(e) => setExpenseForm((f) => ({ ...f, note: e.target.value }))} placeholder="Note" className={input} />
          <button type="submit" disabled={busy} className="col-span-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">Add expense</button>
        </form>
      </div>

      <div className={card}>
        <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">Recent expenses</p>
        {expenses.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-neutral-800">
              <thead className="bg-slate-50 text-left text-xs uppercase text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
                <tr><th className="px-3 py-2">Platform</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Date</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-neutral-700 dark:divide-neutral-800 dark:text-neutral-300">
                {expenses.map((expense) => (
                  <tr key={expense._id}>
                    <td className="px-3 py-2">{expense.platform || '-'}</td>
                    <td className="px-3 py-2">{expense.category}</td>
                    <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">{money(expense.amount)}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{new Date(expense.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
            No expenses recorded
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;
