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

const arr = (value) => (Array.isArray(value) ? value : []);

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

const MediaHeadApprovalCenter = () => {
  const { token } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [decidingId, setDecidingId] = useState(null);
  const [rejectingWorkflow, setRejectingWorkflow] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const queryKey = QK.mediaHead.approvals({ status: statusFilter });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => departmentApi.getMediaHeadApprovals(token, statusFilter ? { status: statusFilter } : {}),
    enabled: Boolean(token),
  });

  const workflows = arr(data?.data);

  const submitDecision = async (workflow, decision, remarks = '') => {
    const title = getApprovalTitle(workflow);
    setDecidingId(workflow._id);
    try {
      await departmentApi.decideMediaApproval(token, workflow._id, { decision, remarks });
      toast.success(`"${title}" ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      setRejectingWorkflow(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['mediaHead', 'approvals'] });
      queryClient.invalidateQueries({ queryKey: QK.mediaHead.dashboard({}) });
      queryClient.invalidateQueries({ queryKey: ['media', 'approvals'] });
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
    setRejectingWorkflow(workflow);
    setRejectionReason('');
  };

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader title="Approval Center" subtitle="Review and decide pending media approval requests" icon="fact_check" />

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

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Unable to load approvals.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
              <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-600">fact_check</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No {statusFilter || ''} approvals</p>
              <p className="text-xs text-neutral-400">Nothing waiting on a decision right now.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {workflows.map((workflow) => {
                const pendingStep = workflow.steps?.find((s) => s.status === 'pending');
                const title = getApprovalTitle(workflow);
                const section = workflow.display?.section || workflow.media?.section || workflow.entityType || '';
                const requester = getRequesterName(workflow);
                const pendingRole = workflow.display?.pendingRole || pendingStep?.role || '';

                return (
                  <div key={workflow._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
                        <StatusBadge tone={STATUS_TONE[workflow.status] || 'neutral'} label={workflow.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {section ? `${section} · ` : ''}
                        Requested by {requester}
                        {workflow.media?.projectName ? ` · ${workflow.media.projectName}` : ''}
                        {pendingRole ? ` · awaiting ${formatRole(pendingRole).toLowerCase()}` : ''}
                      </p>
                      {workflow.media?.description ? <p className="mt-1 line-clamp-2 text-xs text-neutral-600 dark:text-neutral-300">{workflow.media.description}</p> : null}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {workflow.media?.storageUrl ? (
                          <a href={workflow.media.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[var(--portal-accent)] hover:underline">
                            <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                            Review file
                          </a>
                        ) : null}
                        <span className="text-neutral-400">Submitted {new Date(workflow.createdAt).toLocaleString()}</span>
                      </div>
                      {workflow.display?.decisionRemarks ? (
                        <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${workflow.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                          <span className="font-semibold">{workflow.status === 'rejected' ? 'Rejection reason:' : 'Decision note:'}</span> {workflow.display.decisionRemarks}
                        </div>
                      ) : null}
                    </div>
                    {workflow.status === 'pending' && (
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
      {rejectingWorkflow ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reject-approval-title">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined rounded-xl bg-rose-100 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">cancel</span>
              <div>
                <h2 id="reject-approval-title" className="text-lg font-bold text-neutral-900 dark:text-white">Reject {getApprovalTitle(rejectingWorkflow)}?</h2>
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
              <Button variant="secondary" size="sm" disabled={decidingId === rejectingWorkflow._id} onClick={() => setRejectingWorkflow(null)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={decidingId === rejectingWorkflow._id} disabled={!rejectionReason.trim()} onClick={() => submitDecision(rejectingWorkflow, 'reject', rejectionReason.trim())}>Reject and return</Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
};

export default MediaHeadApprovalCenter;
