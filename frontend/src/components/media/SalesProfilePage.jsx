import React from 'react';
import SalesPortalLayout from './SalesPortalLayout';
import EmployeeProfilePage from '../shared/EmployeeProfilePage';

const SalesProfilePage = () => (
  <SalesPortalLayout activeId="profile" bare>
    <EmployeeProfilePage portalLabel="Media Sales" />
  </SalesPortalLayout>
);

export default SalesProfilePage;
