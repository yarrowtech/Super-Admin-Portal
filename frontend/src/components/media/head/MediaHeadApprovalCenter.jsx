import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useConfirmDialog } from '../../../context/ConfirmDialogContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';
import CloudinaryFilePreviewModal from '../../common/CloudinaryFilePreviewModal';
import CreativeStatsGrid from '../CreativeStatsGrid';
import EmptyState from '../../ui/EmptyState';
import Skeleton from '../../ui/Skeleton';

const arr = (value) => (Array.isArray(value) ? value : []);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isTransientNetworkError = (error) =>
  error instanceof TypeError || /failed to fetch|networkerror|network request failed/i.test(String(error?.message || ''));

const STATUS_TONE = { pending: 'warning', approved: 'success', rejected: 'danger' };

const formatRole = (role = '') =>
  String(role || '').split('_').filter(Boolean).map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

const getApprovalTitle = (workflow = {}) =>
  workflow.display?.title || workflow.media?.title || `${formatRole(workflow.entityType || 'media')} approval`;

const getRequesterName = (workflow = {}) =>
  workflow.display?.requester ||
  [workflow.requestedBy?.firstName, workflow.requestedBy?.lastName].filter(Boolean).join(' ') ||
  workflow.requestedBy?.email ||
  'Unknown requester';

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';

const fileIconFor = (media = {}) => {
  const mime = String(media?.mimeType || '').toLowerCase();
  if (mime.startsWith('video/')) return 'movie';
  if (mime.startsWith('audio/')) return 'audiotrack';
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'description';
};

