import { useInfiniteScrollTrigger } from '@/components/dorm-hub/hooks/use-infinite-scroll-trigger';
import type { Dispatch, SetStateAction } from 'react';

export function useTabScrollHandlers(options: {
  notificationsQuery: { hasNextPage?: boolean; isFetchingNextPage: boolean; fetchNextPage: () => Promise<unknown> };
  billsQuery: { hasNextPage?: boolean; isFetchingNextPage: boolean; fetchNextPage: () => Promise<unknown> };
  dutyAllQuery: { hasNextPage?: boolean; isFetchingNextPage: boolean; fetchNextPage: () => Promise<unknown> };
  showAllDoneDuty: boolean;
  setShowAllDoneDuty: Dispatch<SetStateAction<boolean>>;
}) {
  const { notificationsQuery, billsQuery, dutyAllQuery, showAllDoneDuty, setShowAllDoneDuty } = options;

  const onNoticeListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(notificationsQuery.hasNextPage),
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    fetchNextPage: () => notificationsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onBillUnpaidListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(billsQuery.hasNextPage),
    isFetchingNextPage: billsQuery.isFetchingNextPage,
    fetchNextPage: () => billsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onBillPaidListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(billsQuery.hasNextPage),
    isFetchingNextPage: billsQuery.isFetchingNextPage,
    fetchNextPage: () => billsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onPendingDutyScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(dutyAllQuery.hasNextPage),
    isFetchingNextPage: dutyAllQuery.isFetchingNextPage,
    fetchNextPage: () => dutyAllQuery.fetchNextPage(),
    threshold: 80,
  });

  const onDoneDutyScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(dutyAllQuery.hasNextPage),
    isFetchingNextPage: dutyAllQuery.isFetchingNextPage,
    fetchNextPage: () => dutyAllQuery.fetchNextPage(),
    threshold: 80,
    beforeFetch: () => {
      if (!showAllDoneDuty) setShowAllDoneDuty(true);
    },
  });

  return {
    onNoticeListScroll,
    onBillUnpaidListScroll,
    onBillPaidListScroll,
    onPendingDutyScroll,
    onDoneDutyScroll,
  };
}

