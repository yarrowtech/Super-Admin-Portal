import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { usePortfolioInvalidate } from '../../../../hooks/usePortfolioInvalidate';
import Modal from '../../../ui/Modal';
import Button from '../../../common/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';
import UserPicker from '../UserPicker';
import { TASK_STATUS_OPTIONS } from '../portfolioStatus';
import { ASSET_PRIORITY_OPTIONS } from '../portfolioStatus';

const blank = { title: '', description: '', status: 'todo', priority: 'medium', dueDate: '', assigneeId: null, assigneeUser: null };

// `task: null` = create; `task: {...}` = edit.
const TaskEditModal = ({ open, onClose, portfolioId, categoryId, task }) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const invalidate = usePortfolioInvalidate();
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    // Resets the form to the task being edited (or blank for create) each
    // time the modal opens.
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assigneeId: task.assigneeId || null,
        assigneeUser: task.assignee || null,
      });
    } else {
      setForm(blank);
    }
  }, [open, task]);

  const invalidateTasks = () => {
    queryClient.invalidateQueries({ queryKey: ['portfolioHierarchy', 'tasks', categoryId] });
    invalidate({ portfolioId, categoryId });
  };

  const createMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.createTask(token, categoryId, body),
    onSuccess: () => { toast.success('Task created.'); invalidateTasks(); onClose(); },
    onError: (err) => toast.error(err?.message || 'Failed to create task'),
  });
  const updateMutation = useMutation({
    mutationFn: (body) => portfolioHierarchyApi.updateTask(token, task._id, body),
    onSuccess: () => { toast.success('Task updated.'); invalidateTasks(); onClose(); },
    onError: (err) => toast.error(err?.message || 'Failed to update task'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const body = {
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId,
    };
    if (task) updateMutation.mutate(body);
    else createMutation.mutate(body);
  };

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal open={open} title={task ? 'Edit Task' : 'New Task'} onClose={onClose}>
      <form className="space-y-3" onSubmit={submit}>
        <Input label="Title" name="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus required />
        <div>
          <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Status" name="status" options={TASK_STATUS_OPTIONS} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} />
          <Select label="Priority" name="priority" options={ASSET_PRIORITY_OPTIONS} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
        </div>
        <UserPicker label="Assignee" value={form.assigneeId} user={form.assigneeUser} onChange={(id, u) => setForm((f) => ({ ...f, assigneeId: id, assigneeUser: u }))} />
        <Input type="date" label="Due date" name="dueDate" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>{task ? 'Save changes' : 'Create task'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskEditModal;
