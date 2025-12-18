import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700"
    >
      {theme === 'light' ? (
        <span className="material-symbols-outlined">dark_mode</span>
      ) : (
        <span className="material-symbols-outlined">light_mode</span>
      )}
    </button>
  );
};

export default ThemeToggleButton;
