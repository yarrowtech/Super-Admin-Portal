import { useState } from 'react';
import { stageInfo, journeyRows, formatJourneyDate } from './journeyData';

export const SchoolStatus = ({ record, stages = [], compact = false }) => {
  const status = record.marketingStatus || {};
  const stage = stageInfo(status.currentStage, stages);
  return <div className={`map-school-status ${compact ? 'is-compact' : ''}`} data-tone={stage.tone}>
    <span className="map-status-dot" /><div><strong>{stage.label}</strong>
      {!compact && <>
        <p>{stage.nextStep ? `Next step: ${stage.nextStep}` : 'No outreach stage has been recorded for this record.'}</p>
        {status.scheduledAt && <p>Scheduled: <time dateTime={status.scheduledAt}>{formatJourneyDate(status.scheduledAt)}</time></p>}
      </>}
    </div>
  </div>;
};

export const MarketingJourney = ({ record, stages, canUpdate, onUpdate, onReload }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ stage: record.marketingStatus?.currentStage || '', scheduledAt: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const status = record.marketingStatus || {};
  const history = status.history || [];
  const openEditor = () => {
    setDraft({ stage: status.currentStage || '', scheduledAt: status.scheduledAt ? new Date(new Date(status.scheduledAt).getTime() + 330 * 60000).toISOString().slice(0, 10) : '', note: '' });
    setError(null); setSaved(false); setEditing(true);
  };
  return <div className="map-marketing-journey">
    <SchoolStatus record={record} stages={stages} />
    <h4 className="map-section-title">Marketing journey</h4>
    {!stages.length ? <p className="map-muted">Journey stages are unavailable.</p> : <ol className="map-journey-timeline" aria-label="Marketing journey">
      {journeyRows(status, stages).map(stage => <li key={stage.id} data-state={stage.state} data-tone={stage.tone} aria-current={stage.state === 'current' ? 'step' : undefined}>
        <span className="map-journey-indicator" aria-hidden="true">{stage.state === 'completed' ? '✓' : stage.state === 'current' ? '●' : '○'}</span>
        <div><strong>{stage.label}</strong><small>{stage.event ? <time dateTime={stage.event.timestamp}>{formatJourneyDate(stage.event.timestamp)}</time> : stage.state === 'current' ? 'Date not supplied' : 'Not recorded'}</small></div>
      </li>)}
    </ol>}
    <p className="map-journey-scope">Status applies to this marketing record. Other contacts at this school may have a different journey.</p>
    {canUpdate && !editing && <button type="button" className="map-primary" disabled={!stages.length} onClick={openEditor}>Update status</button>}
    {editing && <form className="map-status-editor" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError(null); setSaved(false);
      try {
        await onUpdate({ stage: draft.stage, expectedVersion: status.version || 0, scheduledAt: draft.scheduledAt ? `${draft.scheduledAt}T00:00:00+05:30` : null, note: draft.note });
        setEditing(false); setSaved(true);
      } catch (err) { setError(err.message || 'Unable to update marketing status.'); }
      finally { setSaving(false); }
    }}>
      <label>New marketing stage<select required aria-label="New marketing stage" value={draft.stage} disabled={saving} onChange={event => setDraft({ ...draft, stage: event.target.value })}><option value="">Select a stage</option>{stages.map(stage => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
      <label>Scheduled date (optional)<input type="date" value={draft.scheduledAt} disabled={saving} onChange={event => setDraft({ ...draft, scheduledAt: event.target.value })} /></label>
      <label>Note (optional)<textarea maxLength={1000} rows={2} value={draft.note} disabled={saving} onChange={event => setDraft({ ...draft, note: event.target.value })} /></label>
      <div className="map-popover-actions"><button type="button" disabled={saving} onClick={() => { setEditing(false); setError(null); }}>Cancel</button><button type="submit" className="map-primary" disabled={saving || !draft.stage}>{saving ? 'Saving…' : 'Save status'}</button></div>
    </form>}
    {error && <div role="alert" className="map-error">{error}<button type="button" disabled={saving} onClick={onReload}>Reload record</button></div>}
    {saved && <p role="status" className="map-status-saved">Marketing status saved.</p>}
    <details className="map-section map-status-history"><summary>Status history ({history.length})</summary>
      {history.length ? <ol>{[...history].reverse().map((event, index) => <li key={event._id || `${event.timestamp}-${index}`}>
        <strong>{stageInfo(event.stage, stages).label}</strong><time dateTime={event.timestamp}>{formatJourneyDate(event.timestamp)}</time>
        <span>Updated by {event.actorName || event.actorRole || 'Account not supplied'} · {event.source || 'Source not supplied'}</span>
        {event.scheduledAt && <span>Scheduled: {formatJourneyDate(event.scheduledAt)}</span>}{event.note && <p>{event.note}</p>}
      </li>)}</ol> : <p>No marketing activity has been recorded.</p>}
    </details>
  </div>;
};
