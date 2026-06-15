import { useEffect, useRef } from 'react';

export const useInfiniteScroll = ({ enabled, hasMore, onLoadMore, rootMargin = '320px' }) => {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!enabled || !hasMore || !sentinelRef.current) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [enabled, hasMore, onLoadMore, rootMargin]);

  return sentinelRef;
};
