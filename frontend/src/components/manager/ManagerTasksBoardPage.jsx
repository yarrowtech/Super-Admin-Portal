import React from 'react';
import TaskWorkspace from '../../features/tasks/TaskWorkspace';

const ManagerTasksBoardPage = () => (
  <TaskWorkspace
    portal="manager"
    icon="task_alt"
    title="Team Tasks"
    description="Monitor and move execution across your team with a real Kanban board."
  />
);

export default ManagerTasksBoardPage;
