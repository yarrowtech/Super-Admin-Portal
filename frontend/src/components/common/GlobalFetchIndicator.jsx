import { useIsFetching } from '@tanstack/react-query';

/**
 * A slim top-of-page progress bar that appears whenever TanStack Query has
 * any request in flight. It covers both initial loads and background refetches
 * so users always know when data is being refreshed.
 *
 * The bar uses an indeterminate sweep animation (not a real progress value)
 * because we don't know how many requests will complete or how long they'll
 * take. It disappears as soon as `isFetching` drops to 0.
 */
const GlobalFetchIndicator = () => {
  const isFetching = useIsFetching();
  if (!isFetching) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 right-0 top-0 z-[10000] h-[2px] overflow-hidden"
    >
      <div
        className="fetch-progress-bar h-full"
        style={{
          background: 'var(--portal-accent, #4f46e5)',
          animation: 'fetch-bar-sweep 1.4s ease-in-out infinite',
          opacity: 0.85,
        }}
      />
    </div>
  );
};

export default GlobalFetchIndicator;
