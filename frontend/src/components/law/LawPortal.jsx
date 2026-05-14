import React, { useState } from 'react';
import LawDashboard from './LawDashboard';
import LawSidebar from './LawSidebar';
import { LAW_SECTIONS } from './lawModuleConfig';
import MobilePortalNav from '../common/MobilePortalNav';

const LawPortal = () => {
  const [activeSection, setActiveSection] = useState(LAW_SECTIONS[0].id);

  return (
    <div className="portal-shell min-h-screen w-full bg-background-light font-display text-neutral-800 dark:bg-background-dark dark:text-neutral-100">
      <MobilePortalNav
        title="Law Portal"
        subtitle="Legal operations"
        icon="gavel"
        items={LAW_SECTIONS.map((section) => ({
          key: section.id,
          label: section.label,
          icon: section.icon || 'gavel',
          active: activeSection === section.id,
          onClick: () => setActiveSection(section.id),
        }))}
      />
      <LawSidebar
        activeSection={activeSection}
        sections={LAW_SECTIONS}
        onSelect={setActiveSection}
      />
      <div className="pt-16 md:ml-64 md:pt-0 portal-content">
        <LawDashboard
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>
    </div>
  );
};

export default LawPortal;
