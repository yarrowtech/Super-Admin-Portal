import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Tabs from '../../common/Tabs';
import LeaveManagement from '../LeaveManagement';
import LeavePolicies from '../LeavePolicies';
import HolidayCalendar from '../HolidayCalendar';

const TABS = [
  { key: 'requests', label: 'Leave Requests', icon: 'event_note' },
  { key: 'policies', label: 'Leave Policies', icon: 'policy' },
  { key: 'holidays', label: 'Holiday Calendar', icon: 'celebration' },
];

const LeavePage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Leave Management"
          subtitle="Manage leave requests, policies and holidays"
          user={user}
          icon="hourglass_empty"
        />

        <Tabs items={TABS} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

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
