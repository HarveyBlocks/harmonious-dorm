
import React, { useEffect } from 'react';

import type { ActiveTab } from '@/components/dorm-app/types';

type NoticeType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

export function useTabAutoRead(options: {
  activeTab: ActiveTab;
  lastAutoReadTabRef: React.MutableRefObject<ActiveTab>;
  mutate: (type: NoticeType) => void;
}) {
  const { activeTab, lastAutoReadTabRef, mutate } = options;

  useEffect(() => {
    if (lastAutoReadTabRef.current === activeTab) return;
    lastAutoReadTabRef.current = activeTab;
    if (activeTab === 'chat') {
      mutate('chat');
      return;
    }
    if (activeTab === 'wallet') {
      mutate('bill');
      return;
    }
    if (activeTab === 'duty') {
      mutate('duty');
      return;
    }
    if (activeTab === 'settings') {
      mutate('settings');
      mutate('dorm');
      mutate('leader');
    }
  }, [activeTab, lastAutoReadTabRef, mutate]);
}

