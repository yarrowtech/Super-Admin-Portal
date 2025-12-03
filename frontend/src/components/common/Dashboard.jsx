import React, { useState } from 'react';
import Sidebar from './Sidebar';
import HRDashboard from '../hr/HRDashboard';
import ITDashboard from '../it/ITDashboard';

const Dashboard = () => {
  const [currentDepartment, setCurrentDepartment] = useState('hr');

  const handleDepartmentChange = (department) => {
    setCurrentDepartment(department);
  };

  const renderDashboard = () => {
    switch (currentDepartment) {
      case 'it':
        return <ITDashboard />;
      case 'hr':
      default:
        return <HRDashboard />;
    }
  };

  return (
    <div className="min-h-screen w-full font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-100">
      <Sidebar 
        currentDepartment={currentDepartment} 
        onDepartmentChange={handleDepartmentChange} 
      />
      <div className="ml-64">
        {renderDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;