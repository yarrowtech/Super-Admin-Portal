import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { hrApi } from '../../api/hr';
import Button from '../common/Button';

const HolidayCalendar = () => {
  const { token } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const holidayTypes = [
    { value: 'public', label: 'Public Holiday', icon: 'celebration', color: 'purple' },
    { value: 'optional', label: 'Optional Holiday', icon: 'event_available', color: 'blue' },
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchHolidays();
  }, [token]);

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
  }, [viewMode]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await hrApi.getHolidays(token);
      setHolidays(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

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
      const dateStr = selectedDate 
        ? selectedDate.toISOString().split('T')[0]
        : '';
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
    setFormData(prev => ({
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

      await fetchHolidays();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      await hrApi.deleteHoliday(id, token);
      await fetchHolidays();
    } catch (err) {
      setError(err.message || 'Failed to delete holiday');
    }
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const getHolidaysInMonth = () => {
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate.getMonth() === currentMonth && holidayDate.getFullYear() === currentYear;
    });
  };

  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    const endDate = new Date(lastDay);
    
    // Start from the beginning of the week containing the first day
    startDate.setDate(startDate.getDate() - startDate.getDay());
    // End at the end of the week containing the last day
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayHolidays = holidays.filter(holiday => {
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
      .filter(holiday => new Date(holiday.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  const getHolidayColor = (type) => {
    const typeObj = holidayTypes.find(t => t.value === type);
    return typeObj ? typeObj.color : 'gray';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-10 w-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-neutral-600 dark:text-neutral-400">Loading holidays...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Holiday Calendar</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Manage company holidays and events</p>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors ${
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
              className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-primary text-white'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              Calendar
            </button>
          </div>

          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">add</span>
            Add Holiday
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600">error</span>
            <p className="text-sm font-semibold text-red-900 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {viewMode === 'list' ? (
            /* List View */
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">All Holidays</h3>
              <div className="space-y-3">
                {holidays.length > 0 ? (
                  holidays
                    .sort((a, b) => new Date(a.date) - new Date(b.date))
                    .map((holiday) => {
                      const holidayDate = new Date(holiday.date);
                      const isUpcoming = holidayDate >= new Date();
                      const color = getHolidayColor(holiday.type);

                      return (
                        <div
                          key={holiday._id}
                          className={`flex items-center justify-between rounded-lg border p-4 transition-all hover:shadow-md ${
                            isUpcoming
                              ? 'border-primary/20 bg-primary/5'
                              : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                              <span className={`text-xs font-semibold text-${color}-700 dark:text-${color}-400`}>
                                {monthNames[holidayDate.getMonth()].slice(0, 3)}
                              </span>
                              <span className={`text-lg font-bold text-${color}-700 dark:text-${color}-400`}>
                                {holidayDate.getDate()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-neutral-800 dark:text-neutral-100">{holiday.name}</h4>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                                {holidayDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              <div className="mt-1 flex gap-2">
                                <span
                                  className={`rounded-full bg-${color}-100 px-2 py-0.5 text-xs font-semibold capitalize text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-400`}
                                >
                                  {holiday.type}
                                </span>
                                {holiday.isRecurring && (
                                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
                                    Recurring
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenModal(holiday)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(holiday._id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <span className="material-symbols-outlined text-6xl text-neutral-300 dark:text-neutral-600">
                      event_busy
                    </span>
                    <p className="mt-4 text-lg font-semibold text-neutral-600 dark:text-neutral-400">
                      No holidays added yet
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Calendar View */
            <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                  {monthNames[currentMonth]} {currentYear}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-primary dark:hover:bg-primary"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMonth(new Date().getMonth());
                      setCurrentYear(new Date().getFullYear());
                    }}
                    className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:border-primary dark:hover:bg-primary"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-600 transition-all hover:border-primary hover:bg-primary hover:text-white dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-primary dark:hover:bg-primary"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                {/* Header - Days of Week */}
                <div className="grid grid-cols-7 bg-neutral-100 dark:bg-neutral-800">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div
                      key={day}
                      className="border-r border-neutral-200 p-3 text-center text-sm font-semibold text-neutral-600 last:border-r-0 dark:border-neutral-700 dark:text-neutral-400"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7">
                  {getCalendarDays().map((day, index) => {
                    const hasHolidays = day.holidays.length > 0;
                    const primaryHoliday = day.holidays[0];
                    const holidayColor = primaryHoliday ? getHolidayColor(primaryHoliday.type) : 'gray';

                    return (
                      <div
                        key={index}
                        onClick={() => day.isCurrentMonth && handleOpenModal(null, day.date)}
                        className={`group relative min-h-24 cursor-pointer border-b border-r border-neutral-200 p-2 last:border-r-0 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800/50 ${
                          !day.isCurrentMonth ? 'bg-neutral-50/50 opacity-50 dark:bg-neutral-800/30' : ''
                        } ${day.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${
                          hasHolidays ? `bg-${holidayColor}-50/50 dark:bg-${holidayColor}-900/20` : ''
                        } ${day.isCurrentMonth ? 'hover:shadow-sm' : 'cursor-default'}`}
                        title={day.isCurrentMonth ? 'Click to add holiday' : ''}
                      >
                        {/* Date Number */}
                        <div
                          className={`mb-1 flex h-6 w-6 items-center justify-center text-sm font-semibold ${
                            day.isToday
                              ? 'rounded-full bg-blue-600 text-white dark:bg-blue-500'
                              : day.isCurrentMonth
                              ? 'text-neutral-800 dark:text-neutral-200'
                              : 'text-neutral-400 dark:text-neutral-600'
                          }`}
                        >
                          {day.date.getDate()}
                        </div>

                        {/* Holiday Indicators */}
                        {hasHolidays && (
                          <div className="space-y-1">
                            {day.holidays.slice(0, 2).map((holiday, hIndex) => {
                              const color = getHolidayColor(holiday.type);
                              return (
                                <div
                                  key={hIndex}
                                  className={`rounded-sm bg-${color}-100 px-1.5 py-0.5 text-xs font-medium text-${color}-700 dark:bg-${color}-900/40 dark:text-${color}-300`}
                                  title={holiday.name}
                                >
                                  <div className="truncate">
                                    {holiday.name.length > 12 ? holiday.name.slice(0, 12) + '...' : holiday.name}
                                  </div>
                                </div>
                              );
                            })}
                            {day.holidays.length > 2 && (
                              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                                +{day.holidays.length - 2} more
                              </div>
                            )}
                          </div>
                        )}

                        {/* Hover Tooltip */}
                        {hasHolidays && (
                          <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-48 -translate-x-1/2 rounded-lg bg-neutral-900 p-3 text-white shadow-lg group-hover:visible dark:bg-neutral-100 dark:text-neutral-900">
                            <div className="space-y-1">
                              {day.holidays.map((holiday, hIndex) => (
                                <div key={hIndex} className="text-sm">
                                  <div className="font-semibold">{holiday.name}</div>
                                  <div className="text-xs opacity-75 capitalize">{holiday.type} holiday</div>
                                </div>
                              ))}
                            </div>
                            <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-100"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend and Quick Actions */}
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-purple-100 dark:bg-purple-900/40"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Public Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-blue-100 dark:bg-blue-900/40"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Optional Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">Today</span>
                  </div>
                </div>
                <div className="flex gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span>Keyboard: ← → to navigate, Home to today</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Upcoming Holidays */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">Upcoming Holidays</h3>
              <button 
                onClick={() => setViewMode('list')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {getUpcomingHolidays().length > 0 ? (
                getUpcomingHolidays().map((holiday) => {
                  const holidayDate = new Date(holiday.date);
                  const daysUntil = Math.ceil((holidayDate - new Date()) / (1000 * 60 * 60 * 24));
                  const color = getHolidayColor(holiday.type);

                  return (
                    <div
                      key={holiday._id}
                      onClick={() => {
                        const month = holidayDate.getMonth();
                        const year = holidayDate.getFullYear();
                        setCurrentMonth(month);
                        setCurrentYear(year);
                        setViewMode('calendar');
                      }}
                      className="group cursor-pointer rounded-lg border border-neutral-200 bg-neutral-50 p-3 transition-all hover:border-primary/30 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-800/50 dark:hover:border-primary/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
                          <span className={`material-symbols-outlined text-lg text-${color}-600 dark:text-${color}-400`}>
                            celebration
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-neutral-800 group-hover:text-primary dark:text-neutral-100">{holiday.name}</h4>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {holidayDate.toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'short', 
                              day: 'numeric',
                              year: holidayDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                            })}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                            </span>
                            <span className={`inline-block rounded-full bg-${color}-100 px-2 py-0.5 text-xs font-medium capitalize text-${color}-700 dark:bg-${color}-900/40 dark:text-${color}-300`}>
                              {holiday.type}
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
                          arrow_forward
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-600">
                    event_available
                  </span>
                  <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">No upcoming holidays</p>
                  <button 
                    onClick={() => handleOpenModal()}
                    className="mt-2 text-xs font-semibold text-primary hover:underline"
                  >
                    Add one now
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="rounded-xl border border-neutral-200 bg-gradient-to-br from-primary/10 to-primary/5 p-5 dark:border-neutral-800 dark:from-primary/20 dark:to-primary/10">
            <h3 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">Statistics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Total Holidays</span>
                <span className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{holidays.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Public Holidays</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {holidays.filter(h => h.type === 'public').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600 dark:text-neutral-400">Optional Holidays</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {holidays.filter(h => h.type === 'optional').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="e.g., New Year's Day"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  >
                    {holidayTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Leave empty for all departments"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    name="isRecurring"
                    checked={formData.isRecurring}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-2 focus:ring-primary/20"
                  />
                  Recurring Annual Holiday
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingHoliday ? 'Update' : 'Add'} Holiday
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayCalendar;
