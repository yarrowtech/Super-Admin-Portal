import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-primary hover:text-primary hover:shadow-md transition-all"
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <span className="material-symbols-outlined text-lg">dark_mode</span>
      ) : (
        <span className="material-symbols-outlined text-lg">light_mode</span>
      )}
    </button>
  );
};

export default ThemeToggleButton;
