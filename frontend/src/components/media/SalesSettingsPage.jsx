import React from 'react';
import PortalSettingsPage from '../shared/PortalSettingsPage';
import SalesPortalLayout from './SalesPortalLayout';
const SalesSettingsPage = () => (
  <SalesPortalLayout activeId="settings" bare>
    <PortalSettingsPage portalLabel="Media Sales" accentColor="#0f766e" />
  </SalesPortalLayout>
);
export default SalesSettingsPage;
