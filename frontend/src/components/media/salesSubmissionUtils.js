export const formatDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export const projectDisplay = (submission) =>
  submission?.projects?.length ? submission.projects.map((project) => project.name).filter(Boolean).join(', ') : submission?.project?.name;

export const isVendorSubmission = (submission) =>
  submission?.project?.code === 'ERMS' || submission?.projects?.some((project) => project.code === 'ERMS');
