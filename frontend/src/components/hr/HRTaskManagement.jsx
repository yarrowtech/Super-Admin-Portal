import React from 'react';
import { useSearchParams } from 'react-router-dom';
import HrPageShell from '../../features/hr/components/HrPageShell';
import StaffWorkReport from './StaffWorkReport';
import TaskWorkspace from '../../features/tasks/TaskWorkspace';

/**
 * HR's task module — Task Operations now uses the shared task/Kanban
 * system (Phase 2B), same as IT Manager and Employee (all backed by the
 * same Task model). Work Updates keeps its existing StaffWorkReport review
 * flow untouched, and the `?view=updates` deep link from the HR sidebar's
 * "work-updates" redirect still resolves the same tab as before.
 */
const HRTaskManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') === 'updates' ? 'updates' : 'tasks';

  return (
    <HrPageShell
      title="Work Management"
      subtitle="Manage assigned work and review employee execution updates from one workspace."
      icon="task_alt"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'tasks', label: 'Task Operations', description: 'Assign and control work items' },
            { key: 'updates', label: 'Work Updates', description: 'Review employee submissions' },
          ].map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSearchParams(item.key === 'tasks' ? {} : { view: item.key })}
                className={`min-w-[220px] rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300'
                }`}
              >
                <p className="text-sm font-bold">{item.label}</p>
                <p className={`mt-1 text-xs ${isActive ? 'text-primary/80' : 'text-gray-500 dark:text-gray-400'}`}>
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>

        {activeView === 'updates' ? (
          <StaffWorkReport
            embedded
            title="Employee Work Updates"
            subtitle="Review submitted execution notes, completed work, blockers, and progress snapshots."
          />
        ) : (
          <TaskWorkspace portal="hr" renderHeader={false} title="Task Operations" description="Assign, track, and close employee work items." />
        )}
      </div>
    </HrPageShell>
  );
};

export default HRTaskManagement;
