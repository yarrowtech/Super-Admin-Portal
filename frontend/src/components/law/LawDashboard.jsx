import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { lawApi } from '../../services/law';
import { useAuth } from '../../context/AuthContext';
import { getLawSection } from './lawModuleConfig';
import LegalDocManagement from './LegalDocManagement';
import LSWLegalLibrary from './LSWLegalLibrary';
import LawOpsPage from './pages/LawOpsPage';

const pageComponents = {
  dashboard: LegalDocManagement,
  'legal-docs': LegalDocManagement,
  'legal-library': LSWLegalLibrary,
};
const AGREEMENTS_CACHE_KEY = 'law_agreements_cache_v1';
const CACHE_TTL = 5 * 60 * 1000;
const RECORDS_CACHE_TTL = 60 * 1000;
const LAW_STRICT_PROJECTS = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];
const LAW_PROJECT_FALLBACK_ORDER = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];

const moduleToSection = (pathname = '') => {
  if (pathname.startsWith('/law/legal-docs')) return 'legal-docs';
  if (pathname.startsWith('/law/legal-library')) return 'legal-library';
  if (pathname.startsWith('/law/agreements')) return 'agreements';
  if (pathname.startsWith('/law/policy')) return 'privacy-policy';
  if (pathname.startsWith('/law/disputes')) return 'disputes-fraud';
  if (pathname.startsWith('/law/ip')) return 'ip-copyright';
  if (pathname.startsWith('/law/work-hire')) return 'work-hire';
  if (pathname.startsWith('/law/third-party')) return 'third-party';
  return 'dashboard';
};

const sectionToPath = (section = 'dashboard') => {
  if (section === 'legal-docs') return '/law/legal-docs';
  if (section === 'legal-library') return '/law/legal-library';
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
  const recordsCache = useRef({});

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

  const buildRecordsCacheKey = () => `${activeSection}::${selectedProjectId || 'all'}`;

  const readRecordsCache = (key) => {
    const entry = recordsCache.current[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > RECORDS_CACHE_TTL) return null;
    return entry;
  };

  const writeRecordsCache = (key, data) => {
    recordsCache.current[key] = { data, timestamp: Date.now() };
  };

  const loadLawData = async () => {
    if (!token) return;
    setError('');
    try {
      const projectsRes = await lawApi.getProjects(token, { limit: 100 });
      const projectItems = projectsRes?.data?.items || [];
      const strictProjects = LAW_STRICT_PROJECTS.map((name) => {
        const matched = projectItems.find(
          (p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase()
        );
        return matched || { _id: `virtual-${name}`, name };
      });
      setProjects(strictProjects);

      const fallbackProject = LAW_PROJECT_FALLBACK_ORDER.map((name) =>
        strictProjects.find((p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase())
      ).find(Boolean);
      const effectiveProjectId =
        selectedProjectId ||
        fallbackProject?._id ||
        fallbackProject?.id ||
        strictProjects[0]?._id ||
        strictProjects[0]?.id ||
        '';
      const hasRealProjectId = effectiveProjectId && !String(effectiveProjectId).startsWith('virtual-');
      if (activeSection !== 'dashboard' && effectiveProjectId && !selectedProjectId) {
        setSearchParams({ projectId: effectiveProjectId });
        try { localStorage.setItem('activeProjectId', String(effectiveProjectId)); } catch {}
      }

      const recordsCacheKey = buildRecordsCacheKey();
      const cached = readRecordsCache(recordsCacheKey);
      if (cached && activeSection !== 'agreements') {
        setRecords(cached.data || []);
        setLastUpdatedAt(cached.timestamp);
      }

      const recordsPromise = activeSection === 'agreements'
        ? Promise.resolve({ data: [] })
        : hasRealProjectId && activeSection !== 'dashboard'
          ? lawApi.getProjectModuleData(
              token,
              activeSection === 'privacy-policy' ? 'policy' : activeSection === 'disputes-fraud' ? 'disputes' : activeSection === 'ip-copyright' ? 'ip' : activeSection,
              effectiveProjectId
            )
          : lawApi.getRecords(token, activeSection !== 'dashboard' ? { section: activeSection, projectId: effectiveProjectId } : {});

      const contractsPromise = activeSection === 'dashboard' || !effectiveProjectId
        ? Promise.resolve({ data: { contracts: [] } })
        : hasRealProjectId ? lawApi.getContracts(token, { projectId: effectiveProjectId }) : Promise.resolve({ data: { contracts: [] } });
      const compliancePromise = activeSection === 'dashboard' || !effectiveProjectId
        ? Promise.resolve({ data: { compliance: [] } })
        : hasRealProjectId ? lawApi.getCompliance(token, { projectId: effectiveProjectId }) : Promise.resolve({ data: { compliance: [] } });

      const [dashboardRes, recordsRes, contractsRes, complianceRes] = await Promise.allSettled([
        lawApi.getDashboard(token),
        recordsPromise,
        contractsPromise,
        compliancePromise,
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
        const items = recordsRes.value?.data?.items || recordsRes.value?.data || [];
        setRecords(items);
        writeRecordsCache(recordsCacheKey, items);
        setLastUpdatedAt(Date.now());
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
    if (!token || activeSection !== 'agreements' || !selectedProjectId || String(selectedProjectId).startsWith('virtual-')) return;
    try { localStorage.setItem('activeProjectId', String(selectedProjectId)); } catch {}
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
      if (!requestPayload.projectId) {
        throw new Error('Please select a project before creating or updating records.');
      }
      const referenceFiles = Array.isArray(requestPayload.referenceFiles) ? requestPayload.referenceFiles : [];
      delete requestPayload.referenceFiles;

      if (referenceFiles.length > 0) {
        const uploadRes = await lawApi.uploadReferencePdfs(token, requestPayload.projectId, referenceFiles);
        const uploadedPdfs = uploadRes?.data || [];
        requestPayload.metadata = {
          ...(requestPayload.metadata || {}),
          referencePdfs: [
            ...((requestPayload.metadata?.referencePdfs && Array.isArray(requestPayload.metadata.referencePdfs))
              ? requestPayload.metadata.referencePdfs
              : []),
            ...uploadedPdfs,
          ],
        };
      }

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
          onProjectChange={(projectId) => {
            if (projectId) {
              try { localStorage.setItem('activeProjectId', String(projectId)); } catch {}
            }
            setSearchParams(projectId ? { projectId } : {});
          }}
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
