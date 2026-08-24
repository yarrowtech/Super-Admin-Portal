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

  const queryKey = QK.mediaHead.approvals({ status: statusFilter });
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => departmentApi.getMediaHeadApprovals(token, statusFilter ? { status: statusFilter } : {}),
    enabled: Boolean(token),
  });

  const workflows = arr(data?.data);

  const handleDecide = async (workflow, decision) => {
    const title = getApprovalTitle(workflow);
    const shouldProceed = await confirm({
      title: decision === 'approve' ? 'Approve request?' : 'Reject request?',
      message: `This will ${decision} the approval request for "${title}".`,
      confirmLabel: decision === 'approve' ? 'Approve' : 'Reject',
      tone: decision === 'approve' ? 'warning' : 'danger',
    });
    if (!shouldProceed) return;

    setDecidingId(workflow._id);
    try {
      await departmentApi.decideMediaApproval(token, workflow._id, { decision });
      toast.success(`"${title}" ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      queryClient.invalidateQueries({ queryKey: QK.mediaHead.approvals({ status: statusFilter }) });
      queryClient.invalidateQueries({ queryKey: QK.mediaHead.dashboard({}) });
      queryClient.invalidateQueries({ queryKey: QK.media.approvals({ status: statusFilter }) });
    } catch (err) {
      toast.error(err?.message || 'Failed to record decision');
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Approval Center" subtitle="Review and decide pending media approval requests" icon="fact_check" />

        <div className="mb-5 flex flex-wrap items-center gap-2">
          {['pending', 'approved', 'rejected', ''].map((status) => (
            <button
              key={status || 'all'}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-primary text-white'
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
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">fact_check</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No {statusFilter || ''} approvals</p>
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
                        {pendingRole ? ` · awaiting ${formatRole(pendingRole).toLowerCase()}` : ''}
                      </p>
                    </div>
                    {workflow.status === 'pending' && (
                      <div className="flex shrink-0 items-center gap-2">
                        <Button variant="secondary" size="sm" loading={decidingId === workflow._id} onClick={() => handleDecide(workflow, 'reject')}>
                          Reject
                        </Button>
                        <Button variant="primary" size="sm" loading={decidingId === workflow._id} onClick={() => handleDecide(workflow, 'approve')}>
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
    </main>
  );
};

export default MediaHeadApprovalCenter;
