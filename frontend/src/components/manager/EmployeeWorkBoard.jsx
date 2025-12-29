import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';
import { shouldDeliverToManager } from '../../utils/notificationRouting';

const getWorkItemKey = (item) => item?.taskId || item?.id || item?._id;

const readLocalCompletedWork = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage?.getItem('completedEmployeeWork');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to read cached employee work updates:', error);
    return [];
  }
};

const resolveTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortWorkItems = (items = []) =>
  [...items].sort(
    (a, b) =>
      resolveTimestamp(b.completedAt || b.updatedAt) -
      resolveTimestamp(a.completedAt || a.updatedAt)
  );

const buildStatsFromItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      totalCompleted: 0,
      pendingReview: 0,
      totalHours: 0,
      activeEmployees: 0,
      avgCompletionTime: 0,
      productivityTrend: '0%',
    };
  }

  const totalCompleted = items.filter(
    (item) => (item.status || '').toLowerCase() === 'completed'
  ).length;

  const pendingReview = items.filter((item) => {
    const status = (item.status || '').toLowerCase();
    if (!status) return false;
    if (status === 'pending_review' || status === 'pending review') return true;
    return status.includes('review');
  }).length;

  const totalHours = items.reduce(
    (sum, item) => sum + (Number(item.timeSpent) || 0),
    0
  );

  const employeeIds = new Set(
    items.map((item) => item.employee?.id).filter(Boolean)
  );

  const completionDurations = items.reduce((list, item) => {
    const completed = resolveTimestamp(item.completedAt || item.updatedAt);
    const created = resolveTimestamp(item.createdAt);
    if (completed && created) {
      list.push(Math.max(0, completed - created));
    }
    return list;
  }, []);

  const avgCompletionTime =
    completionDurations.length > 0
      ? completionDurations.reduce((sum, duration) => sum + duration, 0) /
        completionDurations.length /
        (1000 * 60 * 60 * 24)
      : 0;

  return {
    totalCompleted,
    pendingReview,
    totalHours,
    activeEmployees: employeeIds.size,
    avgCompletionTime,
    productivityTrend:
      items.length > 0 ? `+${Math.round(items.length * 0.1)}%` : '0%',
  };
};

const mergeStatsWithDerived = (existingStats, items) => {
  const derived = buildStatsFromItems(items);
  return existingStats ? { ...existingStats, ...derived } : derived;
};

