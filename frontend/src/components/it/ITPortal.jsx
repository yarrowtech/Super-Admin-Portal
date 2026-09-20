import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { io } from 'socket.io-client';
import ITSidebar from './ITSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { resolvePortalMenu } from '../../config/portalMenus';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const ITPortal = () => {
  const { user, token } = useAuth();
  const [supportBadge, setSupportBadge] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', 'support:admins');
    socket.on('support:new_ticket', () => setSupportBadge((n) => n + 1));
    return () => socket.disconnect();
  }, [token]);

  const itMobileItems = resolvePortalMenu('it').map(({ label, icon, path }) => ({ label, icon, path }));

  return (
    <AppLayout
      sidebar={<ITSidebar supportBadge={supportBadge} />}
      title="IT Portal"
      subtitle="Executive technology control center"
      mobileIcon="memory"
      mobileItems={itMobileItems}
      user={user}
      showHeader={false}
      showMobileNav={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default ITPortal;
