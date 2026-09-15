import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { policyService } from '../../services/policy';
import Button from '../ui/Button';

// A server-authoritative policy gate. Local storage supplies only UI project
// context; it is never considered evidence of acceptance.
export default function PolicyGate({ children }) {
  const { token, user } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  // Dedicated projects set VITE_POLICY_PROJECT_ID at build time. The central
  // portal intentionally falls back to its selected project context.
  const projectId = (() => {
    const configured = String(import.meta.env.VITE_POLICY_PROJECT_ID || '').trim();
    if (configured) return configured;
    try { return localStorage.getItem('activeProjectId') || ''; } catch { return ''; }
  })();

  useEffect(() => {
    let cancelled = false;
    if (!token || !user || !projectId || projectId === 'all') { setRequirements([]); return undefined; }
    setLoading(true); setError('');
    policyService.requirements(token, projectId)
      .then((response) => { if (!cancelled) setRequirements(response?.data?.outstanding || []); })
      .catch((requestError) => { if (!cancelled && requestError?.status !== 403) setError('Unable to verify policy requirements. Please retry.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, token, user]);

  const accept = async (item) => {
    setAccepting(true); setError('');
    try {
      await policyService.accept(token, item._id, projectId);
      setRequirements((current) => current.filter((policy) => policy._id !== item._id));
    } catch (requestError) { setError(requestError?.message || 'Your acceptance could not be saved.'); }
    finally { setAccepting(false); }
  };

  const current = requirements[0];
  return <>
    {children}
    {(loading || current) && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Policy agreement required">
      <section className="max-h-[95dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900 sm:max-w-2xl sm:rounded-2xl sm:p-7">
        {loading ? <p className="text-sm text-neutral-600 dark:text-neutral-300">Checking policy requirements…</p> : <>
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--portal-accent)]">Policy agreement required</p>
          <h1 className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{current.currentVersion?.title || current.title}</h1>
          {current.currentVersion?.summary && <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">{current.currentVersion.summary}</p>}
          <div className="mt-5 space-y-4">
            {(current.currentVersion?.sections || []).map((section) => <article key={section._id || section.key} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700"><h2 className="font-bold text-neutral-900 dark:text-white">{section.title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600 dark:text-neutral-300">{section.content}</p></article>)}
          </div>
          {error && <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p>}
          <div className="mt-6 flex justify-end"><Button onClick={() => accept(current)} disabled={accepting}>{accepting ? 'Saving…' : 'I have read and agree'}</Button></div>
        </>}
      </section>
    </div>}
  </>;
}
