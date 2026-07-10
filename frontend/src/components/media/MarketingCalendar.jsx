import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';

const card = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900';
const input = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--portal-accent)] dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500';

const TYPE_TONE = {
  campaign: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300',
  launch: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-500/10 dark:text-violet-300',
  task: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300',
  'content-publish': 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300',
  approval: 'border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/60 dark:bg-cyan-500/10 dark:text-cyan-300',
  custom: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300',
};

const emptyForm = { title: '', date: '', type: 'custom', description: '' };

const MarketingCalendar = ({ projectId }) => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingEventId, setEditingEventId] = useState(null);

  const load = () => {
    if (!token) return;
    departmentApi.getMediaCalendar(token, projectId ? { projectId } : {})
      .then((res) => setEvents(res?.data?.items || []))
      .catch((err) => setError(err.message || 'Failed to load calendar.'));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, projectId]);

  const openCreateForm = () => {
    setEditingEventId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (event) => {
    setEditingEventId(event.refId);
    setForm({
      title: event.title || '',
      date: event.date ? new Date(event.date).toISOString().slice(0, 10) : '',
      type: event.type || 'custom',
      description: event.description || '',
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingEventId(null);
    setForm(emptyForm);
  };

  const submitEvent = async (e) => {
    e.preventDefault();
    if (!projectId || !form.title.trim() || !form.date) return;
    setBusy(true);
    try {
      const payload = { title: form.title.trim(), date: form.date, type: form.type.trim() || 'custom', description: form.description.trim() };
      if (editingEventId) {
        await departmentApi.updateMediaCalendarEvent(token, editingEventId, payload, { projectId });
      } else {
        await departmentApi.createMediaCalendarEvent(token, payload, { projectId });
      }
      closeForm();
      load();
    } catch (err) {
      setError(err.message || 'Failed to save calendar event.');
    } finally {
      setBusy(false);
    }
  };

  const deleteEvent = async (event) => {
    if (!projectId || !window.confirm('Delete this calendar event?')) return;
    setBusy(true);
    try {
      await departmentApi.deleteMediaCalendarEvent(token, event.refId, { projectId });
      load();
    } catch (err) {
      setError(err.message || 'Failed to delete calendar event.');
    } finally {
      setBusy(false);
    }
  };

  const grouped = events.reduce((acc, event) => {
    const dateKey = new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(event);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined rounded-xl border border-teal-200 bg-teal-50 p-2 text-[22px] text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">calendar_month</span>
            <div>
              <h2 className="text-2xl font-black text-slate-950 dark:text-neutral-100">Marketing Calendar</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Campaign dates, publish dates, approvals, and custom events.</p>
            </div>
          </div>
        <button
          type="button"
          onClick={() => (formOpen ? closeForm() : openCreateForm())}
          disabled={!projectId}
          className="shrink-0 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {formOpen ? 'Cancel' : 'New event'}
        </button>
        </div>
      </section>

      {formOpen ? (
        <form onSubmit={submitEvent} className={`${card} grid grid-cols-1 gap-3 md:grid-cols-2`}>
          <p className="md:col-span-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{editingEventId ? 'Edit event' : 'New event'}</p>
          <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title" className={input} />
          <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={input} />
          <input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Type (e.g. custom, reminder)" className={input} />
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2} className={`${input} md:col-span-2`} />
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" disabled={busy} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50">
              {editingEventId ? 'Save changes' : 'Add event'}
            </button>
            <button type="button" onClick={closeForm} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {Object.keys(grouped).length ? (
        <div className="space-y-3">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date} className={card}>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{date}</p>
              <div className="space-y-1.5">
                {items.map((event, index) => (
                  <div key={`${event.refId}-${index}`} className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm ${TYPE_TONE[event.type] || 'border-slate-200 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                    <span className="font-semibold uppercase text-[10px] tracking-wide">{event.type}</span>
                    <span className="flex-1 truncate">{event.title}</span>
                    {event.editable ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => openEditForm(event)} title="Edit" className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100 disabled:opacity-30">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button type="button" disabled={busy} onClick={() => deleteEvent(event)} title="Delete" className="shrink-0 rounded-full p-1 text-current opacity-70 hover:opacity-100 disabled:opacity-30">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={card}>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-neutral-800 dark:bg-neutral-950/50 dark:text-neutral-400">
            No calendar events
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingCalendar;
