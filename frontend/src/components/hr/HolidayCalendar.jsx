import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../services/hr';
import { QK } from '../../utils/queryKeys';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import CardSkeleton from '../ui/CardSkeleton';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Tailwind can't see class names built with template-literal interpolation
// (e.g. `bg-${color}-100`) at build time, so those never made it into the
// compiled CSS — every holiday chip was silently colorless. Static classes
// per type fix that and give each type one dedicated look everywhere.
const HOLIDAY_TYPE_META = {
  public: {
    value: 'public',
    label: 'Public Holiday',
    icon: 'celebration',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    dateBg: 'bg-violet-50 dark:bg-violet-900/20',
    dateText: 'text-violet-700 dark:text-violet-300',
    dot: 'bg-violet-400',
    dayBg: 'bg-violet-50/60 dark:bg-violet-900/10',
  },
  optional: {
    value: 'optional',
    label: 'Optional Holiday',
    icon: 'event_available',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    dateBg: 'bg-blue-50 dark:bg-blue-900/20',
    dateText: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-400',
    dayBg: 'bg-blue-50/60 dark:bg-blue-900/10',
  },
};
const holidayTypeOptions = Object.values(HOLIDAY_TYPE_META).map((t) => ({ value: t.value, label: t.label }));
const getTypeMeta = (type) => HOLIDAY_TYPE_META[type] || HOLIDAY_TYPE_META.public;

