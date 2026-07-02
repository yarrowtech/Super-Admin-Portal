import React from 'react';
import { createLogger } from '../../utils/logger';

const errorBoundaryLogger = createLogger({ module: 'app-error-boundary' });

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected UI error' };
  }

  componentDidCatch(error, errorInfo) {
    // Keep a persistent trace for debugging blank-screen issues in production.
    errorBoundaryLogger.error({ err: error, errorInfo }, 'AppErrorBoundary caught an error');
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-4 dark:bg-neutral-950">
          <section className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white">UI crashed</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Reload App
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

