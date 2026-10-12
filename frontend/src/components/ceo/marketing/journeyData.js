export const stageInfo = (stage, stages = []) => stages.find(item => item.id === stage)
  || { id: stage, label: stage ? stage.replaceAll('_', ' ') : 'Not recorded', tone: 'muted', nextStep: null };

export const journeyRows = (marketingStatus, stages = []) => {
  const status = marketingStatus || {};
  const history = status.history || [];
  return stages.filter(stage => !stage.branch || stage.id === status.currentStage || history.some(event => event.stage === stage.id)).map(stage => {
    const events = history.filter(event => event.stage === stage.id);
    const latest = events.at(-1);
    // A later stage never proves that earlier outreach actually happened.
    return { ...stage, event: latest || null, state: stage.id === status.currentStage ? 'current' : latest ? 'completed' : 'pending' };
  });
};

export const formatJourneyDate = (value) => {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value));
};
