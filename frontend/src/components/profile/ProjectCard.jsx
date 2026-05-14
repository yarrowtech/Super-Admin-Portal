import React from 'react';

const ProjectCard = ({ project }) => (
  <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
    <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{project?.title || 'Untitled Project'}</p>
    {project?.description ? <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{project.description}</p> : null}
    {project?.link ? (
      <a href={project.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-primary underline">
        Open Link
      </a>
    ) : null}
  </div>
);

export default React.memo(ProjectCard);
