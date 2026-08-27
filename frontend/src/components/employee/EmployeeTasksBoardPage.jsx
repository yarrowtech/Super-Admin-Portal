import React from 'react';
import TaskWorkspace from '../../features/tasks/TaskWorkspace';

const EmployeeTasksBoardPage = () => (
  <TaskWorkspace
    portal="employee"
    icon="task_alt"
    title="My Tasks"
    description="Track your assignments and deadlines."
  />
);

export default EmployeeTasksBoardPage;
