import React, { useState } from 'react';
import ITSidebar from './ITSidebar';
import ITDashboard from './ITDashboard';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const IT_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'user-access', label: 'User Access', icon: 'manage_accounts' },
  { id: 'assets', label: 'Asset Management', icon: 'inventory_2' },
  { id: 'network-infra', label: 'Network & Infra', icon: 'dns' },
  { id: 'security-logs', label: 'Security Logs', icon: 'security' },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'history' },
  { id: 'deployments', label: 'Deployments', icon: 'deployed_code' },
  { id: 'support', label: 'Support & Tickets', icon: 'support_agent' },
  { id: 'backup', label: 'Backup & Recovery', icon: 'backup' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const ITPortal = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const mobileItems = IT_SECTIONS.map((item) => ({
    key: item.id,
    label: item.label,
    icon: item.icon,
    active: activeSection === item.id,
    onClick: () => setActiveSection(item.id),
  }));
  return (
    <AppLayout
      sidebar={<ITSidebar activeSection={activeSection} onSelect={setActiveSection} sections={IT_SECTIONS} />}
      title="IT Portal"
      subtitle="System Control Layer"
      mobileIcon="computer"
      mobileItems={mobileItems}
      user={user}
    >
      <div className="portal-content p-0">
        <ITDashboard activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
    </AppLayout>
  );
};

export default ITPortal;
