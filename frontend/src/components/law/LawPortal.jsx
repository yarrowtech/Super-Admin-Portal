import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LawDashboard from './LawDashboard';
import LawSidebar from './LawSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';

const LawPortal = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [counts, setCounts] = useState({ activeCases: 0, expiring: 0 });

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!token) return;
      try {
        const [projectsRes, dashboardRes] = await Promise.all([
          lawApi.getProjects(token, { limit: 100 }),
          lawApi.getDashboard(token),
        ]);
        if (!alive) return;
        setProjects(projectsRes?.data?.items || []);
        setCounts({
          activeCases: dashboardRes?.data?.totals?.needsAttention || 0,
          expiring: dashboardRes?.data?.totals?.expiringSoon || 0,
        });
      } catch {
        if (alive) setProjects([]);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [token]);

  const mobileItems = useMemo(
    () => [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', active: location.pathname === '/law/dashboard', onClick: () => navigate('/law/dashboard') },
      { key: 'agreements', label: 'Agreements', icon: 'contract', active: location.pathname.startsWith('/law/agreements'), onClick: () => navigate('/law/agreements') },
      { key: 'policy', label: 'Policy', icon: 'policy', active: location.pathname.startsWith('/law/policy'), onClick: () => navigate('/law/policy') },
      { key: 'disputes', label: 'Disputes', icon: 'balance', active: location.pathname.startsWith('/law/disputes'), onClick: () => navigate('/law/disputes') },
    ],
    [location.pathname, navigate]
  );

  return (
    <AppLayout
      sidebar={<LawSidebar projects={projects} counts={counts} />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      mobileItems={mobileItems}
      user={user}
    >
      <div className="portal-content p-0">
        <LawDashboard />
      </div>
    </AppLayout>
  );
};

export default LawPortal;