const MediaHeadApprovalCenter = () => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [decidingId, setDecidingId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rejectingWorkflow, setRejectingWorkflow] = useState(null);
  const [rejectingBulk, setRejectingBulk] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  const queryKey = QK.mediaHead.approvals({ status: statusFilter });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => departmentApi.getMediaHeadApprovals(token, statusFilter ? { status: statusFilter } : {}),
    enabled: Boolean(token),
  });

  // Separate, always-on unfiltered fetch purely to power the summary counters —
  // dedupes against the tab query itself whenever the user is on the "All" tab.
  const { data: allData } = useQuery({
    queryKey: QK.mediaHead.approvals({ status: '' }),
    queryFn: () => departmentApi.getMediaHeadApprovals(token, {}),
    enabled: Boolean(token),
  });

  const workflows = arr(data?.data);
  const allWorkflows = arr(allData?.data);
  const counts = {
    pending: allWorkflows.filter((w) => w.status === 'pending').length,
    approved: allWorkflows.filter((w) => w.status === 'approved').length,
    rejected: allWorkflows.filter((w) => w.status === 'rejected').length,
    total: allWorkflows.length,
  };

  const invalidateAfterDecision = () => {
    queryClient.invalidateQueries({ queryKey: ['mediaHead', 'approvals'] });
    queryClient.invalidateQueries({ queryKey: QK.mediaHead.dashboard({}) });
    queryClient.invalidateQueries({ queryKey: ['media', 'approvals'] });
  };

  const decideWithRetry = async (workflowId, body) => {
    try {
      return await departmentApi.decideMediaApproval(token, workflowId, body);
    } catch (error) {
      if (!isTransientNetworkError(error)) throw error;
      // Vite/nodemon can briefly disconnect while the backend reloads. Give it
      // one short retry so an approval click is not lost during that window.
      await wait(750);
      return departmentApi.decideMediaApproval(token, workflowId, body);
    }
  };

  const submitDecision = async (workflow, decision, remarks = '') => {
    const title = getApprovalTitle(workflow);
    setDecidingId(workflow._id);
    try {
      await decideWithRetry(workflow._id, { decision, remarks });
      toast.success(`"${title}" ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      setRejectingWorkflow(null);
      setRejectionReason('');
      invalidateAfterDecision();
    } catch (err) {
      toast.error(err?.message || 'Failed to record decision');
    } finally {
      setDecidingId(null);
    }
  };

  const handleApprove = async (workflow) => {
    const title = getApprovalTitle(workflow);
    const shouldProceed = await confirm({
      title: 'Approve request?',
      message: `Approve "${title}" and make it available as an approved media item?`,
      confirmLabel: 'Approve',
      tone: 'warning',
    });
    if (shouldProceed) submitDecision(workflow, 'approve');
  };

  const openRejectDialog = (workflow) => {
    setRejectingBulk(null);
    setRejectingWorkflow(workflow);
    setRejectionReason('');
  };

  const selectedWorkflows = workflows.filter((w) => selectedIds.includes(w._id));

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleSelectAll = () => {
    const pendingIds = workflows.filter((w) => w.status === 'pending').map((w) => w._id);
    setSelectedIds((prev) => (prev.length === pendingIds.length ? [] : pendingIds));
  };

  const bulkApprove = async () => {
    const shouldProceed = await confirm({
      title: `Approve ${selectedWorkflows.length} requests?`,
      message: 'Every selected request will be approved and made available as approved media items.',
      confirmLabel: 'Approve all',
      tone: 'warning',
    });
    if (!shouldProceed) return;
    setBulkBusy(true);
    let failures = 0;
    for (const workflow of selectedWorkflows) {
      try {
        await decideWithRetry(workflow._id, { decision: 'approve', remarks: '' });
      } catch {
        failures += 1;
      }
    }
    setBulkBusy(false);
    setSelectedIds([]);
    invalidateAfterDecision();
    if (failures) toast.error(`${failures} of ${selectedWorkflows.length} could not be approved.`);
    else toast.success(`${selectedWorkflows.length} requests approved.`);
  };

  const openBulkRejectDialog = () => {
    setRejectingWorkflow(null);
    setRejectingBulk(selectedWorkflows);
    setRejectionReason('');
  };

  const submitBulkReject = async () => {
    const items = rejectingBulk || [];
    setBulkBusy(true);
    let failures = 0;
    for (const workflow of items) {
      try {
        await decideWithRetry(workflow._id, { decision: 'reject', remarks: rejectionReason.trim() });
      } catch {
        failures += 1;
      }
    }
    setBulkBusy(false);
    setRejectingBulk(null);
    setRejectionReason('');
    setSelectedIds([]);
    invalidateAfterDecision();
    if (failures) toast.error(`${failures} of ${items.length} could not be rejected.`);
    else toast.success(`${items.length} requests rejected.`);
  };

  const statItems = [
    ['Pending', counts.pending, 'pending_actions', { onClick: () => setStatusFilter('pending'), active: statusFilter === 'pending', tone: 'warning' }],
    ['Approved', counts.approved, 'verified', { onClick: () => setStatusFilter('approved'), active: statusFilter === 'approved', tone: 'success' }],
    ['Rejected', counts.rejected, 'cancel', { onClick: () => setStatusFilter('rejected'), active: statusFilter === 'rejected', tone: 'danger' }],
    ['Total', counts.total, 'fact_check', { onClick: () => setStatusFilter(''), active: statusFilter === '', tone: 'accent' }],
  ];

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader title="Approval Center" subtitle="Review and decide pending media approval requests" icon="fact_check" />

        {counts.pending > 0 ? (
          <p className="-mt-2 mb-5 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">{counts.pending}</span>{' '}
            {counts.pending === 1 ? 'request is' : 'requests are'} waiting on your decision.
          </p>
        ) : (
          <p className="-mt-2 mb-5 text-sm text-neutral-500 dark:text-neutral-400">You're all caught up — nothing pending review.</p>
        )}

        <div className="mb-5">
          <CreativeStatsGrid items={statItems} columns={4} />
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {['pending', 'approved', 'rejected', ''].map((status) => (
            <button
              key={status || 'all'}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]/40 ${
                statusFilter === status
                  ? 'bg-[var(--portal-accent)] text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {status || 'All'}
            </button>
          ))}
        </div>

        {statusFilter === 'pending' && workflows.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              <input
                type="checkbox"
                checked={selectedIds.length > 0 && selectedIds.length === workflows.length}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-neutral-300 accent-[var(--portal-accent)]"
              />
              {selectedIds.length ? `${selectedIds.length} selected` : 'Select all pending'}
            </label>
            {selectedIds.length ? (
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="sm" disabled={bulkBusy} onClick={openBulkRejectDialog}>
                  Reject selected
                </Button>
                <Button variant="success" size="sm" loading={bulkBusy} onClick={bulkApprove}>
                  Approve selected
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Unable to load approvals.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              icon="fact_check"
              title={statusFilter ? `No ${statusFilter} approvals` : 'No approvals yet'}
              description="Nothing waiting on a decision right now."
            />
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {workflows.map((workflow) => {
                const pendingStep = workflow.steps?.find((s) => s.status === 'pending');
                const title = getApprovalTitle(workflow);
                const section = workflow.display?.section || workflow.media?.section || workflow.entityType || '';
                const requester = getRequesterName(workflow);
                const pendingRole = workflow.display?.pendingRole || pendingStep?.role || '';
                const media = workflow.media || {};
                const isPending = workflow.status === 'pending';

                return (
                  <div key={workflow._id} className="flex flex-wrap items-start gap-3 p-4 transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30">
                    {isPending ? (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(workflow._id)}
                        onChange={() => toggleSelected(workflow._id)}
                        className="mt-1.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-[var(--portal-accent)]"
                        aria-label={`Select ${title}`}
                      />
                    ) : (
                      <div className="w-4 shrink-0" />
                    )}

                    <button
                      type="button"
                      onClick={() => media.storageUrl && setPreviewFile(media)}
                      disabled={!media.storageUrl}
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 disabled:cursor-default dark:border-neutral-700 dark:bg-neutral-800"
                      aria-label="Preview file"
                    >
                      {media.thumbnailUrl ? (
                        <img src={media.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[20px] text-neutral-400">{fileIconFor(media)}</span>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
                        <StatusBadge tone={STATUS_TONE[workflow.status] || 'neutral'} label={workflow.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-[10px] font-bold text-[var(--portal-accent)]"
                          title={requester}
                        >
                          {getInitials(requester)}
                        </span>
                        <span className="truncate">
                          {section ? `${section} · ` : ''}
                          {requester}
                          {media.projectName ? ` · ${media.projectName}` : ''}
                          {pendingRole ? ` · awaiting ${formatRole(pendingRole).toLowerCase()}` : ''}
                        </span>
                      </div>
                      {media.description ? <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">{media.description}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {media.storageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(media)}
                            className="inline-flex items-center gap-1 font-semibold text-[var(--portal-accent)] hover:underline"
                          >
                            <span className="material-symbols-outlined text-[15px]">visibility</span>
                            Preview file
                          </button>
                        ) : null}
                        <span className="text-neutral-400">Submitted {new Date(workflow.createdAt).toLocaleString()}</span>
                      </div>
                      {workflow.display?.decisionRemarks ? (
                        <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${workflow.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                          <span className="font-semibold">{workflow.status === 'rejected' ? 'Rejection reason:' : 'Decision note:'}</span> {workflow.display.decisionRemarks}
                        </div>
                      ) : null}
                    </div>
                    {isPending && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={decidingId === workflow._id}
                          onClick={() => openRejectDialog(workflow)}
                          className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        >
                          Reject
                        </Button>
                        <Button variant="success" size="sm" loading={decidingId === workflow._id} onClick={() => handleApprove(workflow)}>
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CloudinaryFilePreviewModal open={Boolean(previewFile)} file={previewFile} onClose={() => setPreviewFile(null)} />

      {rejectingWorkflow || rejectingBulk ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-approval-title">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">cancel</span>
              <div>
                <h2 id="reject-approval-title" className="text-lg font-bold text-neutral-900 dark:text-white">
                  {rejectingBulk ? `Reject ${rejectingBulk.length} requests?` : `Reject ${getApprovalTitle(rejectingWorkflow)}?`}
                </h2>
                <p className="mt-1 text-sm text-neutral-500">Explain what Media Marketing must correct before resubmitting.</p>
              </div>
            </div>
            <label className="mt-5 block text-sm font-semibold text-neutral-700 dark:text-neutral-200" htmlFor="rejection-reason">Rejection reason</label>
            <textarea
              id="rejection-reason"
              rows={4}
              maxLength={1000}
              autoFocus
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Example: Replace the low-resolution logo with the transparent PNG version."
              className="mt-2 w-full resize-y rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-200 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white dark:focus:ring-rose-900/50"
            />
            <div className="mt-2 flex justify-between text-xs text-neutral-400"><span>Required</span><span>{rejectionReason.length}/1000</span></div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={rejectingBulk ? bulkBusy : decidingId === rejectingWorkflow?._id}
                onClick={() => { setRejectingWorkflow(null); setRejectingBulk(null); }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={rejectingBulk ? bulkBusy : decidingId === rejectingWorkflow?._id}
                disabled={!rejectionReason.trim()}
                onClick={() => (rejectingBulk ? submitBulkReject() : submitDecision(rejectingWorkflow, 'reject', rejectionReason.trim()))}
              >
                {rejectingBulk ? 'Reject all' : 'Reject and return'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default MediaHeadApprovalCenter;
