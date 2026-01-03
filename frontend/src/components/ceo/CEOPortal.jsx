import React, { useState } from 'react';
import CEOSidebar from './CEOSidebar';
import CEODashboard from './CEODashboard';
import CEOChat from './CEOChat';

const CEOPortal = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <CEODashboard />;
      case 'chat':
        return <CEOChat />;
      default:
        return <CEODashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col font-display bg-background-light dark:bg-background-dark text-neutral-800 dark:text-neutral-200">
      <div className="flex h-full w-full">
        <CEOSidebar onViewChange={setCurrentView} />
        <div className="ml-64 flex-1">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default CEOPortal;