import Modal from '../ui/Modal';
import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import OutsourcingSidebar from './OutsourcingSidebar';
import { useSidebar } from '../../context/SidebarContext';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import OnboardingTour from './OnboardingTour';

// ─── Quick Log Time — floating button + modal ────────────────────────────────
const QuickLogModal = ({ onClose, token }) => {
  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({
    contractId: '',
    logDate: new Date().toISOString().slice(0, 10),
    hours: '',
    workSummary: '',
    note: '',
    workStatus: 'in_progress',
  });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    outsourcingApi.getContracts(token)
      .then((r) => setContracts((r.data || []).filter((c) => c.status === 'active')))
      .catch(() => {});
  }, [token]);

  const fld = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.contractId || !form.hours) { setMsg('Contract and hours are required.'); return; }
    setSubmitting(true); setMsg('');
    try {
      await outsourcingApi.logTime(token, { ...form, hours: Number(form.hours) });
      setMsg('✓ Time logged successfully!');
      setTimeout(onClose, 1200);
    } catch (err) { setMsg(err.message || 'Failed to log time'); }
    finally { setSubmitting(false); }
  };

  const inputCls = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

  return (
    <Modal open onClose={onClose} title="Log time" description="Record work against an active contract." className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-3 p-5">
          <div>
            <label htmlFor="quick-log-contractId" className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Contract <span className="text-rose-500">*</span></label>
            <select id="quick-log-contractId" value={form.contractId} onChange={fld('contractId')} required className={inputCls}>
              <option value="">Select active contract…</option>
              {contracts.map((c) => (
                <option key={c._id} value={c._id}>{c?.job?.title || 'Contract'} ({c.paymentType})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="quick-log-logDate" className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Date</label>
              <input type="date" id="quick-log-logDate" value={form.logDate} onChange={fld('logDate')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="quick-log-hours" className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Hours <span className="text-rose-500">*</span></label>
              <input type="number" min="0.5" max="24" step="0.5" placeholder="e.g. 4" id="quick-log-hours" value={form.hours} onChange={fld('hours')} className={inputCls} />
            </div>
          </div>
          <div>
            <label htmlFor="quick-log-workSummary" className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Work Summary</label>
            <input placeholder="What did you work on?" id="quick-log-workSummary" value={form.workSummary} onChange={fld('workSummary')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="quick-log-note" className="mb-1 block text-xs font-semibold text-neutral-500 dark:text-neutral-400">Notes <span className="font-normal text-neutral-400">(optional)</span></label>
            <textarea rows={2} placeholder="Any additional notes…" id="quick-log-note" value={form.note} onChange={fld('note')} className={`${inputCls} resize-none`} />
          </div>
          {msg && (
            <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'}`}>
              {msg}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
              {submitting ? 'Logging…' : 'Log Time'}
            </button>
          </div>
        </form>
    </Modal>
  );
};

// ─── Portal shell ─────────────────────────────────────────────────────────────
const OutsourcingPortal = () => {
  const { collapsed } = useSidebar();
  const { token } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  return (
    <div
      className="portal-shell flex min-h-screen overflow-x-clip bg-neutral-50 font-display text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
      data-role="outsourcing"
    >
      <OutsourcingSidebar isOpen={isMenuOpen} onClose={closeMenu} />

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(true)}
        className="fixed left-3 top-3 z-30 inline-flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white/95 text-neutral-800 shadow-md backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95 dark:text-neutral-100 md:hidden"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]">menu</span>
      </button>

      <div className={`flex-1 px-3 pb-4 pt-16 transition-[margin] duration-300 ease-out-expo md:px-6 md:pt-6 ${collapsed ? 'md:ml-16' : 'md:ml-[250px]'}`}>
        <div className="mx-auto w-full max-w-[1500px]">
          <Outlet />
        </div>
      </div>

      {/* Floating Quick Log button */}
      <button
        onClick={() => setShowQuickLog(true)}
        title="Log Time"
        aria-label="Log time"
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl active:translate-y-0"
      >
        <span className="material-symbols-outlined text-[22px]">add</span>
        <span className="material-symbols-outlined absolute -top-1.5 -right-1.5 text-[14px] rounded-full bg-white text-indigo-600 shadow">schedule</span>
      </button>

      {showQuickLog && <QuickLogModal token={token} onClose={() => setShowQuickLog(false)} />}

      <OnboardingTour />
    </div>
  );
};

export default OutsourcingPortal;
