import React, { useState } from 'react';
import ITSidebar from './ITSidebar';
import ITDashboard from './ITDashboard';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const IT_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'user-access', label: 'User Access', icon: 'manage_accounts' },
  { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'admin_panel_settings' },
  { id: 'api-integrations', label: 'API & Integrations', icon: 'integration_instructions' },
  { id: 'infrastructure', label: 'Infrastructure', icon: 'dns' },
  { id: 'security-logs', label: 'Security Logs', icon: 'security' },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'history' },
  { id: 'access-requests', label: 'Access Requests', icon: 'approval' },
  { id: 'deployments', label: 'Deployments', icon: 'deployed_code' },
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
