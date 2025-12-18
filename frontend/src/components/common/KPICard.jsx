import React from 'react';

const KPICard = ({
  title = 'KPI Title',
  value = 0,
  icon = 'analytics',
  colorScheme = 'blue',
  subtitle = '',
  trend,
  className = '',
}) => {
  const colorSchemes = {
    blue: {
      gradient: 'from-white to-blue-50/50 dark:from-neutral-900 dark:to-blue-950/30',
      border: 'border-blue-500/50',
      iconBg: 'from-blue-500 to-blue-600',
      iconRing: 'ring-blue-100 dark:ring-blue-900/50',
      decorative: 'bg-blue-100 dark:bg-blue-900/30',
      label: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      gradient: 'from-white to-green-50/50 dark:from-neutral-900 dark:to-green-950/30',
      border: 'border-green-500/50',
      iconBg: 'from-green-500 to-green-600',
      iconRing: 'ring-green-100 dark:ring-green-900/50',
      decorative: 'bg-green-100 dark:bg-green-900/30',
      label: 'text-green-600 dark:text-green-400',
    },
    orange: {
      gradient: 'from-white to-orange-50/50 dark:from-neutral-900 dark:to-orange-950/30',
      border: 'border-orange-500/50',
      iconBg: 'from-orange-500 to-orange-600',
      iconRing: 'ring-orange-100 dark:ring-orange-900/50',
      decorative: 'bg-orange-100 dark:bg-orange-900/30',
      label: 'text-orange-600 dark:text-orange-400',
    },
    purple: {
      gradient: 'from-white to-purple-50/50 dark:from-neutral-900 dark:to-purple-950/30',
      border: 'border-purple-500/50',
      iconBg: 'from-purple-500 to-purple-600',
      iconRing: 'ring-purple-100 dark:ring-purple-900/50',
      decorative: 'bg-purple-100 dark:bg-purple-900/30',
      label: 'text-purple-600 dark:text-purple-400',
    },
    red: {
      gradient: 'from-white to-red-50/50 dark:from-neutral-900 dark:to-red-950/30',
      border: 'border-red-500/50',
      iconBg: 'from-red-500 to-red-600',
      iconRing: 'ring-red-100 dark:ring-red-900/50',
      decorative: 'bg-red-100 dark:bg-red-900/30',
      label: 'text-red-600 dark:text-red-400',
    },
    indigo: {
      gradient: 'from-white to-indigo-50/50 dark:from-neutral-900 dark:to-indigo-950/30',
      border: 'border-indigo-500/50',
      iconBg: 'from-indigo-500 to-indigo-600',
      iconRing: 'ring-indigo-100 dark:ring-indigo-900/50',
      decorative: 'bg-indigo-100 dark:bg-indigo-900/30',
      label: 'text-indigo-600 dark:text-indigo-400',
    },
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.blue;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border-2 bg-gradient-to-br ${colors.gradient} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 hover:${colors.border} ${className}`}
    >
      {/* Decorative background circle */}
      <div
        className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${colors.decorative} opacity-50 transition-transform group-hover:scale-125`}
      ></div>

      {/* Content */}
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${colors.iconBg} text-white shadow-lg ring-4 ${colors.iconRing}`}
          >
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          {subtitle && <span className={`text-xs font-bold ${colors.label}`}>{subtitle}</span>}
        </div>

        <p className="mb-1 text-5xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">{title}</p>
          {trend && (
            <div
              className={`flex items-center gap-1 text-xs font-semibold ${
                trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KPICard;
