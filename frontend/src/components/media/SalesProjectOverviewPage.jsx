import React from 'react';
import SalesPortalLayout from './SalesPortalLayout';
import ProjectOverviewPage from '../shared/ProjectOverviewPage';

const SalesProjectOverviewPage = () => (
  <SalesPortalLayout activeId="project-overview" bare>
    <ProjectOverviewPage portalKey="sales" portalName="Sales Portal" />
  </SalesPortalLayout>
);

export default SalesProjectOverviewPage;
