import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import Tabs from '../common/Tabs';
import StaffWorkReport from './StaffWorkReport';
import TaskWorkspace from '../../features/tasks/TaskWorkspace';

const TASK_TABS = [
  { key: 'tasks', label: 'Task Operations', icon: 'checklist' },
  { key: 'updates', label: 'Work Updates', icon: 'fact_check' },
];

/**
 * HR's task module — Task Operations now uses the shared task/Kanban
 * system (Phase 2B), same as IT Manager and Employee (all backed by the
 * same Task model). Work Updates keeps its existing StaffWorkReport review
 * flow untouched, and the `?view=updates` deep link from the HR sidebar's
 * "work-updates" redirect still resolves the same tab as before.
 */
const HRTaskManagement = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') === 'updates' ? 'updates' : 'tasks';

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Work Management"
          subtitle="Manage assigned work and review employee execution updates from one workspace."
          user={user}
          icon="task_alt"
        />

        <Tabs
          items={TASK_TABS}
          activeKey={activeView}
          onChange={(key) => setSearchParams(key === 'tasks' ? {} : { view: key })}
          className="mb-6"
        />

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
    </main>
  );
};

export default HRTaskManagement;
