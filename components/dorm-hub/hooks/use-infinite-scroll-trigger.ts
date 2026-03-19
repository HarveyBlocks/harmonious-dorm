
import { useCallback } from 'react';
import type { UIEvent } from 'react';

export function useInfiniteScrollTrigger(options: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  threshold?: number;
  beforeFetch?: () => void;
}) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, threshold = 80, beforeFetch } = options;

  return useCallback((event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight >= threshold) return;
    if (!hasNextPage || isFetchingNextPage) return;
    beforeFetch?.();
    void fetchNextPage();
  }, [beforeFetch, fetchNextPage, hasNextPage, isFetchingNextPage, threshold]);
}
