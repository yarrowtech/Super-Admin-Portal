import React, { useEffect, useState } from 'react';
import { getDocumentVersions, restoreVersion } from '../../api/legalDocument';
import { useAuth } from '../../context/AuthContext';

const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const LegalDocVersionHistory = ({ docId, isLocked, currentVersion, onRestored, onClose, onPreviewVersion }) => {
  const { token } = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    getDocumentVersions(token, docId)
      .then((res) => setVersions(res.data || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [docId, token]);

  const handleRestore = async (v) => {
    if (!window.confirm(`Restore document to ${v.version}? This will create a new version.`)) return;
    setRestoring(v._id);
    try {
      await restoreVersion(token, docId, v._id);
      onRestored?.();
      onClose?.();
    } catch (err) {
      alert(err.message || 'Restore failed');
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40">
      <div className="flex h-full w-full max-w-lg flex-col bg-white dark:bg-neutral-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Version History</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Current: <span className="font-semibold text-rose-600">{currentVersion}</span> • {versions.length} version{versions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-xl text-neutral-500">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              ))}
            </div>
          )}
          {error && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          {!loading && !error && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">history</span>
              <p className="text-sm">No version history yet</p>
            </div>
          )}
          {!loading && versions.map((v, idx) => (
            <div
              key={v._id}
              className={`mb-3 rounded-xl border p-4 transition-all ${
                v.version === currentVersion
                  ? 'border-rose-300 bg-rose-50 dark:border-rose-700 dark:bg-rose-900/10'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-bold ${v.version === currentVersion ? 'text-rose-600' : 'text-neutral-800 dark:text-neutral-200'}`}>
                      {v.version}
                    </span>
                    {idx === 0 && (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Latest
                      </span>
                    )}
                    {v.version === currentVersion && (
                      <span className="rounded-full bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{v.editedByName || 'Unknown'}</span>
                    {' • '}{formatDate(v.createdAt)}
                  </p>
                  {v.changeSummary && (
                    <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 italic">"{v.changeSummary}"</p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      v.statusAtTime === 'Approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      v.statusAtTime === 'Rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      v.statusAtTime === 'Pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {v.statusAtTime}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  {onPreviewVersion && (
                    <button
                      onClick={() => onPreviewVersion(v)}
                      className="rounded-lg border border-neutral-300 dark:border-neutral-600 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      View
                    </button>
                  )}
                  {!isLocked && idx !== 0 && (
                    <button
                      onClick={() => handleRestore(v)}
                      disabled={restoring === v._id}
                      className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      {restoring === v._id ? '…' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LegalDocVersionHistory;