const EmployeeWorkBoard = () => {
  const { token, user } = useAuth();
  const [workItems, setWorkItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWork, setSelectedWork] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const mergeWithLocalWork = useCallback(
    (items = []) => {
      const baseline = Array.isArray(items) ? items : [];
      const localItems = readLocalCompletedWork().filter((item) =>
        shouldDeliverToManager(user, item)
      );
      const collection = new Map();

      const addItem = (workItem) => {
        if (!workItem) return;
        const key =
          getWorkItemKey(workItem) ||
          `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        collection.set(key, {
          ...workItem,
          id: workItem.id || key,
        });
      };

      baseline.forEach(addItem);
      localItems.forEach(addItem);

      return sortWorkItems(Array.from(collection.values()));
    },
    [user]
  );

  const fetchEmployeeWork = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (selectedEmployee !== 'all') params.append('employeeId', selectedEmployee);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      
      const paramsString = params.toString();
      
      // Fetch real data from database
      const [workResponse, statsResponse, teamResponse] = await Promise.all([
        managerApi.getCompletedTasks(token, paramsString ? `?${paramsString}` : ''),
        managerApi.getEmployeeWorkStats(token),
        managerApi.getTeam(token)
      ]);
      
      const realWorkItems = workResponse?.data?.tasks || workResponse?.data || [];
      const realStats = statsResponse?.data || statsResponse || null;
      const teamData = teamResponse?.data?.members || teamResponse?.data || [];
      
      // Process and set work items
      const processedWorkItems = realWorkItems.map(task => ({
        id: task.id || task._id,
        title: task.title,
        description: task.description || `Task: ${task.title}`,
        employee: {
          id: task.assignedTo?.id || task.assignedTo?._id || task.employeeId,
          name: task.assignedTo?.name || `${task.assignedTo?.firstName || ''} ${task.assignedTo?.lastName || ''}`.trim() || 'Employee',
          avatar: task.assignedTo?.name?.split(' ').map(n => n[0]).join('') || 'E',
          email: task.assignedTo?.email
        },
        project: task.project?.name || task.projectName || 'General Project',
        workType: task.category || task.type || 'Task',
        status: task.status === 'completed' ? 'completed' : 'pending_review',
        priority: task.priority || 'medium',
        completedAt: task.completedAt || task.updatedAt || new Date().toISOString(),
        timeSpent: task.timeSpent || 0,
        approvedBy: task.approvedBy || (task.status === 'completed' ? 'Manager' : null),
        tags: [task.category || 'task', task.project?.name || 'general'].filter(Boolean),
        attachments: task.attachments?.length || 0,
        comments: task.comments?.length || 0,
        dueDate: task.dueDate,
        createdAt: task.createdAt
      }));

      const mergedWorkItems = mergeWithLocalWork(processedWorkItems);
      setWorkItems(mergedWorkItems);
      
      // Set statistics from API or calculate from work items
      const derivedStats = buildStatsFromItems(mergedWorkItems);
      setStats(realStats ? { ...realStats, ...derivedStats } : derivedStats);
      
    } catch (error) {
      console.error('Failed to fetch employee work:', error);
      setError('Failed to load employee work data. Please try again.');
      const fallbackItems = mergeWithLocalWork([]);
      setWorkItems(fallbackItems);
      setStats(buildStatsFromItems(fallbackItems));
    } finally {
      setLoading(false);
    }
  }, [token, selectedEmployee, selectedStatus, dateRange, searchQuery, mergeWithLocalWork]);

  useEffect(() => {
    fetchEmployeeWork();
  }, [fetchEmployeeWork]);

  useEffect(() => {
    const handleLocalWorkUpdate = (event) => {
      if (event?.detail && !shouldDeliverToManager(user, event.detail)) {
        return;
      }
      setWorkItems((prevItems) => {
        const nextItems = mergeWithLocalWork(prevItems);
        setStats((prevStats) => mergeStatsWithDerived(prevStats, nextItems));
        return nextItems;
      });
    };

    const handleStorageChange = (event) => {
      if (event?.key && event.key !== 'completedEmployeeWork') return;
      handleLocalWorkUpdate();
    };

    window.addEventListener('employeeWorkCompleted', handleLocalWorkUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('employeeWorkCompleted', handleLocalWorkUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [mergeWithLocalWork, user]);

  const filteredWorkItems = useMemo(() => {
    return workItems.filter(item => {
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.project.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [workItems, searchQuery]);

  const uniqueEmployees = useMemo(() => {
    const employees = [...new Set(workItems.map(item => item.employee.id))];
    return employees.map(id => workItems.find(item => item.employee.id === id)?.employee).filter(Boolean);
  }, [workItems]);

  const handleWorkItemClick = (workItem) => {
    setSelectedWork(workItem);
    setIsDetailModalOpen(true);
  };

  const handleApproveWork = async (workId) => {
    try {
      // Update via API
      await managerApi.approveWork(token, workId);
      
      // Update local state
      const updatedItems = workItems.map(item => 
        item.id === workId ? { 
          ...item, 
          status: 'completed', 
          approvedBy: user?.name || 'Manager',
          approvedAt: new Date().toISOString()
        } : item
      );
      
      setWorkItems(updatedItems);
      
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        totalCompleted: (prev.totalCompleted || 0) + 1,
        pendingReview: Math.max(0, (prev.pendingReview || 0) - 1)
      } : null);
      
      console.log('Work approved successfully:', workId);
    } catch (error) {
      console.error('Failed to approve work:', error);
      setError('Failed to approve work. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
          <span className="text-gray-600 dark:text-gray-300">Loading employee work...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-2xl text-primary">work_history</span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              Employee Work Board
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Track and review completed work by your team members
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500">error</span>
              <div>
                <p className="text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-xl font-bold text-green-600">{stats.totalCompleted}</p>
                </div>
                <span className="material-symbols-outlined text-green-500">check_circle</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
                  <p className="text-xl font-bold text-yellow-600">{stats.pendingReview}</p>
                </div>
                <span className="material-symbols-outlined text-yellow-500">pending</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Hours</p>
                  <p className="text-xl font-bold text-blue-600">{stats.totalHours}</p>
                </div>
                <span className="material-symbols-outlined text-blue-500">schedule</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Team</p>
                  <p className="text-xl font-bold text-purple-600">{stats.activeEmployees}</p>
                </div>
                <span className="material-symbols-outlined text-purple-500">group</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Time</p>
                  <p className="text-xl font-bold text-indigo-600">{stats.avgCompletionTime}d</p>
                </div>
                <span className="material-symbols-outlined text-indigo-500">avg_time</span>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Productivity</p>
                  <p className="text-xl font-bold text-emerald-600">{stats.productivityTrend}</p>
                </div>
                <span className="material-symbols-outlined text-emerald-500">trending_up</span>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee:</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Employees</option>
                {uniqueEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending_review">Pending Review</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Period:</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search work items..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Work Items Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorkItems.map((workItem) => (
            <div
              key={workItem.id}
              onClick={() => handleWorkItemClick(workItem)}
              className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-primary/30"
            >
              {/* Work Item Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-sm font-bold text-white">
                    {workItem.employee.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{workItem.employee.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{workItem.project}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(workItem.status)}`}>
                    {workItem.status === 'pending_review' ? 'Pending Review' : 'Completed'}
                  </span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getPriorityColor(workItem.priority)}`}>
                    {workItem.priority}
                  </span>
                </div>
              </div>

              {/* Work Item Content */}
              <div className="mb-3">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">{workItem.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {workItem.description}
                </p>
              </div>

              {/* Work Item Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {workItem.timeSpent}h
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    {workItem.attachments}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">comment</span>
                    {workItem.comments}
                  </span>
                </div>
                <span>
                  {new Date(workItem.completedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Approve Button for Pending Items */}
              {workItem.status === 'pending_review' && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApproveWork(workItem.id);
                    }}
                    className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
                  >
                    Approve Work
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredWorkItems.length === 0 && !loading && (
          <div className="py-12 text-center">
            <span className="material-symbols-outlined mx-auto mb-4 text-6xl text-gray-300">work_off</span>
            <p className="text-lg text-gray-600 dark:text-gray-400">No completed work found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {error ? 'Unable to load work data from database.' : 'No completed tasks available at the moment.'}
            </p>
            {error && (
              <button 
                onClick={fetchEmployeeWork}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Retry Loading
              </button>
            )}
          </div>
        )}

        {/* Work Detail Modal */}
        {isDetailModalOpen && selectedWork && (
          <WorkDetailModal
            work={selectedWork}
            onClose={() => {
              setIsDetailModalOpen(false);
              setSelectedWork(null);
            }}
            onApprove={() => handleApproveWork(selectedWork.id)}
          />
        )}
      </div>
    </main>
  );
};

// Work Detail Modal Component
const WorkDetailModal = ({ work, onClose, onApprove }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Work Details</h2>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee & Project Info */}
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-lg font-bold text-white">
              {work.employee.avatar}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{work.employee.name}</h3>
              <p className="text-gray-600 dark:text-gray-400">{work.project} • {work.workType}</p>
            </div>
          </div>

          {/* Work Title & Description */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{work.title}</h4>
            <p className="text-gray-600 dark:text-gray-400">{work.description}</p>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
              <p className="mt-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${work.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {work.status === 'pending_review' ? 'Pending Review' : 'Completed'}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</label>
              <p className="mt-1">
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  work.priority === 'high' ? 'bg-red-100 text-red-800' :
                  work.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {work.priority}
                </span>
              </p>
            </div>
          </div>

          {/* Work Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Spent</label>
              <p className="text-gray-900 dark:text-white">{work.timeSpent} hours</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed Date</label>
              <p className="text-gray-900 dark:text-white">
                {new Date(work.completedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Tags */}
          {work.tags && work.tags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {work.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-6 dark:border-gray-800">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Close
            </button>
            {work.status === 'pending_review' && (
              <button
                onClick={() => {
                  onApprove();
                  onClose();
                }}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Approve Work
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeWorkBoard;
