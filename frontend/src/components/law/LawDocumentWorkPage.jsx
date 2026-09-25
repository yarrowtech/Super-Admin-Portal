import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import SectionCard from '../ui/SectionCard';
import { statusLabel, priorityLabel, priorityToTone } from '../../features/tasks/taskConstants';
import { statusToTone } from '../../utils/statusTone';
import DocumentAssignmentPanel from './DocumentAssignmentPanel';
import TaskDocumentWorkspace from '../tasks/TaskDocumentWorkspace';
import { addDocumentAnnotation } from '../../api/legalDocument';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');
const DAY = 86400000;
const ago = (v) => {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}m ago`;
  if (diff < DAY) return `${Math.round(diff / 3600000)}h ago`;
  return `${Math.round(diff / DAY)}d ago`;
};
const DOC_TONE = { Approved: 'success', Pending: 'warning', Draft: 'info', Rejected: 'danger' };
const OPEN = ['pending', 'in-progress', 'review'];
const initials = (name) => String(name || '?').split(' ').filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

// Where a piece of work stands, from the head's point of view.
const attentionOf = (row) => {
  if (row.missing) return { key: 'missing', label: 'Document removed', tone: 'danger' };
  if (row.isOverdue && OPEN.includes(row.taskStatus)) return { key: 'overdue', label: 'Overdue', tone: 'danger' };
  if (row.criticalCount > 0 && OPEN.includes(row.taskStatus)) return { key: 'critical', label: 'Critical points', tone: 'danger' };
  if (row.taskStatus === 'review') return { key: 'review', label: 'Ready for review', tone: 'warning' };
  if (OPEN.includes(row.taskStatus) && !row.assigneeLastEdit && row.assigneeNoteCount === 0) return { key: 'idle', label: 'Not started', tone: 'neutral' };
  return null;
};

const FILTERS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'open', label: 'In progress' },
  { key: 'review', label: 'Ready for review' },
  { key: 'done', label: 'Completed' },
  { key: 'all', label: 'All' },
];

/**
 * Law head: one place to monitor and manage every legal document handed to the team —
 * who has what, progress, edits, key points / critical notes and recent activity.
 */
const LawDocumentWorkPage = () => {
  const { user, token } = useAuth();
  const [filter, setFilter] = useState('attention');
  const [project, setProject] = useState('');
  const [assignee, setAssignee] = useState('');
  const [search, setSearch] = useState('');
  const [managing, setManaging] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [layout, setLayout] = useState('list'); // 'list' | 'people'
  const [openPerson, setOpenPerson] = useState(null);
  const [deciding, setDeciding] = useState(null); // { row, mode: 'approve' | 'return', reason, saving, error }
  const [notice, setNotice] = useState('');

  // Approve completes the task; "Send back" reopens it with the head's reason pinned to the document.
  const decide = async () => {
    const { row, mode } = deciding;
    const reason = (deciding.reason || '').trim();
    if (mode === 'return' && !reason) { setDeciding((d) => ({ ...d, error: 'Tell the employee what to change.' })); return; }
    setDeciding((d) => ({ ...d, saving: true, error: '' }));
    try {
      if (reason) {
        await addDocumentAnnotation(token, row.document._id, {
          kind: 'note',
          critical: mode === 'return',
          text: `${mode === 'return' ? 'Sent back for changes' : 'Approved'} (${row.assignee.name}): ${reason}`,
        });
      }
      await lawApi.updateTask(token, row.taskId, { status: mode === 'approve' ? 'completed' : 'in-progress' });
      setNotice(mode === 'approve' ? `Approved ${row.assignee.name}'s work on “${row.title}”.` : `Sent “${row.title}” back to ${row.assignee.name}.`);
      setDeciding(null);
      refetch();
    } catch (err) {
      setDeciding((d) => ({ ...d, saving: false, error: err?.message || 'Could not update the task.' }));
    }
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['law', 'document-work'],
    queryFn: () => lawApi.getDocumentWork(token),
    enabled: Boolean(token),
    staleTime: 20_000,
  });
  const rows = useMemo(() => data?.data?.rows || [], [data]);
  const activity = data?.data?.activity || [];

  const projects = useMemo(() => [...new Map(rows.filter((r) => r.project).map((r) => [r.project.id, r.project.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows]);
  const people = useMemo(() => [...new Map(rows.map((r) => [r.assignee.id, r.assignee.name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [rows]);

  const stats = useMemo(() => ({
    documents: new Set(rows.map((r) => String(r.document?._id || r.key))).size,
    open: rows.filter((r) => OPEN.includes(r.taskStatus)).length,
    overdue: rows.filter((r) => r.isOverdue && OPEN.includes(r.taskStatus)).length,
    review: rows.filter((r) => r.taskStatus === 'review').length,
    critical: rows.filter((r) => OPEN.includes(r.taskStatus)).reduce((sum, r) => sum + r.criticalCount, 0),
  }), [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => !project || r.project?.id === project)
      .filter((r) => !assignee || r.assignee.id === assignee)
      .filter((r) => !q || `${r.title} ${r.taskTitle} ${r.assignee.name} ${r.project?.name || ''}`.toLowerCase().includes(q))
      .filter((r) => {
        if (filter === 'attention') return Boolean(attentionOf(r)) && r.taskStatus !== 'cancelled';
        if (filter === 'open') return OPEN.includes(r.taskStatus);
        if (filter === 'review') return r.taskStatus === 'review';
        if (filter === 'done') return r.taskStatus === 'completed';
        return true;
      })
      .sort((a, b) => (Number(Boolean(attentionOf(b))) - Number(Boolean(attentionOf(a)))) || (new Date(a.dueDate) - new Date(b.dueDate)));
  }, [rows, project, assignee, search, filter]);

  // Employee-wise summary of the currently filtered work (busiest / most urgent first).
  const byPerson = useMemo(() => {
    const map = new Map();
    visible.forEach((r) => {
      if (!map.has(r.assignee.id)) map.set(r.assignee.id, { id: r.assignee.id, name: r.assignee.name, rows: [], projectIds: new Set(), lastActive: null });
      const p = map.get(r.assignee.id);
      p.rows.push(r);
      if (r.project) p.projectIds.add(r.project.id);
      const active = r.assigneeLastEdit?.at;
      if (active && (!p.lastActive || new Date(active) > new Date(p.lastActive))) p.lastActive = active;
    });
    return [...map.values()].map((p) => ({
      ...p,
      projects: p.projectIds.size,
      open: p.rows.filter((r) => ['pending', 'in-progress'].includes(r.taskStatus)).length,
      review: p.rows.filter((r) => r.taskStatus === 'review').length,
      done: p.rows.filter((r) => r.taskStatus === 'completed').length,
      overdue: p.rows.filter((r) => r.isOverdue && OPEN.includes(r.taskStatus)).length,
      critical: p.rows.filter((r) => OPEN.includes(r.taskStatus)).reduce((sum, r) => sum + r.criticalCount, 0),
    })).sort((a, b) => (b.review + b.overdue + b.critical) - (a.review + a.overdue + a.critical) || a.name.localeCompare(b.name));
  }, [visible]);

  const filterCount = (key) => rows.filter((r) => {
    if (key === 'attention') return Boolean(attentionOf(r)) && r.taskStatus !== 'cancelled';
    if (key === 'open') return OPEN.includes(r.taskStatus);
    if (key === 'review') return r.taskStatus === 'review';
    if (key === 'done') return r.taskStatus === 'completed';
    return true;
  }).length;

  const selectCls = 'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900';

  const renderRow = (r) => {
    const flag = attentionOf(r);
    return (
      <li key={r.key} className={`rounded-xl border p-3 ${flag?.tone === 'danger' ? 'border-rose-200 dark:border-rose-900/50' : 'border-neutral-200 dark:border-neutral-800'}`}>
        <div className="flex flex-wrap items-start gap-3">
          <span className="material-symbols-outlined mt-0.5 text-neutral-400">description</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{r.title}</p>
              {r.document?.status && <StatusBadge tone={DOC_TONE[r.document.status] || 'neutral'} label={`${r.document.status} · ${r.document.currentVersion}`} dot={false} />}
              {flag && <StatusBadge tone={flag.tone} label={flag.label} dot={false} />}
            </div>
            <p className="mt-0.5 truncate text-xs text-neutral-500">
              {r.project?.name || 'No project'} · {r.assignee.name} · due {formatDate(r.dueDate)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
              <StatusBadge tone={statusToTone(r.taskStatus)} label={statusLabel(r.taskStatus)} dot={false} />
              <StatusBadge tone={priorityToTone(r.priority)} label={priorityLabel(r.priority)} dot={false} />
              <span className={`rounded-full px-2 py-0.5 font-semibold ${r.canEdit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>{r.canEdit ? 'Can edit' : 'Read-only'}</span>
              {r.criticalCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{r.criticalCount} critical</span>}
              {r.highlightCount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{r.highlightCount} key point{r.highlightCount === 1 ? '' : 's'}</span>}
              {r.noteCount - r.highlightCount > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{r.noteCount - r.highlightCount} note{r.noteCount - r.highlightCount === 1 ? '' : 's'}</span>}
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              {r.assigneeLastEdit
                ? <>Last edited by {r.assignee.name} {ago(r.assigneeLastEdit.at)} ({r.assigneeLastEdit.version}){r.assigneeLastEdit.summary ? ` — “${r.assigneeLastEdit.summary}”` : ''}</>
                : r.canEdit ? <>{r.assignee.name} has not edited it yet.</> : <>Read-only assignment.</>}
            </p>
          </div>
          {!r.missing && (
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {r.taskStatus === 'review' && (
                <>
                  <button type="button" onClick={() => setDeciding({ row: r, mode: 'approve', reason: '' })} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                    <span className="material-symbols-outlined text-[15px]">check</span>Approve
                  </button>
                  <button type="button" onClick={() => setDeciding({ row: r, mode: 'return', reason: '' })} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20">
                    <span className="material-symbols-outlined text-[15px]">undo</span>Send back
                  </button>
                </>
              )}
              <button type="button" onClick={() => setViewing({ taskId: r.taskId, taskTitle: r.taskTitle, recordId: r.document._id })} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800">
                Review
              </button>
              <button type="button" onClick={() => setManaging(r.document)} className="rounded-lg bg-[var(--portal-accent)] px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                Manage
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title="Document Work"
          subtitle="Monitor and manage every legal document your team is working on"
          icon="monitoring"
          user={user}
          onRefresh={refetch}
          refreshing={isFetching}
        />

        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" role="status">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="material-symbols-outlined text-[18px]">close</button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KPICard title="Documents shared" value={stats.documents} icon="description" />
          <KPICard title="In progress" value={stats.open} icon="pending_actions" tone="info" />
          <KPICard title="Ready for review" value={stats.review} icon="rate_review" tone="warning" />
          <KPICard title="Overdue" value={stats.overdue} icon="warning" tone={stats.overdue ? 'danger' : 'neutral'} />
          <KPICard title="Open critical points" value={stats.critical} icon="priority_high" tone={stats.critical ? 'danger' : 'neutral'} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <SectionCard title="Assigned documents" icon="assignment_ind" description={`${visible.length} of ${rows.length} shown`} error={isError ? error : null} onRetry={refetch}>
            <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Filter work">
              {FILTERS.map((f) => (
                <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${filter === f.key ? 'bg-[var(--portal-accent)] text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                  {f.label}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold ${filter === f.key ? 'bg-white/25' : 'bg-white text-neutral-500 dark:bg-neutral-900'}`}>{filterCount(f.key)}</span>
                </button>
              ))}
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900" role="group" aria-label="Layout">
                {[['list', 'view_list', 'List'], ['people', 'groups', 'By employee']].map(([key, icon, label]) => (
                  <button key={key} type="button" onClick={() => setLayout(key)} aria-pressed={layout === key} className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${layout === key ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-300'}`}>
                    <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
                  </button>
                ))}
              </div>
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search document, task or person…" aria-label="Search" className={`${selectCls} min-w-48 flex-1`} />
              <select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project" className={selectCls}>
                <option value="">All projects</option>
                {projects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <select value={assignee} onChange={(e) => setAssignee(e.target.value)} aria-label="Filter by employee" className={selectCls}>
                <option value="">All employees</option>
                {people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>

            {isLoading ? (
              <p className="animate-pulse text-sm text-neutral-500">Loading document work…</p>
            ) : rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
                No documents assigned yet. Open a project document in <Link to="/law/documents/legal" className="font-semibold text-[var(--portal-accent)] hover:underline">Legal Documents</Link> and use <strong>Assign &amp; track</strong>.
              </div>
            ) : visible.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">{filter === 'attention' ? 'Nothing needs your attention right now.' : 'No work matches these filters.'}</p>
            ) : (
              layout === 'list' ? (
                <ul className="space-y-2">{visible.map(renderRow)}</ul>
              ) : (
                <div className="space-y-3">
                  {byPerson.map((p) => {
                    const expanded = openPerson === p.id || byPerson.length === 1;
                    return (
                      <div key={p.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <button type="button" onClick={() => setOpenPerson(expanded ? null : p.id)} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-xs font-bold text-[var(--portal-accent)]">{initials(p.name)}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{p.name}</p>
                            <p className="text-xs text-neutral-500">{p.rows.length} document{p.rows.length === 1 ? '' : 's'} · {p.projects} project{p.projects === 1 ? '' : 's'}{p.lastActive ? ` · active ${ago(p.lastActive)}` : ''}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                            {p.open > 0 && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{p.open} in progress</span>}
                            {p.review > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{p.review} to review</span>}
                            {p.overdue > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{p.overdue} overdue</span>}
                            {p.critical > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{p.critical} critical</span>}
                            {p.done > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{p.done} done</span>}
                          </div>
                          <span className="material-symbols-outlined text-neutral-400">{expanded ? 'expand_less' : 'expand_more'}</span>
                        </button>
                        {expanded && <ul className="space-y-2 border-t border-neutral-100 p-3 dark:border-neutral-800">{p.rows.map(renderRow)}</ul>}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </SectionCard>

          <SectionCard title="Recent activity" icon="history" description="Edits, key points and notes">
            {activity.length === 0 ? (
              <p className="text-sm text-neutral-500">No activity yet.</p>
            ) : (
              <ol className="space-y-3">
                {activity.map((a, i) => (
                  <li key={`${a.type}-${a.at}-${i}`} className="flex gap-2.5">
                    <span className={`material-symbols-outlined mt-0.5 text-[18px] ${a.critical ? 'text-rose-600' : a.type === 'edit' ? 'text-blue-600' : a.type === 'highlight' ? 'text-amber-600' : 'text-neutral-400'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                      {a.critical ? 'priority_high' : a.type === 'edit' ? 'edit_document' : a.type === 'highlight' ? 'star' : 'sticky_note_2'}
                    </span>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="text-neutral-800 dark:text-neutral-100">
                        <span className="font-semibold">{a.by}</span>{' '}
                        {a.type === 'edit' ? `saved ${a.version} of` : a.critical ? 'flagged a critical point on' : a.type === 'highlight' ? 'added a key point to' : 'added a note to'}{' '}
                        <span className="font-semibold">{a.docTitle}</span>
                      </p>
                      {a.text && <p className={`mt-0.5 line-clamp-2 ${a.critical ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-500'}`}>{a.text}</p>}
                      <p className="mt-0.5 text-[11px] text-neutral-400">{ago(a.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>

      {deciding && (
        <div className="fixed inset-0 z-[1150] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={deciding.mode === 'approve' ? 'Approve work' : 'Send back'}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
            <p className="text-base font-bold text-neutral-900 dark:text-white">{deciding.mode === 'approve' ? 'Approve work' : 'Send back for changes'}</p>
            <p className="mt-1 text-sm text-neutral-500">
              {deciding.row.assignee.name} · “{deciding.row.title}”.{' '}
              {deciding.mode === 'approve' ? 'The task is marked completed.' : 'The task goes back to In progress and your reason is pinned to the document as a critical note.'}
            </p>
            {deciding.row.criticalCount > 0 && deciding.mode === 'approve' && (
              <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                This document still has {deciding.row.criticalCount} critical point{deciding.row.criticalCount === 1 ? '' : 's'}. Review them before approving.
              </p>
            )}
            <label className="mt-4 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              {deciding.mode === 'approve' ? 'Comment (optional)' : 'What needs to change?'}{deciding.mode === 'return' && <span className="text-rose-500">*</span>}
              <textarea
                autoFocus
                rows={3}
                maxLength={1500}
                value={deciding.reason}
                onChange={(e) => setDeciding((d) => ({ ...d, reason: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            {deciding.error && <p role="alert" className="mt-2 text-sm text-rose-600">{deciding.error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeciding(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-neutral-700">Cancel</button>
              <button type="button" disabled={deciding.saving} onClick={decide} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${deciding.mode === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {deciding.saving ? 'Saving…' : deciding.mode === 'approve' ? 'Approve' : 'Send back'}
              </button>
            </div>
          </div>
        </div>
      )}
      {managing && <DocumentAssignmentPanel doc={managing} onClose={() => { setManaging(null); refetch(); }} onChanged={refetch} />}
      {viewing && <TaskDocumentWorkspace {...viewing} onClose={() => { setViewing(null); refetch(); }} />}
    </main>
  );
};

export default LawDocumentWorkPage;
