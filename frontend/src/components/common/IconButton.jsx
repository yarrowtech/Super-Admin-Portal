import React from 'react';

// Focus ring color is intentionally left to .app-icon-button's own
// focus:ring-primary/40 so every tone shares one consistent focus treatment.
const toneStyles = {
  neutral: 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
  primary: 'text-neutral-500 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400',
  success: 'text-green-500 hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/30',
  warning: 'text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/30',
  danger: 'text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30',
};

const Spinner = () => (
  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="currentColor">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

/**
 * Icon-only action button used in tables/cards/toolbars across the admin portal.
 * `tooltip` is required — icon-only controls must be labeled for accessibility.
 */
const IconButton = ({
  icon,
  tooltip,
  tone = 'neutral',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip}
      aria-label={tooltip}
      className={`app-icon-button ${sizeClass} ${toneStyles[tone] || toneStyles.neutral} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {loading ? <Spinner /> : <span className="material-symbols-outlined text-lg">{icon}</span>}
    </button>
  );
};

export default IconButton;
