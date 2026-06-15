import React from 'react';

const StatsCard = ({
  label = 'Stats',
  value = 0,
  icon = 'analytics',
  colorScheme = 'blue',
  size = 'md',
  className = '',
}) => {
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600 dark:text-green-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-600 dark:text-orange-400',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600 dark:text-red-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-600 dark:text-purple-400',
    },
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      icon: 'text-indigo-600 dark:text-indigo-400',
    },
    neutral: {
      bg: 'bg-white dark:bg-neutral-800',
      text: 'text-neutral-700 dark:text-neutral-300',
      icon: 'text-neutral-600 dark:text-neutral-400',
    },
  };

  const sizes = {
    sm: {
      padding: 'px-2.5 py-1',
      iconSize: 'text-base',
      valueSize: 'text-xs',
      labelSize: 'text-xs',
      gap: 'gap-1.5',
    },
    md: {
      padding: 'px-3 py-1.5',
      iconSize: 'text-lg',
      valueSize: 'text-sm',
      labelSize: 'text-sm',
      gap: 'gap-2',
    },
    lg: {
      padding: 'px-4 py-2',
      iconSize: 'text-xl',
      valueSize: 'text-base',
      labelSize: 'text-base',
      gap: 'gap-2.5',
    },
  };

  const colors = colorSchemes[colorScheme] || colorSchemes.neutral;
  const sizeStyles = sizes[size] || sizes.md;

  return (
    <div
      className={`inline-flex items-center ${sizeStyles.gap} rounded-lg ${colors.bg} ${sizeStyles.padding} shadow-sm ${className}`}
    >
      <span className={`material-symbols-outlined ${sizeStyles.iconSize} ${colors.icon}`}>{icon}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-bold ${sizeStyles.valueSize} ${colors.text}`}>{value}</span>
        <span className={`font-semibold ${sizeStyles.labelSize} ${colors.text}`}>{label}</span>
      </div>
    </div>
  );
};

export default StatsCard;
