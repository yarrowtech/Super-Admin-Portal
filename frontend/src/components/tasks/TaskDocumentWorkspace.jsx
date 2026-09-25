import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import LegalDocEditor from '../law/LegalDocEditor';
import StatusBadge from '../common/StatusBadge';
import DocumentNotesPanel from '../law/DocumentNotesPanel';

const statusTone = (status) => ({ Approved: 'success', Pending: 'warning', Draft: 'warning', Rejected: 'danger' }[status] || 'neutral');

/**
 * Full-screen workspace for a document the law head shared through a task.
 * Left: the document in the same editor the head uses (editable only when the head
 * granted "Can edit" and the document is still a draft). Right: key points and notes
 * pinned to the document — critical ones float to the top so the head can't miss them.
 * Each explicit save creates one version (no autosave, which would flood the history).
 */
const TaskDocumentWorkspace = ({ taskId, taskTitle, recordId, onClose }) => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const editorRef = useRef(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [notesOpen, setNotesOpen] = useState(true);
  // Bumped on every edit so the notes panel's highlight list stays in sync with the text.
  const [contentTick, setContentTick] = useState(0);
  // One-time tip; dismissal is remembered per browser (storage may be unavailable).
  const [showTip, setShowTipState] = useState(() => {
    try { return window.localStorage.getItem('law.docTipDismissed') !== '1'; } catch { return true; }
  });
  const setShowTip = (value) => {
    setShowTipState(value);
    if (!value) { try { window.localStorage.setItem('law.docTipDismissed', '1'); } catch { /* ignore */ } }
  };

  const queryKey = ['law', 'task-item', taskId, recordId];
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => lawApi.getTaskItem(token, taskId, recordId),
    enabled: Boolean(token),
  });
  const doc = data?.data;
  const canEdit = Boolean(doc?.canEdit);
  const canAnnotate = Boolean(doc?.sharedForEdit) || ['law_head', 'admin', 'super_admin', 'superadmin'].includes(String(user?.role || '').toLowerCase());
  const myId = String(user?._id || user?.id || '');
  const isHead = ['law_head', 'admin', 'super_admin', 'superadmin'].includes(String(user?.role || '').toLowerCase());

  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ['law', 'task-items', taskId] });
    queryClient.invalidateQueries({ queryKey });
  };

  const close = useCallback(() => {
    if (dirty && !window.confirm('You have unsaved changes to the document. Close without saving?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    document.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', warn);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', warn);
      document.body.style.overflow = prevOverflow;
    };
  }, [close, dirty]);

  const save = async (html) => {
    const content = html ?? editorRef.current?.getContent?.();
    if (typeof content !== 'string') return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const res = await lawApi.saveTaskItemContent(token, taskId, recordId, content, changeSummary.trim() || undefined);
      setDirty(false);
      setChangeSummary('');
      setSaveStatus('saved');
      // Browser time, not the server's: the editor compares it with its own last-keystroke time,
      // so a server clock that is slightly behind kept showing "Unsaved changes" after a save.
      setLastSavedAt(Date.now());
      queryClient.setQueryData(queryKey, (prev) => (prev?.data ? { ...prev, data: { ...prev.data, content, version: res?.data?.version || prev.data.version } } : prev));
      refreshLists();
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch (err) {
      setSaveStatus('error');
      setSaveError(err?.message || 'Could not save the document.');
      return false;
    }
  };

  // ── Hand the work back to the law head ─────────────────────────────────────
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const taskStatus = submitted ? 'review' : doc?.taskStatus;
  const canSubmit = Boolean(doc?.isAssignee) && ['pending', 'in-progress'].includes(taskStatus);

  const submitToHead = async () => {
    setSubmitting(true);
    setSaveError('');
    try {
      if (dirty && canEdit && !(await save())) return;
      if (submitMsg.trim()) {
        await lawApi.addTaskItemAnnotation(token, taskId, recordId, { kind: 'note', text: `Submitted for review: ${submitMsg.trim()}` });
      }
      await lawApi.updateTask(token, taskId, { status: 'review' });
      setSubmitted(true);
      setSubmitOpen(false);
      setSubmitMsg('');
      await refetch();
      refreshLists();
      queryClient.invalidateQueries({ queryKey: ['law', 'my-task-items'] });
    } catch (err) {
      setSaveError(err?.message || 'Could not submit to the law head.');
    } finally {
      setSubmitting(false);
    }
  };

  const addNote = async (body) => {
    await lawApi.addTaskItemAnnotation(token, taskId, recordId, body);
    await refetch();
    refreshLists();
  };

  const removeNote = async (a) => {
    await lawApi.deleteTaskItemAnnotation(token, taskId, recordId, a._id);
    await refetch();
    refreshLists();
  };

  return createPortal(
    <div className="fixed inset-0 z-1200 flex flex-col bg-neutral-100 dark:bg-neutral-950" role="dialog" aria-modal="true" aria-label={doc?.title || 'Document'}>
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <button type="button" onClick={close} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>Close
          </button>
          <span className="hidden h-8 w-px bg-neutral-200 sm:block dark:bg-neutral-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">description</span>
              <p className="truncate text-base font-bold text-neutral-900 dark:text-white">{doc?.title || 'Loading…'}</p>
              {doc?.status && <StatusBadge tone={statusTone(doc.status)} label={doc.status} dot={false} />}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              {doc?.projectName && <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800"><span className="material-symbols-outlined text-[13px]">folder</span>{doc.projectName}</span>}
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800"><span className="material-symbols-outlined text-[13px]">task_alt</span>{taskTitle || '—'}</span>
              {doc?.version && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">{doc.version}</span>}
              {doc?.referenceNumber && <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 font-mono dark:bg-neutral-800">{doc.referenceNumber}</span>}
              {doc && (
                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${canEdit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                  <span className="material-symbols-outlined text-[13px]">{canEdit ? 'edit' : 'visibility'}</span>{canEdit ? 'You can edit' : 'Read-only'}
                </span>
              )}
            </div>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            {canEdit && (
              <>
                <input
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && dirty) save(); }}
                  placeholder="Describe your change (optional)"
                  aria-label="Change summary"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-60"
                />
                <button
                  type="button"
                  onClick={() => save()}
                  disabled={saveStatus === 'saving' || !dirty}
                  title="Save a new version (Ctrl+S)"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-default disabled:bg-neutral-200 disabled:text-neutral-500 disabled:shadow-none dark:disabled:bg-neutral-800"
                >
                  <span className="material-symbols-outlined text-[18px]">{dirty ? 'save' : 'check'}</span>
                  {saveStatus === 'saving' ? 'Saving…' : dirty ? 'Save version' : 'Saved'}
                </button>
              </>
            )}
            {canSubmit && (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                title="Send your finished work to the law head for review"
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>Submit to law head
              </button>
            )}
            {doc?.isAssignee && taskStatus === 'review' && (
              <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-amber-50 px-3 text-sm font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                <span className="material-symbols-outlined text-[18px]">hourglass_top</span>With the law head
              </span>
            )}
            {doc?.isAssignee && taskStatus === 'completed' && (
              <span className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                <span className="material-symbols-outlined text-[18px]">verified</span>Approved
              </span>
            )}
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              aria-pressed={notesOpen}
              title={notesOpen ? 'Hide key points & notes' : 'Show key points & notes'}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${notesOpen ? 'border-primary bg-primary/10 text-primary' : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{notesOpen ? 'right_panel_close' : 'right_panel_open'}</span>
              <span className="hidden sm:inline">Notes</span>
              {(doc?.annotations || []).length > 0 && (
                <span className={`rounded-full px-1.5 text-[10px] font-bold text-white ${(doc.annotations || []).some((a) => a.critical) ? 'bg-rose-600' : 'bg-primary'}`}>{doc.annotations.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {(saveError || (doc && !canEdit && doc.editBlockedReason)) && (
        <div className={`flex items-center gap-2 px-4 py-2 text-sm ${saveError ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'}`} role={saveError ? 'alert' : 'status'}>
          <span className="material-symbols-outlined text-[18px]">{saveError ? 'error' : 'lock'}</span>
          {saveError || doc.editBlockedReason}
        </div>
      )}
      {submitOpen && (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Submit to law head">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-neutral-900">
            <p className="text-base font-bold text-neutral-900 dark:text-white">Submit to law head</p>
            <p className="mt-1 text-sm text-neutral-500">
              {dirty ? 'Your unsaved changes will be saved as a new version first. ' : ''}The task moves to <strong>Ready for review</strong> and the law head is shown your work, key points and notes.
            </p>
            <label className="mt-4 block text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Message for the law head (optional)
              <textarea
                autoFocus
                rows={3}
                value={submitMsg}
                onChange={(e) => setSubmitMsg(e.target.value)}
                maxLength={1500}
                placeholder="e.g. Redlined clauses 4 and 7; the indemnity point needs your decision."
                className="mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setSubmitOpen(false)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold dark:border-neutral-700">Cancel</button>
              <button type="button" disabled={submitting} onClick={submitToHead} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                <span className="material-symbols-outlined text-[18px]">send</span>{submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {submitted && (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200" role="status">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          Submitted. The law head can now review your work, key points and notes.
        </div>
      )}
      {canEdit && showTip && (
        <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-1.5 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
          <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
          <span className="flex-1"><strong>Tip:</strong> select any text to highlight it or pin a key point, critical point or note to it. Save a version when you are done.</span>
          <button type="button" onClick={() => setShowTip(false)} className="font-semibold hover:underline">Got it</button>
        </div>
      )}

      {/* Body */}
      <div className={`grid min-h-0 flex-1 grid-cols-1 ${notesOpen ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
        <div className="flex min-h-0 flex-col p-3">
          {isLoading ? (
            <p className="p-6 text-sm text-neutral-500">Loading document…</p>
          ) : isError || !doc ? (
            <p className="p-6 text-sm text-rose-600">{error?.message || 'This document is no longer available.'}</p>
          ) : doc.content === undefined ? (
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300">
              <p className="font-semibold">This document is shared with you read-only.</p>
              <p className="mt-1">{doc.description || 'Ask the law head for edit access if you need to work on its text.'}</p>
            </div>
          ) : (
            <LegalDocEditor
              ref={editorRef}
              key={recordId}
              initialContent={doc.content || ''}
              isReadOnly={!canEdit}
              document={{ ...doc, currentVersion: doc.version }}
              saveStatus={saveStatus}
              lastSavedAt={lastSavedAt}
              onContentChange={() => { setDirty(true); setContentTick((t) => t + 1); }}
              onSaveDraft={canEdit ? save : undefined}
              onQuickNote={canAnnotate ? addNote : undefined}
            />
          )}
        </div>

        {/* Key points & notes */}
        {notesOpen && <aside className="flex min-h-0 flex-col border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 lg:border-l lg:border-t-0">
          <DocumentNotesPanel
            annotations={doc?.annotations || []}
            onAdd={canAnnotate ? addNote : undefined}
            onDelete={removeNote}
            canDelete={(a) => isHead || String(a.createdBy || '') === myId}
            onJump={doc?.content !== undefined ? (quote) => Boolean(editorRef.current?.findText?.(quote)) : undefined}
            getHighlights={doc?.content !== undefined ? () => editorRef.current?.getHighlights?.() || [] : undefined}
            onGoTo={(from, to) => editorRef.current?.goTo?.(from, to)}
            contentVersion={contentTick}
            subtitle="Pinned to this document for the law head and reviewers."
            emptyHint={canEdit ? 'Select text in the document to highlight it or pin a point to it — then choose Key point, Critical or Note.' : undefined}
          />
        </aside>}
      </div>
    </div>,
    document.body,
  );
};

export default TaskDocumentWorkspace;
