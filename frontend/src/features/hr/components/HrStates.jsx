import React from 'react';
import Button from '../../../components/common/Button';

export const HrLoadingState = ({ message = 'Loading HR workspace...' }) => (
  <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="dot-spinner">
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
          <div className="dot-spinner__dot"></div>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">{message}</p>
      </div>
    </div>
  </main>
);

export const HrErrorState = ({ message = 'Failed to load HR data.', onRetry }) => (
  <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
    <div className="flex h-full items-center justify-center">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-red-600">error</span>
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">Error Loading HR Module</p>
            <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
          </div>
        </div>
        {onRetry ? (
          <Button variant="danger" size="sm" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  </main>
);
