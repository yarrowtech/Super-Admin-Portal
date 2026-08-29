import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK } from '../../../../utils/queryKeys';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import { UserAvatar } from '../UserPicker';
import { timeAgo } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? [];

const Composer = ({ onSubmit, busy, placeholder = 'Write a comment…', autoFocus = false }) => {
  const [value, setValue] = useState('');
  const submit = (e) => { e.preventDefault(); if (!value.trim()) return; onSubmit(value.trim()); setValue(''); };
  return (
    <form onSubmit={submit} className="flex items-start gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      />
      <Button type="submit" size="sm" loading={busy} disabled={!value.trim()}>Post</Button>
    </form>
  );
};

const CommentRow = ({ comment, onReply, replyOpen, onToggleReply, replying, currentUserId, onDelete }) => (
  <div className="flex items-start gap-3">
    <UserAvatar user={comment.author} size={28} />
    <div className="min-w-0 flex-1">
      <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-900 dark:text-white">{comment.author?.name || 'User'}</span>
          <span className="text-xs text-neutral-400">{timeAgo(comment.createdAt)}</span>
          {comment.editedAt && <span className="text-xs italic text-neutral-400">(edited)</span>}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-200">{comment.body}</p>
      </div>
      <div className="mt-1 flex items-center gap-3 px-1 text-xs font-semibold text-neutral-400">
        <button type="button" onClick={onToggleReply} className="hover:text-primary">Reply</button>
        {comment.authorId === currentUserId && <button type="button" onClick={onDelete} className="hover:text-rose-500">Delete</button>}
      </div>
      {replyOpen && <div className="mt-2"><Composer onSubmit={(body) => onReply(comment._id, body)} busy={replying} placeholder="Write a reply…" autoFocus /></div>}
    </div>
  </div>
);

const AssetCommentsTab = ({ assetId }) => {
  const { token, user } = useAuth();
  const currentUserId = user?.id || user?._id || null;
  const toast = useToast();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState(null);

  const query = useQuery({
    queryKey: QK.portfolioHierarchy.comments(assetId),
    queryFn: () => portfolioHierarchyApi.getComments(token, assetId),
    enabled: Boolean(token && assetId),
    // Collaborative surface — refresh sooner than the module default so a
    // teammate's reply shows up without a long stale window.
    staleTime: 20_000,
    gcTime: 5 * 60_000,
  });
  const comments = unwrap(query.data);
  const roots = comments.filter((c) => !c.parentId);
  const repliesOf = (id) => comments.filter((c) => c.parentId === id);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QK.portfolioHierarchy.comments(assetId) });

  const createMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createComment(token, assetId, body),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err?.message || 'Failed to post comment'),
  });
  const deleteMutation = useMutation({
    mutationFn: (commentId) => portfolioHierarchyApi.deleteComment(token, commentId),
    onSuccess: () => invalidate(),
    onError: (err) => toast.error(err?.message || 'Failed to delete comment'),
  });

  if (query.isError) return <ErrorState title="Could not load comments" description={query.error?.message} onRetry={() => query.refetch()} />;

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-6">
      <Composer onSubmit={(body) => createMutation.mutate({ body })} busy={createMutation.isPending} />
      {query.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : roots.length === 0 ? (
        <EmptyState icon="chat_bubble" title="No comments yet" description="Start a discussion on this asset." />
      ) : (
        <div className="space-y-4">
          {roots.map((c) => (
            <div key={c._id} className="space-y-3">
              <CommentRow
                comment={c}
                currentUserId={currentUserId}
                onDelete={() => deleteMutation.mutate(c._id)}
                onToggleReply={() => setReplyingTo((prev) => (prev === c._id ? null : c._id))}
                replyOpen={replyingTo === c._id}
                replying={createMutation.isPending}
                onReply={(parentId, body) => createMutation.mutate({ body, parentId }, { onSuccess: () => { invalidate(); setReplyingTo(null); } })}
              />
              {repliesOf(c._id).length > 0 && (
                <div className="ml-10 space-y-3 border-l-2 border-neutral-100 pl-4 dark:border-neutral-800">
                  {repliesOf(c._id).map((r) => (
                    <CommentRow key={r._id} comment={r} currentUserId={currentUserId} onDelete={() => deleteMutation.mutate(r._id)} onToggleReply={() => {}} replyOpen={false} replying={false} onReply={() => {}} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AssetCommentsTab;
