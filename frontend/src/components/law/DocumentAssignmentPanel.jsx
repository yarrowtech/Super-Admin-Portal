import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import { TASK_PRIORITIES, statusLabel, priorityLabel } from '../../features/tasks/taskConstants';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');
const formatWhen = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '');
const todayIso = () => new Date().toISOString().split('T')[0];
const personName = (p) => (p ? (`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || p.email || 'Employee') : 'Employee');
const idOf = (v) => String(v?._id || v?.id || v || '');
const STATUS_CLS = {
  pending: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  'in-progress': 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  review: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

// Every task page, since the department task list is paginated.
const fetchAllTasks = async (token) => {
  const rows = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await lawApi.getTasks(token, { page, limit: 100 });
    rows.push(...(res?.data?.tasks || []));
    totalPages = Number(res?.data?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && page <= 20);
  return rows;
};

const inputCls = 'mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

/**
 * Law head, from the Legal Documents page: hand the open project document to a Law
 * employee and follow the work — who has it, whether they may edit, task progress, and the
 * notes / key points they pinned to the document. Assigning creates a normal Law task
 * (project + document link), so every server-side rule on tasks and links still applies.
 */
const DocumentAssignmentPanel = ({ doc, onClose, onChanged }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ assignedTo: '', dueDate: '', priority: 'medium', instructions: '', canEdit: true });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyTask, setBusyTask] = useState(null);

  const load = useCallback(async () => {
    try {
      const [allTasks, membersRes] = await Promise.all([fetchAllTasks(token), lawApi.getMembers(token, { for: 'task' })]);
      setTasks(allTasks.filter((t) => (t.linkedItems || []).some((l) => l.module === 'document' && idOf(l.recordId) === idOf(doc._id))));
      setMembers(Array.isArray(membersRes?.data) ? membersRes.data : []);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.message || 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [token, doc._id]);

  // Load once when the panel opens; state is only set after the requests resolve.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const activeAssigneeIds = useMemo(
    () => new Set(tasks.filter((t) => !['completed', 'cancelled'].includes(t.status)).map((t) => idOf(t.assignedTo))),
    [tasks],
  );
  const annotations = useMemo(
    () => [...(doc.annotations || [])].sort((a, b) => (Number(b.critical) - Number(a.critical)) || (new Date(b.createdAt) - new Date(a.createdAt))),
    [doc.annotations],
  );
  const alreadyActive = form.assignedTo && activeAssigneeIds.has(form.assignedTo);

  const assign = async (e) => {
    e.preventDefault();
    if (!form.assignedTo || !form.dueDate) { setFormError('Choose an employee and a due date.'); return; }
    if (alreadyActive) { setFormError('This employee already has an open task for this document.'); return; }
    setSaving(true);
    setFormError('');
    try {
      await lawApi.createTask(token, {
        title: `${form.canEdit ? 'Work on' : 'Review'}: ${doc.title}`.slice(0, 200),
        description: form.instructions.trim() || (form.canEdit
          ? `Update "${doc.title}" and add key points / notes for the law head.`
          : `Read "${doc.title}" and add notes for the law head.`),
        assignedTo: form.assignedTo,
        dueDate: form.dueDate,
        priority: form.priority,
        project: idOf(doc.projectId),
        linkedItems: [{ module: 'document', recordId: idOf(doc._id), canEdit: form.canEdit }],
      });
      const who = personName(members.find((m) => idOf(m) === form.assignedTo));
      setNotice(`Assigned to ${who}${form.canEdit ? ' with edit access' : ' (read-only)'}. It is now on their dashboard and Tasks board.`);
      setForm({ assignedTo: '', dueDate: '', priority: 'medium', instructions: '', canEdit: true });
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(err?.message || 'Unable to assign the document.');
    } finally {
      setSaving(false);
    }
  };

  // Re-sends every link so other documents on the task keep their own edit setting.
  const setEditAccess = async (task, canEdit) => {
    setBusyTask(task._id);
    setFormError('');
    try {
      const linkedItems = (task.linkedItems || []).map((l) => ({
        module: l.module, recordId: idOf(l.recordId), title: l.title,
        canEdit: idOf(l.recordId) === idOf(doc._id) ? canEdit : Boolean(l.canEdit),
      })).filter((l) => l.module === 'document');
      await lawApi.updateTask(token, task._id, { linkedItems });
      setNotice(`${personName(task.assignedTo)} ${canEdit ? 'can now edit' : 'now has read-only access to'} this document.`);
      await load();
    } catch (err) {
      setFormError(err?.message || 'Unable to change access.');
    } finally {
      setBusyTask(null);
    }
  };

  const cancelAssignment = async (task) => {
    if (!window.confirm(`Cancel ${personName(task.assignedTo)}'s task for this document? They will lose access to it.`)) return;
    setBusyTask(task._id);
    try {
      await lawApi.updateTask(token, task._id, { status: 'cancelled' });
      setNotice('Assignment cancelled.');
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(err?.message || 'Unable to cancel the assignment.');
    } finally {
      setBusyTask(null);
    }
  };

  const isProjectDoc = Boolean(doc.projectId);
  const docLocked = doc.isLocked || !['Draft', 'Rejected'].includes(doc.status);

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex justify-end bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-neutral-900" role="dialog" aria-modal="true" aria-label="Assign and track document">
        <header className="flex items-start gap-3 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <span className="material-symbols-outlined mt-0.5 text-[var(--portal-accent)]">assignment_ind</span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-neutral-900 dark:text-white">Assign &amp; track</p>
            <p className="truncate text-xs text-neutral-500">{doc.title}{doc.projectName ? ` · ${doc.projectName}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          {notice && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" role="status">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="flex-1">{notice}</span>
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="material-symbols-outlined text-[18px]">close</button>
            </div>
          )}
          {formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{formError}</p>}

          {/* Assign */}
          <section>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Assign to an employee</h3>
            {!isProjectDoc ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">Only project documents can be assigned. Move this document into a project first.</p>
            ) : (
              <form onSubmit={assign} className="mt-3 space-y-3">
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Employee<span className="text-rose-500">*</span>
                  <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} disabled={loading} className={inputCls}>
                    <option value="">{loading ? 'Loading team…' : 'Choose an employee…'}</option>
                    {members.map((m) => (
                      <option key={idOf(m)} value={idOf(m)}>{personName(m)}{m.isFreelancer || m.role === 'freelancer' ? ' (Freelancer)' : ''}{activeAssigneeIds.has(idOf(m)) ? ' — already assigned' : ''}</option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Due date<span className="text-rose-500">*</span>
                    <input type="date" min={todayIso()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} />
                  </label>
                  <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                    Priority
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                      {TASK_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </label>
                </div>
                <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Instructions
                  <textarea rows={3} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="e.g. Tighten clause 7 (liability) and flag anything the client may push back on." className={inputCls} />
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-700">
                  <input type="checkbox" className="mt-0.5" checked={form.canEdit} onChange={(e) => setForm({ ...form, canEdit: e.target.checked })} />
                  <span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">Allow editing</span>
                    <span className="block text-xs text-neutral-500">They can change the text (each save is a new version) and add key points / notes. Off = read and comment only.</span>
                  </span>
                </label>
                {docLocked && form.canEdit && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">This document is {doc.status}; the employee can add notes but cannot change its text.</p>
                )}
                <button type="submit" disabled={saving || loading} className="w-full rounded-lg bg-[var(--portal-accent)] py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60">
                  {saving ? 'Assigning…' : 'Assign document'}
                </button>
              </form>
            )}
          </section>

          {/* Assignments */}
          <section>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Assignments {tasks.length > 0 && <span className="text-neutral-400">({tasks.length})</span>}</h3>
            {loading ? (
              <p className="mt-2 text-sm text-neutral-400">Loading…</p>
            ) : loadError ? (
              <p className="mt-2 text-sm text-rose-600">{loadError} <button type="button" onClick={() => { setLoading(true); load(); }} className="font-semibold underline">Retry</button></p>
            ) : tasks.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">Not assigned to anyone yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {tasks.map((task) => {
                  const link = (task.linkedItems || []).find((l) => idOf(l.recordId) === idOf(doc._id));
                  const closed = ['completed', 'cancelled'].includes(task.status);
                  return (
                    <li key={task._id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-xs font-bold text-[var(--portal-accent)]">
                          {personName(task.assignedTo).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{personName(task.assignedTo)}</p>
                          <p className="text-xs text-neutral-500">Due {formatDate(task.dueDate)} · {priorityLabel(task.priority)}{task.isOverdue && !closed ? ' · Overdue' : ''}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CLS[task.status] || STATUS_CLS.pending}`}>{statusLabel(task.status)}</span>
                      </div>
                      {!closed && (
                        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-2 text-xs dark:border-neutral-800">
                          <label className="flex cursor-pointer items-center gap-1.5 font-semibold text-neutral-700 dark:text-neutral-200">
                            <input type="checkbox" checked={Boolean(link?.canEdit)} disabled={busyTask === task._id} onChange={(e) => setEditAccess(task, e.target.checked)} />
                            Can edit
                          </label>
                          <button type="button" disabled={busyTask === task._id} onClick={() => cancelAssignment(task)} className="ml-auto font-semibold text-rose-600 hover:underline disabled:opacity-50">Cancel assignment</button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Notes */}
          <section>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Key points &amp; notes {annotations.length > 0 && <span className="text-neutral-400">({annotations.length})</span>}</h3>
            {annotations.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">None yet. Notes and key points your team adds while working on this document appear here.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {annotations.map((a) => (
                  <li key={a._id} className={`rounded-xl border p-3 ${a.critical ? 'border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-900/20' : a.kind === 'highlight' ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20' : 'border-neutral-200 dark:border-neutral-700'}`}>
                    <p className={`text-xs font-semibold ${a.critical ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                      {a.critical ? 'Critical ' : ''}{a.kind === 'highlight' ? 'key point' : 'note'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-800 dark:text-neutral-100">{a.text}</p>
                    <p className="mt-1 text-[11px] text-neutral-500">{a.createdByName || 'Someone'} · {formatWhen(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>,
    document.body,
  );
};

export default DocumentAssignmentPanel;