const HolidayCalendar = () => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'public',
    department: '',
    description: '',
    isRecurring: false,
  });

  const holidaysQuery = useQuery({
    queryKey: QK.hr.holidays(),
    queryFn: () => hrApi.getHolidays(token),
    enabled: Boolean(token),
  });
  const holidays = holidaysQuery.data?.data || [];
  const loading = holidaysQuery.isLoading;
  const refetchHolidays = () => queryClient.invalidateQueries({ queryKey: ['hr', 'holidays'] });

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (viewMode === 'calendar') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateMonth('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateMonth('next');
        } else if (e.key === 'Home') {
          e.preventDefault();
          setCurrentMonth(new Date().getMonth());
          setCurrentYear(new Date().getFullYear());
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, currentMonth, currentYear]);

  const handleOpenModal = (holiday = null, selectedDate = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: holiday.date.split('T')[0],
        type: holiday.type,
        department: holiday.department || '',
        description: holiday.description || '',
        isRecurring: holiday.isRecurring || false,
      });
    } else {
      setEditingHoliday(null);
      const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
      setFormData({
        name: '',
        date: dateStr,
        type: 'public',
        department: '',
        description: '',
        isRecurring: false,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingHoliday(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await hrApi.updateHoliday(editingHoliday._id, formData, token);
      } else {
        await hrApi.createHoliday(formData, token);
      }

      refetchHolidays();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await hrApi.deleteHoliday(id, token);
      refetchHolidays();
    } catch (err) {
      setError(err.message || 'Failed to delete holiday');
    }
  };

  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);

    startDate.setDate(startDate.getDate() - startDate.getDay());
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayHolidays = holidays.filter((holiday) => {
        const holidayDate = new Date(holiday.date);
        return (
          holidayDate.getDate() === current.getDate() &&
          holidayDate.getMonth() === current.getMonth() &&
          holidayDate.getFullYear() === current.getFullYear()
        );
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === currentMonth,
        isToday:
          current.getDate() === new Date().getDate() &&
          current.getMonth() === new Date().getMonth() &&
          current.getFullYear() === new Date().getFullYear(),
        holidays: dayHolidays,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  const getUpcomingHolidays = () => {
    const today = new Date();
    return holidays
      .filter((holiday) => new Date(holiday.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Holiday Calendar</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Manage company holidays and events</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-l-md px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">list</span>
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1 rounded-r-md px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-primary text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Calendar
            </button>
          </div>

          <Button onClick={() => handleOpenModal()} icon={<span className="material-symbols-outlined text-base">add</span>}>
            Add Holiday
          </Button>
        </div>
      </div>

      {error && <ErrorState description={error} />}

      {loading ? (
        <CardSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {viewMode === 'list' ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <h3 className="mb-4 text-base font-bold text-neutral-900 dark:text-neutral-100">All Holidays</h3>
                {holidays.length > 0 ? (
                  <div className="space-y-2.5">
                    {holidays
                      .slice()
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .map((holiday) => {
                        const holidayDate = new Date(holiday.date);
                        const isUpcoming = holidayDate >= new Date();
                        const meta = getTypeMeta(holiday.type);

                        return (
                          <div
                            key={holiday._id}
                            className={`flex items-center justify-between rounded-lg border p-3.5 transition-shadow hover:shadow-sm ${
                              isUpcoming
                                ? 'border-(--portal-accent)/25 bg-(--portal-accent-soft)'
                                : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <div className={`flex h-12 w-12 flex-col items-center justify-center rounded-lg ${meta.dateBg}`}>
                                <span className={`text-[10px] font-semibold ${meta.dateText}`}>
                                  {monthNames[holidayDate.getMonth()].slice(0, 3)}
                                </span>
                                <span className={`text-base font-bold ${meta.dateText}`}>{holidayDate.getDate()}</span>
                              </div>
                              <div>
                                <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{holiday.name}</h4>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {holidayDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <div className="mt-1 flex gap-1.5">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${meta.chip}`}>{holiday.type}</span>
                                  {holiday.isRecurring && (
                                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                                      Recurring
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-8 w-8 px-0" onClick={() => handleOpenModal(holiday)} aria-label={`Edit ${holiday.name}`}>
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 px-0 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                onClick={() => handleDelete(holiday._id)}
                                aria-label={`Delete ${holiday.name}`}
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <EmptyState icon="event_busy" title="No holidays added yet" compact />
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {monthNames[currentMonth]} {currentYear}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="h-9 w-9 px-0" onClick={() => navigateMonth('prev')} aria-label="Previous month">
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCurrentMonth(new Date().getMonth());
                        setCurrentYear(new Date().getFullYear());
                      }}
                    >
                      Today
                    </Button>
                    <Button variant="secondary" size="sm" className="h-9 w-9 px-0" onClick={() => navigateMonth('next')} aria-label="Next month">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800">
                  <div className="grid grid-cols-7 bg-neutral-50 dark:bg-neutral-900/60">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="border-r border-neutral-200 p-2.5 text-center text-xs font-semibold text-neutral-500 last:border-r-0 dark:border-neutral-800 dark:text-neutral-400">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7">
                    {getCalendarDays().map((day, index) => {
                      const hasHolidays = day.holidays.length > 0;
                      const primaryMeta = hasHolidays ? getTypeMeta(day.holidays[0].type) : null;

                      return (
                        <div
                          key={index}
                          onClick={() => day.isCurrentMonth && handleOpenModal(null, day.date)}
                          className={`group relative min-h-24 border-b border-r border-neutral-100 p-2 last:border-r-0 transition-colors dark:border-neutral-800 ${
                            day.isCurrentMonth ? 'cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50' : 'cursor-default bg-neutral-50/50 opacity-50 dark:bg-neutral-800/20'
                          } ${day.isToday ? 'bg-(--portal-accent-soft)' : ''} ${hasHolidays ? primaryMeta.dayBg : ''}`}
                          title={day.isCurrentMonth ? 'Click to add holiday' : ''}
                        >
                          <div
                            className={`mb-1 flex h-6 w-6 items-center justify-center text-sm font-semibold ${
                              day.isToday
                                ? 'rounded-full text-white'
                                : day.isCurrentMonth
                                ? 'text-neutral-800 dark:text-neutral-200'
                                : 'text-neutral-400 dark:text-neutral-600'
                            }`}
                            style={day.isToday ? { background: 'var(--portal-accent)' } : undefined}
                          >
                            {day.date.getDate()}
                          </div>

                          {hasHolidays && (
                            <div className="space-y-1">
                              {day.holidays.slice(0, 2).map((holiday, hIndex) => {
                                const meta = getTypeMeta(holiday.type);
                                return (
                                  <div key={hIndex} className={`truncate rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${meta.chip}`} title={holiday.name}>
                                    {holiday.name}
                                  </div>
                                );
                              })}
                              {day.holidays.length > 2 && (
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">+{day.holidays.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-4">
                    {Object.values(HOLIDAY_TYPE_META).map((meta) => (
                      <div key={meta.value} className="flex items-center gap-2">
                        <div className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">{meta.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--portal-accent)' }} />
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">Today</span>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">← → to navigate, Home for today</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Upcoming Holidays</h3>
                <button onClick={() => setViewMode('list')} className="text-xs font-semibold text-(--portal-accent) hover:underline">
                  View all
                </button>
              </div>
              {getUpcomingHolidays().length > 0 ? (
                <div className="space-y-2">
                  {getUpcomingHolidays().map((holiday) => {
                    const holidayDate = new Date(holiday.date);
                    const daysUntil = Math.ceil((holidayDate - new Date()) / (1000 * 60 * 60 * 24));
                    const meta = getTypeMeta(holiday.type);

                    return (
                      <button
                        type="button"
                        key={holiday._id}
                        onClick={() => {
                          setCurrentMonth(holidayDate.getMonth());
                          setCurrentYear(holidayDate.getFullYear());
                          setViewMode('calendar');
                        }}
                        className="flex w-full items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left transition-colors hover:border-(--portal-accent)/40 dark:border-neutral-800 dark:bg-neutral-800/50"
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.dateBg}`}>
                          <span className={`material-symbols-outlined text-[16px] ${meta.dateText}`}>{meta.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{holiday.name}</h4>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {holidayDate.toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: holidayDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                            })}
                          </p>
                          <span className="mt-1 inline-block rounded-full bg-(--portal-accent-soft) px-2 py-0.5 text-[11px] font-semibold text-(--portal-accent)">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon="event_available"
                  title="No upcoming holidays"
                  actionLabel="Add one now"
                  onAction={() => handleOpenModal()}
                />
              )}
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-3 text-base font-bold text-neutral-900 dark:text-neutral-100">Statistics</h3>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">Total Holidays</span>
                  <span className="font-bold text-neutral-900 dark:text-neutral-100">{holidays.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">Public Holidays</span>
                  <span className="font-bold text-violet-600 dark:text-violet-400">{holidays.filter((h) => h.type === 'public').length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400">Optional Holidays</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{holidays.filter((h) => h.type === 'optional').length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={handleCloseModal}
        title={editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" form="holiday-form">
              {editingHoliday ? 'Update' : 'Add'} Holiday
            </Button>
          </div>
        }
      >
        <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Holiday Name *" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g., New Year's Day" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date *" type="date" name="date" value={formData.date} onChange={handleChange} required />
            <Select label="Type *" name="type" value={formData.type} onChange={handleChange} required options={holidayTypeOptions} />
          </div>
          <Input label="Department (Optional)" name="department" value={formData.department} onChange={handleChange} placeholder="Leave empty for all departments" />
          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Description</span>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="Additional notes…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            <input type="checkbox" name="isRecurring" checked={formData.isRecurring} onChange={handleChange} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20" />
            Recurring Annual Holiday
          </label>
        </form>
      </Modal>
    </div>
  );
};

export default HolidayCalendar;
