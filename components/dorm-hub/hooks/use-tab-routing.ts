import { useCallback, useEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

import { mapPathToTab, mapTabToPath } from '@/components/dorm-hub/ui-helpers';
import type { ActiveTab } from '@/components/dorm-hub/ui-types';

export function useTabRouting(options: {
  pathname: string | null;
  router: AppRouterInstance;
  activeTab: ActiveTab;
  setActiveTab: Dispatch<SetStateAction<ActiveTab>>;
  lastActiveTabRef: MutableRefObject<ActiveTab>;
  onNavigateToNotifications?: () => void;
}) {
  const { pathname, router, activeTab, setActiveTab, lastActiveTabRef, onNavigateToNotifications } = options;

  useEffect(() => {
    setActiveTab(mapPathToTab(pathname || '/'));
  }, [pathname, setActiveTab]);

  useEffect(() => {
    lastActiveTabRef.current = activeTab;
  }, [activeTab, lastActiveTabRef]);

  const navigateToTab = useCallback(
    (tab: ActiveTab) => {
      const targetPath = mapTabToPath(tab);
      if (tab === 'notifications') {
        onNavigateToNotifications?.();
      }
      setActiveTab(tab);
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    },
    [onNavigateToNotifications, pathname, router, setActiveTab],
  );

  return { navigateToTab };
}

