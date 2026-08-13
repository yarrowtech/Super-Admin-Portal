import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import { findCanonicalProject } from '../../../config/projectNames';
import PortalHeader from '../../common/PortalHeader';
import MediaProjectList from '../MediaProjectList';

const arr = (value) => (Array.isArray(value) ? value : []);

// Mirrors MediaWorkspace's buildProjectOptions so the Head portal's card grid
// renders identically to the Marketing portal's Projects tab.
const buildProjectOptions = (projectItems = []) =>
  projectItems
    .map((project) => {
      const value = String(project?._id || project?.id || '').trim();
      if (!value) return null;

      const canonicalProject = findCanonicalProject(project);
      const code = canonicalProject?.code || project?.projectCode || project?.code || '';
      const name = canonicalProject?.name || project?.name || project?.projectCode || 'Untitled project';
      const description = canonicalProject?.description || project?.description || 'Project workspace';

      return {
        code,
        name,
        description,
        status: String(project?.status || 'active').trim() || 'active',
        label: name,
        value,
        team: arr(project?.team),
      };
    })
    .filter(Boolean);

const MediaHeadProjectList = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.projects({ limit: 100 }),
    queryFn: () => departmentApi.getMediaHeadProjects(token, { limit: 100 }),
    enabled: Boolean(token),
  });

  const projectOptions = useMemo(() => buildProjectOptions(arr(data?.data?.items)), [data]);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Projects" subtitle="Click a project to open its full media & marketing plan" icon="folder_copy" />

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-[1.75rem] bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        ) : (
          <MediaProjectList
            projects={projectOptions}
            onSelect={(project) => navigate(`/media/head/projects/${project.value}`)}
          />
        )}
      </div>
    </main>
  );
};

export default MediaHeadProjectList;
