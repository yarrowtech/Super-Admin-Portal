import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import LeaveManagement from '../LeaveManagement';
import LeavePolicies from '../LeavePolicies';
import HolidayCalendar from '../HolidayCalendar';

const LeavePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // 'requests', 'policies', 'holidays'

  const tabs = [
    { id: 'requests', label: 'Leave Requests', icon: 'event_note' },
    { id: 'policies', label: 'Leave Policies', icon: 'policy' },
    { id: 'holidays', label: 'Holiday Calendar', icon: 'celebration' },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Leave Management"
          subtitle="Manage leave requests, policies, and holidays"
          user={user}
          icon="hourglass_empty"
          showSearch={false}
          showNotifications={true}
          showThemeToggle={true}
        />

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-neutral-200/50 dark:border-neutral-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'border-orange-500 bg-orange-50/50 text-orange-700 dark:border-orange-400 dark:bg-orange-900/20 dark:text-orange-300'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'requests' && <LeaveManagement />}
          {activeTab === 'policies' && <LeavePolicies />}
          {activeTab === 'holidays' && <HolidayCalendar />}
        </div>
      </div>
    </main>
  );
};

export default LeavePage;
