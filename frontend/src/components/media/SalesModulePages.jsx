import React from 'react';
import SalesPortalLayout from './SalesPortalLayout';
import TaskWorkspace from '../../features/tasks/TaskWorkspace';
import DepartmentAttendance from '../shared/DepartmentAttendance';
import { DepartmentTeamPage, DepartmentMessagesPage } from '../shared/DepartmentCollabPages';
import { mediaModulesApi } from '../../services/departmentModules';

const MEDIA_TASK_MANAGERS = ['media_head', 'admin', 'super_admin', 'superadmin'];

// Sales users only ever see their own tasks/attendance (enforced by the backend
// media modules scope), so these reuse the shared Media components as-is.
export const SalesTasksPage = () => (
  <SalesPortalLayout activeId="tasks">
    <TaskWorkspace portal="media" icon="task" title="My Tasks" description="Track and update the work assigned to you." manageRoles={MEDIA_TASK_MANAGERS} />
  </SalesPortalLayout>
);

export const SalesAttendancePage = () => (
  <SalesPortalLayout activeId="attendance">
    <DepartmentAttendance api={mediaModulesApi} portalLabel="My" />
  </SalesPortalLayout>
);

// Media-only Team directory and Messages (backend restricts both to the Media department's roles).
export const SalesTeamPage = () => (
  <SalesPortalLayout activeId="team">
    <DepartmentTeamPage dept="media" />
  </SalesPortalLayout>
);

export const SalesMessagesPage = () => (
  <SalesPortalLayout activeId="messages" bare>
    <DepartmentMessagesPage dept="media" homePath="/media/sales/dashboard" />
  </SalesPortalLayout>
);
