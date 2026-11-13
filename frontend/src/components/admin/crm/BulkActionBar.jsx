/**
 * The action bar that appears once rows are selected.
 *
 * Every control here writes to many records at once, so each one states the
 * count in its confirm text and the destructive action is separated from the
 * rest. Nothing fires straight off a change event without the operator seeing
 * how many records they are about to touch.
 */
import { useState } from 'react';
import Button from '../../common/Button';
import { useToast } from '../../../context/ToastContext';
import { apiFetch, PRIORITY_OPTIONS, DEPT_OPTIONS, userLabel } from './crmShared';

export default function BulkActionBar({
  ids, token, statuses, users, projects = [], onDone, onClear, canDeactivate = false,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const count = ids.length;
  if (!count) return null;

  const noun = `${count} client${count === 1 ? '' : 's'}`;

  /**
   * One path for every bulk call, so the confirm, the busy lock, the toast and
   * the refresh can never be wired differently between actions.
   */
  const run = async (path, body, { confirm, verb }) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    try {
      const { data } = await apiFetch(`/clients/bulk/${path}`, token, {
        method: 'POST',
        body: JSON.stringify({ ids, ...body }),
      });
      // The server reports what it actually changed, which can be less than was
      // selected — rows already on the target stage, for instance. Say so rather
      // than claiming every selected record moved.
      const changed = data.modified ?? 0;
      if (changed === 0) {
        toast.success(`No change needed — ${noun} already ${verb}.`);
      } else if (changed < count) {
        toast.success(`${changed} of ${count} updated. The rest were already ${verb}.`);
      } else {
        toast.success(`${noun} updated.`);
      }
      onDone?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const selectCls = 'h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

  // Each select is uncontrolled-by-reset: after firing, the value snaps back to
  // the placeholder so the bar never looks like it holds a pending state.
  const fire = (e, handler) => {
    const { value } = e.target;
    e.target.value = '';
    if (value) handler(value);
  };

  return (
    <div
      className="sticky bottom-4 z-10 mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-200 bg-white/95 p-3 backdrop-blur dark:border-neutral-700 dark:bg-neutral-900/95"
      style={{ boxShadow: 'var(--erp-shadow-soft)' }}
      role="region"
      aria-label="Bulk actions"
    >
      <span className="flex items-center gap-2 pr-1 text-sm font-bold text-neutral-900 dark:text-neutral-100">
        <span
          className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-black text-white"
          style={{ background: 'var(--portal-accent)' }}
        >
          {count}
        </span>
        selected
      </span>

      <select
        defaultValue=""
        disabled={busy}
        aria-label="Move selected clients to stage"
        className={selectCls}
        onChange={(e) => fire(e, (status) =>
          run('status', { status }, {
            confirm: `Move ${noun} to “${status}”?`,
            verb: `in ${status}`,
          }))}
      >
        <option value="">Move to stage…</option>
        {statuses.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
      </select>

      <select
        defaultValue=""
        disabled={busy}
        aria-label="Assign owner to selected clients"
        className={selectCls}
        onChange={(e) => fire(e, (owner) => {
          const label = owner === '__none__'
            ? 'Unassigned'
            : userLabel(users.find(u => u._id === owner));
          return run('owner', { owner: owner === '__none__' ? '' : owner }, {
            confirm: `Set the owner of ${noun} to ${label}?`,
            verb: `owned by ${label}`,
          });
        })}
      >
        <option value="">Assign owner…</option>
        <option value="__none__">— Unassign —</option>
        {users.map(u => <option key={u._id} value={u._id}>{userLabel(u)}</option>)}
      </select>

      <select
        defaultValue=""
        disabled={busy}
        aria-label="Set priority on selected clients"
        className={selectCls}
        onChange={(e) => fire(e, (priority) =>
          run('priority', { priority }, {
            confirm: `Set ${noun} to ${priority} priority?`,
            verb: `${priority} priority`,
          }))}
      >
        <option value="">Set priority…</option>
        {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
      </select>

      <select
        defaultValue=""
        disabled={busy}
        aria-label="Set department on selected clients"
        className={selectCls}
        onChange={(e) => fire(e, (dept) =>
          run('department', { department: dept }, {
            confirm: `Move ${noun} to the ${dept} department?`,
            verb: `in ${dept}`,
          }))}
      >
        <option value="">Set department…</option>
        {DEPT_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
      </select>

      {projects.length > 0 && (
        <select
          defaultValue=""
          disabled={busy}
          aria-label="Move selected clients to project"
          className={selectCls}
          onChange={(e) => fire(e, (projectId) => {
            const label = projectId === '__none__'
              ? 'no project'
              : projects.find(p => p._id === projectId)?.name || 'that project';
            return run('project', { projectId: projectId === '__none__' ? '' : projectId }, {
              confirm: `Move ${noun} to ${label}?`,
              verb: `in ${label}`,
            });
          })}
        >
          <option value="">Move to project…</option>
          <option value="__none__">— Remove from project —</option>
          {projects.map(p => (
            <option key={p._id} value={p._id}>
              {p.projectCode ? `${p.name} (${p.projectCode})` : p.name}
            </option>
          ))}
        </select>
      )}

      <div className="ml-auto flex items-center gap-2">
        {canDeactivate && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => run('deactivate', {}, {
              confirm: `Deactivate ${noun}? They are archived, not erased, and can be restored in the database.`,
              verb: 'archived',
            })}
            icon={<span className="material-symbols-outlined text-base">archive</span>}
          >
            Deactivate
          </Button>
        )}
        <Button variant="secondary" size="sm" disabled={busy} onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
