import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { lawApi } from '../../services/law';
import { useAuth } from '../../context/AuthContext';
import { getLawSection } from './lawModuleConfig';
import LawHomePage from './pages/LawHomePage';
import LawOpsPage from './pages/LawOpsPage';

const pageComponents = {
  dashboard: LawHomePage,
};
const AGREEMENTS_CACHE_KEY = 'law_agreements_cache_v1';
const CACHE_TTL = 5 * 60 * 1000;

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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('projectId') || '';
  const activeSection = moduleToSection(location.pathname);
  const isCreateMode = location.pathname.endsWith('/create');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiSummary, setApiSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const agreementCache = useRef({});

  const readCache = (projectId) => {
    const row = agreementCache.current?.[projectId];
    if (!row) return null;
    if (Date.now() - row.timestamp > CACHE_TTL) return null;
    return row;
  };

  const writeCache = (projectId, data) => {
    agreementCache.current[projectId] = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(AGREEMENTS_CACHE_KEY, JSON.stringify(agreementCache.current));
    } catch {
      // ignore storage failures
    }
  };

  const fetchAgreementsByProject = async (projectId) => {
    if (!projectId) return;
    const cached = readCache(projectId);
    if (cached) {
      setAgreementsLoading(false);
      setRecords(cached.data || []);
      setLastUpdatedAt(cached.timestamp);
      return;
    }

    setAgreementsLoading(true);
    const res = await lawApi.getProjectModuleData(token, 'agreements', projectId);
    const data = res?.data?.items || res?.data || [];
    writeCache(projectId, data);
    setRecords(data);
    setLastUpdatedAt(Date.now());
    setAgreementsLoading(false);
  };

  const loadLawData = async () => {
    if (!token) return;
    setError('');
    try {
      const recordsPromise = activeSection === 'agreements'
        ? Promise.resolve({ data: [] })
        : selectedProjectId && activeSection !== 'dashboard'
          ? lawApi.getProjectModuleData(
              token,
              activeSection === 'privacy-policy' ? 'policy' : activeSection === 'disputes-fraud' ? 'disputes' : activeSection === 'ip-copyright' ? 'ip' : activeSection,
              selectedProjectId
            )
          : lawApi.getRecords(token, activeSection !== 'dashboard' ? { section: activeSection } : {});

      const [dashboardRes, recordsRes, contractsRes, complianceRes, projectsRes] = await Promise.allSettled([
        lawApi.getDashboard(token),
        recordsPromise,
        lawApi.getContracts(token),
        lawApi.getCompliance(token),
        activeSection === 'dashboard' ? Promise.resolve({ data: { items: [] } }) : lawApi.getProjects(token, { limit: 100 }),
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
        setLastUpdatedAt(Date.now());
      }
      if (projectsRes.status === 'fulfilled') {
        const items = projectsRes.value?.data?.items || [];
        setProjects(items);
        if (activeSection !== 'dashboard' && !selectedProjectId && items.length) {
          setSearchParams({ projectId: items[0]._id || items[0].id });
        }
      }
      const failed = [dashboardRes, recordsRes, contractsRes, complianceRes, projectsRes].find(
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
    try {
      const cached = localStorage.getItem(AGREEMENTS_CACHE_KEY);
      if (cached) agreementCache.current = JSON.parse(cached);
    } catch {
      agreementCache.current = {};
    }
  }, []);

  useEffect(() => {
    loadLawData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeSection]);

  useEffect(() => {
    if (!token || activeSection !== 'agreements' || !selectedProjectId) return;
    fetchAgreementsByProject(selectedProjectId).catch((err) => {
      setAgreementsLoading(false);
      setError(err.message || 'Failed to load agreements.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeSection, selectedProjectId]);

  const ActivePage = pageComponents[activeSection];
  const sectionInfo = getLawSection(activeSection);
  const sectionRecords = records.filter((record) => record.section === activeSection);

  const handleSaveRecord = async (payload, recordId) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const requestPayload = { ...payload, projectId: selectedProjectId || payload.projectId };
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
      {ActivePage ? (
        <ActivePage records={records} onSectionChange={(section) => navigate(sectionToPath(section))} />
      ) : (
        <LawOpsPage
          sectionId={activeSection}
          searchTerm={searchTerm}
          error={error}
          subtitle={`${user?.role?.toUpperCase() || 'LAW'} view • ${sectionInfo.summary}`}
          records={sectionRecords}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={(projectId) => setSearchParams(projectId ? { projectId } : {})}
          loading={agreementsLoading}
          lastUpdatedAt={lastUpdatedAt}
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
