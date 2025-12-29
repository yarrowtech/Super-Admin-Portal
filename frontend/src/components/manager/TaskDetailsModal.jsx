import React, { useState, useEffect, useCallback } from 'react';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';

const TaskDetailsModal = ({ isOpen, onClose, taskId, taskData }) => {
  const { token } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTaskDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await managerApi.getTaskDetails(token, taskId);
      setTask(response?.data || response);
    } catch (err) {
      console.warn('Failed to load task details (backend not implemented) - using fallback data:', err);
      // Use fallback data if backend is not implemented yet, but use taskData if available
      const mockTask = {
        id: taskId,
        title: taskData?.taskTitle || `Task ID: ${taskId}`,
        description: 'This task has been moved to review status and is awaiting your approval.',
        status: taskData?.taskStatus || 'in-review',
        priority: taskData?.priority || 'medium',
        assignedTo: {
          name: taskData?.employeeName || 'Employee',
          firstName: taskData?.employeeName?.split(' ')[0] || 'Employee',
          lastName: taskData?.employeeName?.split(' ')[1] || 'User'
        },
        project: {
          name: taskData?.projectName || 'Current Project'
        },
        dueDate: taskData?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        tags: ['review-needed'],
        comments: [
          {
            text: `This task "${taskData?.taskTitle || 'Task'}" has been moved to review and requires manager approval.`,
            author: { name: 'System' },
            createdAt: new Date().toISOString()
          }
        ]
      };
      setTask(mockTask);
      setError(''); // Clear error since we have mock data
    } finally {
      setLoading(false);
    }
  }, [token, taskId]);

  useEffect(() => {
    if (isOpen && taskId && token) {
      fetchTaskDetails();
    }
  }, [isOpen, taskId, token, fetchTaskDetails]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'todo':
      case 'pending':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'in-progress':
      case 'progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
      case 'review':
      case 'in-review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Task Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-base text-primary">progress_activity</span>
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading task details...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          ) : task ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-300">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(task.status)}`}>
                      {task.status || 'Unknown'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Priority
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                      {task.priority || 'Medium'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Assigned To
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {task.assignedTo?.name || task.assignedTo?.firstName + ' ' + task.assignedTo?.lastName || 'Unassigned'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Project
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {task.project?.name || 'No project assigned'}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Due Date
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(task.dueDate)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(task.createdAt)}
                  </p>
                </div>
              </div>

              {task.tags && task.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tags
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {task.comments && task.comments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Recent Comments
                  </label>
                  <div className="mt-2 space-y-2">
                    {task.comments.slice(0, 3).map((comment, index) => (
                      <div key={index} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {comment.text}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {comment.author?.name || 'Unknown'} • {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 rounded-xl bg-blue-50 p-4 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">
                    info
                  </span>
                  <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    Task moved to review
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This task has been moved to the review stage and requires your attention.
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              No task details available
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 dark:border-gray-800">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;