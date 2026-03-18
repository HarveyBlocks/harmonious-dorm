
import React, { useEffect } from 'react';

import {
  BILL_AUTO_FILL_TOTAL_GROUPS,
  BILL_AUTO_FILL_UNPAID,
} from '@/components/dorm-app/constants';
import type { ActiveTab } from '@/components/dorm-app/types';

export function useTabPrefetch(options: {
  activeTab: ActiveTab;
  billsHasNextPage: boolean;
  billsIsFetchingNextPage: boolean;
  fetchNextBills: () => void;
  billsRowCount: number;
  unpaidBillCount: number;
  paidBillGroupCount: number;
  dutyHasNextPage: boolean;
  dutyIsFetchingNextPage: boolean;
  fetchNextDuty: () => void;
  pendingDutyGroupCount: number;
  doneDutyGroupCount: number;
  notificationRowCount: number;
  noticeHasNextPage: boolean;
  noticeIsFetchingNextPage: boolean;
  fetchNextNotices: () => void;
  unpaidListRef: React.RefObject<HTMLDivElement>;
  paidListRef: React.RefObject<HTMLDivElement>;
}) {
  const {
    activeTab,
    billsHasNextPage,
    billsIsFetchingNextPage,
    fetchNextBills,
    billsRowCount,
    unpaidBillCount,
    paidBillGroupCount,
    dutyHasNextPage,
    dutyIsFetchingNextPage,
    fetchNextDuty,
    pendingDutyGroupCount,
    doneDutyGroupCount,
    notificationRowCount,
    noticeHasNextPage,
    noticeIsFetchingNextPage,
    fetchNextNotices,
    unpaidListRef,
    paidListRef,
  } = options;

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsHasNextPage || billsIsFetchingNextPage) return;
    if (unpaidBillCount >= BILL_AUTO_FILL_UNPAID && paidBillGroupCount >= BILL_AUTO_FILL_TOTAL_GROUPS) return;
    fetchNextBills();
  }, [activeTab, billsHasNextPage, billsIsFetchingNextPage, fetchNextBills, paidBillGroupCount, unpaidBillCount]);

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsHasNextPage || billsIsFetchingNextPage) return;
    const unpaidList = unpaidListRef.current;
    const paidList = paidListRef.current;
    const unpaidNotScrollable = unpaidList ? unpaidList.scrollHeight <= unpaidList.clientHeight + 8 : false;
    const paidNotScrollable = paidList ? paidList.scrollHeight <= paidList.clientHeight + 8 : false;
    if ((unpaidNotScrollable || paidNotScrollable) && billsRowCount > 0) {
      fetchNextBills();
    }
  }, [activeTab, billsHasNextPage, billsIsFetchingNextPage, billsRowCount, fetchNextBills, paidListRef, unpaidListRef]);

  useEffect(() => {
    if (activeTab !== 'duty') return;
    if (pendingDutyGroupCount + doneDutyGroupCount > 0) return;
    if (!dutyHasNextPage || dutyIsFetchingNextPage) return;
    fetchNextDuty();
  }, [activeTab, doneDutyGroupCount, dutyHasNextPage, dutyIsFetchingNextPage, fetchNextDuty, pendingDutyGroupCount]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    if (notificationRowCount > 0) return;
    if (!noticeHasNextPage || noticeIsFetchingNextPage) return;
    fetchNextNotices();
  }, [activeTab, fetchNextNotices, noticeHasNextPage, noticeIsFetchingNextPage, notificationRowCount]);
}

