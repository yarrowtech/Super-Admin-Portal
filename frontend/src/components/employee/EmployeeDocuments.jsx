import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const EmployeeDocuments = () => {
  const { token } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [storage, setStorage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getDocuments(token);
        const payload = res?.data || res;
        setDocuments(payload?.items || []);
        setFolders(payload?.folders || []);
        setStorage(payload?.storage || null);
      } catch (err) {
        setError(err.message || 'Failed to load documents');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredDocuments = useMemo(() => {
    if (!query) return documents;
    return documents.filter((doc) => doc.name?.toLowerCase().includes(query.toLowerCase()));
  }, [documents, query]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading documents...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Workspace Drive</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Documents</h1>
          <p className="text-sm text-slate-500">Search specs, design files, and approvals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">
            <span className="material-symbols-outlined text-base">drive_folder_upload</span>
            Upload file
          </button>
          <button className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200">
            <span className="material-symbols-outlined text-base">note_add</span>
            New doc
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
            <span className="material-symbols-outlined text-base">search</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
            />
          </label>
          <div className="mt-6 space-y-2">
            {folders.map((folder) => (
              <div key={folder.id} className="flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">folder</span>
                  {folder.name}
                </div>
                <span className="text-xs">{folder.count}</span>
              </div>
            ))}
          </div>
          {storage && (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-600 dark:text-slate-200">
                <span>Storage</span>
                <span>{storage.used} / {storage.capacity}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-primary" style={{ width: `${storage.usagePercent || 0}%` }}></div>
              </div>
              <p className="mt-2 text-xs text-slate-500">{storage.usagePercent || 0}% used</p>
            </div>
          )}
        </aside>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-100 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-widest text-slate-500 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-transparent">
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id || doc._id} className="hover:bg-slate-50/60 dark:hover:bg-white/5">
                    <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-slate-400">description</span>
                      {doc.name || doc.title}
                    </td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-300">{doc.owner || 'Me'}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                        {doc.status || doc.type || 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 dark:text-slate-300">
                      {doc.updatedAt || doc.reportDate ? new Date(doc.updatedAt || doc.reportDate).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
                {filteredDocuments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      No documents match this search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
};

export default EmployeeDocuments;
