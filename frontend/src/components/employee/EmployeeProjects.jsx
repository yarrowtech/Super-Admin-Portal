import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const formatDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

const EmployeeProjects = () => {
  const { token } = useAuth();
  const [board, setBoard] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggingCard, setDraggingCard] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [moveError, setMoveError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '' });
  const [formError, setFormError] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  const currentMonthLabel = useMemo(
    () => new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    []
  );

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getProjects(token);
        const payload = res?.data || res;
        setBoard(payload?.columns || []);
        setSummary(payload?.summary || null);
      } catch (err) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const ensureAttendanceData = useCallback(async () => {
    if (!token) return;
    setAttendanceLoading(true);
    setAttendanceError('');
    try {
      const [attendanceRes, leaveRes] = await Promise.all([
        employeeApi.getAttendance(token),
        employeeApi.getLeaves(token),
      ]);
      setAttendanceData(attendanceRes?.data || attendanceRes);
      setLeaveData(leaveRes?.data || leaveRes);
    } catch (err) {
      setAttendanceError(err.message || 'Failed to load attendance insights');
    } finally {
      setAttendanceLoading(false);
    }
  }, [token]);

  const filters = useMemo(() => {
    const names = board.map((col) => col.title).filter(Boolean);
    const unique = names.filter((name, idx) => names.indexOf(name) === idx);
    return ['All', ...unique];
  }, [board]);

  const formatDateReadable = useCallback((value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const formatTime = useCallback((value) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const filteredColumns = useMemo(() => {
    if (activeFilter === 'All') return board;
    return board.filter((col) => col.title?.toLowerCase().includes(activeFilter.toLowerCase()));
  }, [board, activeFilter]);

  const attendanceList = useMemo(() => attendanceData?.attendance || [], [attendanceData]);
  const leaveList = useMemo(() => leaveData?.leaves || [], [leaveData]);

  const attendanceSummary = useMemo(() => {
    const base = { present: 0, late: 0, onLeave: 0, others: 0 };
    attendanceList.forEach((record) => {
      switch (record.status) {
        case 'late':
          base.late += 1;
          break;
        case 'present':
          base.present += 1;
          break;
        case 'on-leave':
          base.onLeave += 1;
          break;
        default:
          base.others += 1;
          break;
      }
    });
    return base;
  }, [attendanceList]);

  const approvedLeaves = useMemo(
    () => leaveList.filter((leave) => leave.status === 'approved'),
    [leaveList]
  );

  const attendanceByDate = useMemo(() => {
    const map = {};
    attendanceList.forEach((record) => {
      const key = formatDateKey(record.date);
      if (key) {
        map[key] = record;
      }
    });
    return map;
  }, [attendanceList]);

  const leaveDatesLookup = useMemo(() => {
    const lookup = {};
    leaveList.forEach((leave) => {
      if (!leave.startDate || !leave.endDate) return;
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      for (
        let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        cursor <= end;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        const key = formatDateKey(cursor);
        lookup[key] = leave;
      }
    });
    return lookup;
  }, [leaveList]);

  const lateRecords = useMemo(
    () => attendanceList.filter((record) => record.status === 'late'),
    [attendanceList]
  );

  const attendanceLogPreview = useMemo(
    () => attendanceList.slice(0, 8),
    [attendanceList]
  );

  const leavePreview = useMemo(() => leaveList.slice(0, 6), [leaveList]);

  const calendarCells = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingEmpty = firstDay.getDay();
    const totalCells = Math.ceil((leadingEmpty + daysInMonth) / 7) * 7;
    const cells = [];
    const todayKey = formatDateKey(new Date());

    for (let index = 0; index < totalCells; index += 1) {
      const day = index - leadingEmpty + 1;
      if (day < 1 || day > daysInMonth) {
        cells.push({ key: `empty-${index}`, empty: true });
        continue;
      }
      const dateObj = new Date(year, month, day);
      const key = formatDateKey(dateObj);
      const attendanceEntry = attendanceByDate[key];
      const leaveEntry = leaveDatesLookup[key];
      let badge = null;
      let tone = 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/50';
      if (leaveEntry) {
        badge = leaveEntry.leaveType || 'Leave';
        tone = 'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-100 dark:border-rose-800/60';
      } else if (attendanceEntry) {
        switch (attendanceEntry.status) {
          case 'late':
            badge = 'Late';
            tone =
              'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800/60';
            break;
          case 'present':
            badge = 'Present';
            tone =
              'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/60';
            break;
          case 'on-leave':
            badge = 'On Leave';
            tone =
              'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-100 dark:border-sky-800/60';
            break;
          default:
            badge = attendanceEntry.status;
            tone =
              'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:border-slate-700';
            break;
        }
      }
      const isToday = key === todayKey;
      cells.push({
        key,
        day,
        badge,
        tone: `${tone} ${isToday ? 'ring-2 ring-primary' : ''}`,
      });
    }
    return cells;
  }, [attendanceByDate, leaveDatesLookup]);

  useEffect(() => {
    if ((attendanceModalOpen || calendarModalOpen) && !attendanceData && !attendanceLoading) {
      ensureAttendanceData();
    }
  }, [attendanceModalOpen, calendarModalOpen, attendanceData, attendanceLoading, ensureAttendanceData]);

  const handleAddTodo = useCallback(() => {
    setFormError('');
    setMoveError('');
    setShowAddModal(true);
  }, []);

  const handleOpenAttendance = () => {
    setAttendanceModalOpen(true);
    setAttendanceError('');
  };

  const handleOpenCalendar = () => {
    setCalendarModalOpen(true);
    setAttendanceError('');
  };

  const getColumnStatus = useCallback((column, task) => {
    if (!column) return null;
    if (column.statuses?.includes(task.status)) {
      return task.status;
    }
    return column.statuses?.[0] || null;
  }, []);

  const handleDragStart = (event, columnKey, card) => {
    setMoveError('');
    setDraggingCard({
      columnId: columnKey,
      card,
    });
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingCard(null);
  };

  const handleDrop = useCallback(
    async (event, targetColumnKey) => {
      event.preventDefault();
      if (!draggingCard || !token) {
        setDraggingCard(null);
        return;
      }
      if (draggingCard.columnId === targetColumnKey) {
        setDraggingCard(null);
        return;
      }

      const sourceColumn = board.find(
        (column) => (column.id || column.title) === draggingCard.columnId
      );
      const targetColumn = board.find(
        (column) => (column.id || column.title) === targetColumnKey
      );
      if (!sourceColumn || !targetColumn) {
        setDraggingCard(null);
        return;
      }

      const card = (sourceColumn.cards || []).find((item) => item.id === draggingCard.card.id);
      if (!card) {
        setDraggingCard(null);
        return;
      }

      const nextStatus = getColumnStatus(targetColumn, card);
      if (!nextStatus) {
        setDraggingCard(null);
        return;
      }

      const previousBoard = board.map((column) => ({
        ...column,
        cards: (column.cards || []).map((item) => ({ ...item })),
      }));

      const nextBoard = board.map((column) => {
        const key = column.id || column.title;
        if (key === draggingCard.columnId) {
          return {
            ...column,
            cards: (column.cards || []).filter((item) => item.id !== card.id),
          };
        }
        if (key === targetColumnKey) {
          return {
            ...column,
            cards: [...(column.cards || []), { ...card, status: nextStatus }],
          };
        }
        return column;
      });

      setBoard(nextBoard);
      setMoveError('');
      setUpdatingTaskId(card.id);
      try {
        await employeeApi.updateTaskStatus(token, card.id, { status: nextStatus });
      } catch (err) {
        console.error('Failed to move task', err);
        setBoard(previousBoard);
        setMoveError(err.message || 'Failed to move task, please try again.');
      } finally {
        setUpdatingTaskId(null);
        setDraggingCard(null);
      }
    },
    [board, draggingCard, getColumnStatus, token]
  );

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const closeModal = () => {
    if (creatingTask) return;
    setShowAddModal(false);
    setFormError('');
    setNewTask({ title: '' });
  };

  const closeAttendanceModal = () => {
    setAttendanceModalOpen(false);
  };

  const closeCalendarModal = () => {
    setCalendarModalOpen(false);
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!newTask.title.trim()) {
      setFormError('Title is required');
      return;
    }
    setCreatingTask(true);
    setFormError('');
    try {
      const payload = {
        title: newTask.title.trim(),
      };
      const res = await employeeApi.createTask(token, payload);
      const created = res?.data || res;
      if (!created) {
        throw new Error('Failed to create task');
      }
      setBoard((prev) => {
        const cloned = prev.map((column) => ({
          ...column,
          cards: (column.cards || []).map((card) => ({ ...card })),
        }));
        let inserted = false;
        const next = cloned.map((column) => {
          const key = (column.id || column.title || '').toString().toLowerCase();
          if (!inserted && (key === 'todo' || key.includes('to do'))) {
            inserted = true;
            return {
              ...column,
              cards: [{ ...created }, ...(column.cards || [])],
            };
          }
          return column;
        });
        if (inserted) return next;
        return [
          {
            id: 'todo',
            title: 'To Do',
            cards: [{ ...created }],
            statuses: ['pending', 'cancelled'],
          },
          ...cloned,
        ];
      });
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              totalTasks: (prev.totalTasks || 0) + 1,
              overdue: created.isOverdue
                ? (prev.overdue || 0) + 1
                : prev.overdue || 0,
            }
          : prev
      );
      setShowAddModal(false);
      setNewTask({ title: '' });
    } catch (err) {
      setFormError(err.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!token || !taskId) return;
    setDeletingTaskId(taskId);
    setMoveError('');

    try {
      await employeeApi.deleteTask(token, taskId);
      setBoard((prev) => 
        prev.map((column) => ({
          ...column,
          cards: (column.cards || []).filter((card) => card.id !== taskId),
        }))
      );
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              totalTasks: Math.max((prev.totalTasks || 0) - 1, 0),
            }
          : prev
      );
    } catch (err) {
      setMoveError(err.message || 'Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading project board...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <>
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Projects</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Kanban Board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track sprint health and unblock your work.</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    activeFilter === filter
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOpenCalendar}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary/60"
              >
                <span className="material-symbols-outlined text-base">calendar_month</span>
                Calendar
              </button>
              <button
                type="button"
                onClick={handleOpenAttendance}
                className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-200 dark:hover:border-primary/60"
              >
                <span className="material-symbols-outlined text-base">badge</span>
                Attendance
              </button>
            </div>
          </div>
        </div>
        {moveError && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {moveError}
          </div>
        )}
        {summary && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Total tasks: <strong className="text-slate-900 dark:text-white">{summary.totalTasks}</strong></span>
            <span>Overdue: <strong className="text-rose-600">{summary.overdue}</strong></span>
            <span>Active projects: <strong className="text-slate-900 dark:text-white">{summary.activeProjects}</strong></span>
          </div>
        )}
      </header>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex min-w-[900px] gap-4">
          {filteredColumns.map((column) => {
            const columnKey = column.id || column.title;
            const isDropTarget =
              Boolean(draggingCard) && draggingCard.columnId !== columnKey;
            const isTodoColumn = columnKey?.toString()?.toLowerCase().includes('todo');
            const columnTone = (() => {
              const label = columnKey?.toString()?.toLowerCase() || '';
              if (label.includes('todo') || label.includes('backlog')) {
                return 'bg-[#f1f6ff] dark:bg-[#152338]';
              }
              if (label.includes('progress')) {
                return 'bg-[#eefdf3] dark:bg-[#0f2416]';
              }
              if (label.includes('review')) {
                return 'bg-[#fff4ec] dark:bg-[#26170c]';
              }
              if (label.includes('complete') || label.includes('done')) {
                return 'bg-[#eff6ff] dark:bg-[#111a2e]';
              }
              return 'bg-slate-50/70 dark:bg-[#1f2937]';
            })();
            return (
              <div
                key={columnKey}
                className={`flex w-full min-w-[220px] flex-col rounded-2xl ${columnTone} p-4 ${
                  isDropTarget ? 'ring-2 ring-primary/40' : ''
                }`}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDrop(event, columnKey)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{column.title}</p>
                    <p className="text-xs text-slate-500">{column.cards?.length || 0} cards</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4">
                  {(column.cards || []).map((task) => {
                    const isDragging = draggingCard?.card?.id === task.id;
                    const isUpdating = updatingTaskId === task.id;
                    const cardTone = (() => {
                      const label = columnKey?.toString()?.toLowerCase() || '';
                      if (label.includes('todo') || label.includes('backlog')) {
                        return 'bg-white/90 dark:bg-[#1e2b44]';
                      }
                      if (label.includes('progress')) {
                        return 'bg-white dark:bg-[#143222]';
                      }
                      if (label.includes('review')) {
                        return 'bg-white/95 dark:bg-[#371f11]';
                      }
                      if (label.includes('complete') || label.includes('done')) {
                        return 'bg-white/90 dark:bg-[#14203c]';
                      }
                      return 'bg-white/90 dark:bg-slate-900/70';
                    })();
                    const isDeleting = deletingTaskId === task.id;
                    return (
                      <article
                        key={task.id}
                        draggable={!isDeleting}
                        onDragStart={(event) => handleDragStart(event, columnKey, task)}
                        onDragEnd={handleDragEnd}
                        className={`rounded-2xl border border-white/70 ${cardTone} p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/70 dark:ring-white/5 ${
                          isDragging ? 'opacity-60' : ''
                        } ${isUpdating || isDeleting ? 'pointer-events-none opacity-60' : ''} relative group`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                            <p className="text-xs text-slate-500">{task.project || task.status}</p>
                          </div>
                          {isTodoColumn && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={isDeleting || isUpdating}
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                              title="Delete task"
                            >
                              <span className="material-symbols-outlined text-red-500 dark:text-red-400" style={{ fontSize: '14px' }}>
                                {isDeleting ? 'schedule' : 'delete'}
                              </span>
                            </button>
                          )}
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: '2-digit' 
                            }) : 'No due date'}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base text-slate-400">chat</span>
                            {task.comments || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-base text-slate-400">attach_file</span>
                            {task.attachments || 0}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {(column.cards || []).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      {isTodoColumn ? 'No tasks yet — start one.' : 'Nothing here yet.'}
                    </div>
                  )}
                  {isTodoColumn && (
                    <button
                      type="button"
                      onClick={handleAddTodo}
                      className="rounded-2xl border border-dashed border-primary/40 bg-white/70 px-3 py-2 text-center text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary/10 dark:border-primary/50 dark:bg-transparent dark:text-primary"
                    >
                      <span className="material-symbols-outlined text-base align-middle">add</span>{' '}
                      Add a To-Do
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {filteredColumns.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">No columns match this filter.</div>
          )}
        </div>
      </section>
    </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add To-Do</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                {formError}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleCreateTask}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Title
                </label>
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="What do you need to do?"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
                  disabled={creatingTask}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md transition disabled:opacity-60"
                >
                  {creatingTask ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Attendance insights</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">View your attendance, leaves, and late arrivals.</p>
              </div>
              <button
                type="button"
                onClick={closeAttendanceModal}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {attendanceLoading && !attendanceData ? (
              <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-300">
                Loading attendance...
              </div>
            ) : (
              <>
                {attendanceError && (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
                    {attendanceError}
                  </div>
                )}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Days present</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{attendanceSummary.present}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                    <p className="text-xs uppercase tracking-wide text-amber-600">Late arrivals</p>
                    <p className="text-2xl font-semibold text-amber-700 dark:text-amber-200">{attendanceSummary.late}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4 dark:border-sky-900 dark:bg-sky-950/40">
                    <p className="text-xs uppercase tracking-wide text-sky-600">On leave</p>
                    <p className="text-2xl font-semibold text-sky-700 dark:text-sky-200">{attendanceSummary.onLeave + approvedLeaves.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Other statuses</p>
                    <p className="text-2xl font-semibold text-slate-900 dark:text-white">{attendanceSummary.others}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Attendance log</h3>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700">
                    <table className="min-w-full text-left text-sm text-slate-600 dark:text-slate-300">
                      <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-2">Date</th>
                          <th className="px-4 py-2">Check-in</th>
                          <th className="px-4 py-2">Check-out</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceLogPreview.map((record) => (
                          <tr key={record._id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-4 py-2">{formatDateReadable(record.date)}</td>
                            <td className="px-4 py-2">{formatTime(record.checkIn)}</td>
                            <td className="px-4 py-2">{formatTime(record.checkOut)}</td>
                            <td className="px-4 py-2 capitalize">{record.status}</td>
                            <td className="px-4 py-2">{record.workHours ?? '--'}</td>
                          </tr>
                        ))}
                        {attendanceLogPreview.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                              No attendance records found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mb-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-100 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                    <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Leave overview</h3>
                    <div className="space-y-3">
                      {leavePreview.map((leave) => (
                        <div key={leave._id} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-slate-900 dark:text-white capitalize">{leave.leaveType}</p>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {leave.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatDateReadable(leave.startDate)} - {formatDateReadable(leave.endDate)} · {leave.totalDays} day(s)
                          </p>
                        </div>
                      ))}
                      {leavePreview.length === 0 && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">No leave requests recorded.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                    <h3 className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">Late arrivals</h3>
                    <div className="space-y-3">
                      {lateRecords.slice(0, 5).map((record) => (
                        <div key={record._id} className="rounded-xl border border-amber-100 bg-white/70 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-900/30">
                          <p className="font-semibold text-amber-800 dark:text-amber-100">{formatDateReadable(record.date)}</p>
                          <p className="text-xs text-amber-700 dark:text-amber-200">
                            Checked in at {formatTime(record.checkIn)} · {record.location}
                          </p>
                        </div>
                      ))}
                      {lateRecords.length === 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-200">No late arrivals logged.</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {calendarModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Monthly calendar</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{currentMonthLabel}</p>
              </div>
              <button
                type="button"
                onClick={closeCalendarModal}
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {attendanceLoading && !attendanceData ? (
              <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-300">
                Loading calendar...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-2">
                  {calendarCells.map((cell) =>
                    cell.empty ? (
                      <div key={cell.key} className="h-16 rounded-xl border border-dashed border-slate-200 dark:border-slate-800"></div>
                    ) : (
                      <div
                        key={cell.key}
                        className={`flex h-16 flex-col items-center justify-center rounded-xl text-xs font-semibold ${cell.tone}`}
                      >
                        <span>{cell.day}</span>
                        {cell.badge && <span className="text-[10px] capitalize">{cell.badge}</span>}
                      </div>
                    )
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full bg-emerald-400"></span> Present
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full bg-amber-400"></span> Late
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full bg-rose-400"></span> Leave
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block size-3 rounded-full bg-slate-300"></span> Other
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeProjects;
