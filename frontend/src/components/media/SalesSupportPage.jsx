import React from 'react';
import PortalSupportPage from '../shared/PortalSupportPage';
import SalesPortalLayout from './SalesPortalLayout';
const SalesSupportPage = () => (
  <SalesPortalLayout activeId="support" bare>
    <PortalSupportPage portal="sales" portalLabel="Media Sales" accentColor="#0f766e" />
  </SalesPortalLayout>
);
export default SalesSupportPage;
