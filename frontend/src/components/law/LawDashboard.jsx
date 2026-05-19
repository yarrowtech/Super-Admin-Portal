import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { lawApi } from '../../services/law';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import { getLawSection } from './lawModuleConfig';
import LawHomePage from './pages/LawHomePage';
import LawOpsPage from './pages/LawOpsPage';

const pageComponents = {
  dashboard: LawHomePage,
};

const moduleToSection = (pathname = '') => {
  if (pathname.startsWith('/law/agreements')) return 'agreements';
  if (pathname.startsWith('/law/policy')) return 'privacy-policy';
  if (pathname.startsWith('/law/disputes')) return 'disputes-fraud';
  if (pathname.startsWith('/law/ip')) return 'ip-copyright';
  if (pathname.startsWith('/law/work-hire')) return 'work-hire';
  if (pathname.startsWith('/law/third-party')) return 'third-party';
  return 'dashboard';
};

const sectionToPath = (section = 'dashboard') => {
  if (section === 'agreements') return '/law/agreements';
  if (section === 'privacy-policy') return '/law/policy';
  if (section === 'disputes-fraud') return '/law/disputes';
  if (section === 'ip-copyright') return '/law/ip';
  if (section === 'work-hire') return '/law/work-hire';
  if (section === 'third-party') return '/law/third-party';
  return '/law/dashboard';
};

const LawDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const activeSection = moduleToSection(location.pathname);
  const isCreateMode = location.pathname.endsWith('/create');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiSummary, setApiSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadLawData = async () => {
    if (!token) return;
    setError('');
    try {
      const recordsPromise = projectId && activeSection !== 'dashboard'
        ? lawApi.getProjectModuleData(
            token,
            activeSection === 'privacy-policy' ? 'policy' : activeSection === 'disputes-fraud' ? 'disputes' : activeSection === 'ip-copyright' ? 'ip' : activeSection,
            projectId
          )
        : lawApi.getRecords(token, activeSection !== 'dashboard' ? { section: activeSection } : {});

      const [dashboardRes, recordsRes, contractsRes, complianceRes] = await Promise.allSettled([
        lawApi.getDashboard(token),
        recordsPromise,
        lawApi.getContracts(token),
        lawApi.getCompliance(token),
      ]);

      setApiSummary({
        permissions:
          dashboardRes.status === 'fulfilled'
            ? dashboardRes.value?.data?.permissions || []
            : [],
        totals: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.totals || {} : {},
        contracts:
          contractsRes.status === 'fulfilled'
            ? contractsRes.value?.data?.contracts?.length || 0
            : 0,
        compliance:
          complianceRes.status === 'fulfilled'
            ? complianceRes.value?.data?.compliance?.length || 0
            : 0,
      });

      if (recordsRes.status === 'fulfilled') {
        setRecords(recordsRes.value?.data?.items || recordsRes.value?.data || []);
      }

      const failed = [dashboardRes, recordsRes, contractsRes, complianceRes].find(
        (result) => result.status === 'rejected'
      );
      if (failed) {
        setError(failed.reason?.message || 'Some Law data could not be loaded.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load Law module data.');
    }
  };

  useEffect(() => {
    loadLawData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeSection, projectId]);

  const ActivePage = pageComponents[activeSection];
  const sectionInfo = getLawSection(activeSection);
  const sectionRecords = records.filter((record) => record.section === activeSection);

  const handleSaveRecord = async (payload, recordId) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const requestPayload = { ...payload, projectId: projectId || payload.projectId };
      if (recordId) {
        const res = await lawApi.updateRecord(token, recordId, requestPayload);
        setRecords((prev) => prev.map((record) => (record._id === recordId ? res.data : record)));
      } else {
        const res = await lawApi.createRecord(token, requestPayload);
        setRecords((prev) => [res.data, ...prev]);
      }
    } catch (err) {
      setError(err.message || 'Unable to save Law record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!token || !recordId) return;
    setSaving(true);
    setError('');
    try {
      await lawApi.deleteRecord(token, recordId);
      setRecords((prev) => prev.filter((record) => record._id !== recordId));
    } catch (err) {
      setError(err.message || 'Unable to delete Law record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="px-6 pb-0 pt-4">
        <PortalHeader
          title={sectionInfo.title}
          subtitle={`${user?.role?.toUpperCase() || 'LAW'} view • ${sectionInfo.summary}`}
          user={user}
          icon={sectionInfo.icon}
          onSearchChange={(event) => setSearchTerm(event.target.value)}
          searchPlaceholder="Search contracts, disputes, alerts..."
        />
      </div>
      {ActivePage ? (
        <ActivePage records={records} onSectionChange={(section) => navigate(sectionToPath(section))} />
      ) : (
        <LawOpsPage
          sectionId={activeSection}
          searchTerm={searchTerm}
          error={error}
          apiSummary={apiSummary}
          records={sectionRecords}
          saving={saving}
          onSearchChange={setSearchTerm}
          onSectionChange={(section) => navigate(sectionToPath(section))}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onRefresh={loadLawData}
          forceOpenForm={isCreateMode}
        />
      )}
    </>
  );
};

export default LawDashboard;
