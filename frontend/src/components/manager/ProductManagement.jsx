import React, { useEffect, useMemo, useState } from 'react';
import { managerApi } from '../../services/manager';
import { useAuth } from '../../context/AuthContext';
import { CANONICAL_PROJECT_NAMES } from '../../config/projectNames';

const STATUS_LABELS = {
  planning: 'Planning',
  'in-progress': 'In Progress',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const STRICT_PROJECT_NAMES = CANONICAL_PROJECT_NAMES;

const STATUS_PILL = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'in-progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  'on-hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const INITIAL_FORM = {
  _id: '',
  name: '',
  projectCode: '',
  description: '',
  status: 'planning',
  startDate: '',
  deadline: '',
};

const ProductManagement = () => {
  const { token } = useAuth();
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(INITIAL_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const loadProjects = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await managerApi.getProjects(token);
      const rows = res?.data?.projects || [];
      setProjects(rows);
      if (!form._id && rows.length > 0 && !isCreating) {
        const p = rows[0];
        setForm({
          _id: p._id,
          name: p.name || '',
          projectCode: p.projectCode || '',
          description: p.description || '',
          status: p.status || 'planning',
          startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
          deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      `${p.name || ''} ${p.projectCode || ''} ${p.description || ''}`.toLowerCase().includes(q)
    );
  }, [projects, search]);

  const summary = useMemo(() => {
    const active = projects.filter((p) => ['planning', 'in-progress', 'on-hold'].includes(p.status)).length;
    const inProgress = projects.filter((p) => p.status === 'in-progress').length;
    const archived = projects.filter((p) => ['completed', 'cancelled'].includes(p.status)).length;
    return { active, inProgress, archived };
  }, [projects]);

  const statusBreakdown = useMemo(() => {
    const total = projects.length || 1;
    return [
      ['Planning', Math.round((projects.filter((p) => p.status === 'planning').length / total) * 100)],
      ['In Progress', Math.round((projects.filter((p) => p.status === 'in-progress').length / total) * 100)],
      ['On Hold', Math.round((projects.filter((p) => p.status === 'on-hold').length / total) * 100)],
      ['Completed', Math.round((projects.filter((p) => p.status === 'completed').length / total) * 100)],
      ['Cancelled', Math.round((projects.filter((p) => p.status === 'cancelled').length / total) * 100)],
    ];
  }, [projects]);

  const selectProject = (p) => {
    setIsCreating(false);
    setForm({
      _id: p._id,
      name: p.name || '',
      projectCode: p.projectCode || '',
      description: p.description || '',
      status: p.status || 'planning',
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
      deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '',
    });
  };

  const handleCreateNew = () => {
    const used = new Set(projects.map((p) => String(p.name || '').trim().toUpperCase()));
    const nextAvailable = STRICT_PROJECT_NAMES.find((name) => !used.has(name)) || STRICT_PROJECT_NAMES[0];
    setIsCreating(true);
    setForm({ ...INITIAL_FORM, name: nextAvailable, status: 'planning', startDate: new Date().toISOString().split('T')[0] });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!token) return;
    if (!form.name.trim() || !form.description.trim() || !form.startDate) {
      setError('Project name, description and start date are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isCreating || !form._id) {
        await managerApi.createProject(token, {
          name: form.name,
          description: form.description,
          startDate: form.startDate,
          deadline: form.deadline || undefined,
          status: form.status,
        });
      } else {
        await managerApi.updateProject(token, form._id, {
          name: form.name,
          description: form.description,
          startDate: form.startDate,
          deadline: form.deadline || undefined,
          status: form.status,
        });
      }
      await loadProjects();
      setIsCreating(false);
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token || !id) return;
    const ok = window.confirm('Delete this project?');
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await managerApi.deleteProject(token, id);
      await loadProjects();
      setForm(INITIAL_FORM);
      setIsCreating(false);
    } catch (err) {
      setError(err.message || 'Failed to delete project');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const rows = filteredProjects.map((p) => [
      p.name || '',
      p.projectCode || '',
      STATUS_LABELS[p.status] || p.status || '',
      p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : '',
      p.deadline ? new Date(p.deadline).toISOString().slice(0, 10) : '',
    ]);
    const csv = [['Name', 'Project ID', 'Status', 'Start Date', 'Deadline'], ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager-projects-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black leading-tight text-neutral-900 dark:text-white">Project Management</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Track all projects, their lifecycle stages, and associated modules.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleExport} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-base">download</span>Export
              </button>
              <button onClick={handleCreateNew} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                <span className="material-symbols-outlined text-base">add</span>New Project
              </button>
            </div>
          </header>

          {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40"><p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Projects</p><p className="text-3xl font-bold text-neutral-900 dark:text-white">{summary.active}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40"><p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">In Progress</p><p className="text-3xl font-bold text-neutral-900 dark:text-white">{summary.inProgress}</p></div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900/40"><p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Archived</p><p className="text-3xl font-bold text-neutral-900 dark:text-white">{summary.archived}</p></div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="mb-4 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Lifecycle Breakdown</p>
              <div className="space-y-4">
                {statusBreakdown.map(([label, percent]) => (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-sm"><span>{label}</span><span>{percent}%</span></div>
                    <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800"><div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Status Overview</p>
              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between"><span>{v}</span><span className="font-semibold">{projects.filter((p) => p.status === k).length}</span></div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Project Catalog</h2>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">search</span>
                <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search projects..." className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-neutral-50 text-xs font-semibold uppercase text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                  <tr><th className="px-6 py-3 text-left">Name</th><th className="px-6 py-3 text-left">ID</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredProjects.map((p) => (
                    <tr key={p._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="px-6 py-4 text-sm font-medium">{p.name}</td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">{p.projectCode || '-'}</td>
                      <td className="px-6 py-4 text-sm"><span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL[p.status] || STATUS_PILL.planning}`}>{STATUS_LABELS[p.status] || p.status}</span></td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex items-center justify-end gap-3 text-neutral-500">
                          <button onClick={() => selectProject(p)} className="hover:text-primary"><span className="material-symbols-outlined text-xl">edit</span></button>
                          <button onClick={() => handleDelete(p._id)} className="hover:text-red-600"><span className="material-symbols-outlined text-xl">delete</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredProjects.length === 0 && (
                    <tr><td className="px-6 py-6 text-sm text-neutral-500" colSpan={4}>No projects found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="sticky top-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
          <div><h2 className="text-xl font-bold">Select Project</h2></div>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="flex flex-col text-sm font-medium">Project Name
              <select required className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}>
                <option value="" disabled>Select project</option>
                {STRICT_PROJECT_NAMES.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-sm font-medium">Project ID
              <input className="mt-1 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400" value={form.projectCode || 'Auto-generated'} disabled />
            </label>
            <label className="flex flex-col text-sm font-medium">Description
              <textarea required rows={4} className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col text-sm font-medium">Start Date
                <input type="date" required className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
              </label>
              <label className="flex flex-col text-sm font-medium">Deadline
                <input type="date" className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} />
              </label>
            </div>
            <label className="flex flex-col text-sm font-medium">Status
              <select className="mt-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <div className="flex gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <button type="button" onClick={() => { setIsCreating(false); setForm(INITIAL_FORM); }} className="flex h-10 flex-1 items-center justify-center rounded-lg bg-neutral-100 px-4 text-sm font-semibold text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700">Cancel</button>
              <button disabled={saving} type="submit" className="flex h-10 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </aside>
      </div>
    </main>
  );
};

export default ProductManagement;
