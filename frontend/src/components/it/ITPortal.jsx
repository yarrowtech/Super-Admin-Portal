import React, { useState } from 'react';
import ITSidebar from './ITSidebar';
import ITDashboard from './ITDashboard';
import MobilePortalNav from '../common/MobilePortalNav';

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
  const [activeSection, setActiveSection] = useState('dashboard');
  return (
    <div className="portal-shell min-h-screen w-full font-display bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100">
      <MobilePortalNav title="IT Portal" subtitle="System Control Layer" icon="computer" items={IT_SECTIONS.map((item) => ({ key: item.id, label: item.label, icon: item.icon, active: activeSection === item.id, onClick: () => setActiveSection(item.id) }))} />
      <ITSidebar activeSection={activeSection} onSelect={setActiveSection} sections={IT_SECTIONS} />
      <div className="pt-16 md:ml-64 md:pt-0 portal-content">
        <ITDashboard activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>
    </div>
  );
};

export default ITPortal;
