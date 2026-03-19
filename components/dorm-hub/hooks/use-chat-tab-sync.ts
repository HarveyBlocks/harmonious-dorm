import { useEffect } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';

import { consumeSeenPendingChats } from '@/components/dorm-hub/hooks/chat-pending-seen';
import { isChatNearBottom } from '@/components/dorm-hub/ui-helpers';
import type { ActiveTab } from '@/components/dorm-hub/ui-types';

export function useChatTabSync(options: {
  activeTab: ActiveTab;
  chatScrollRef: RefObject<HTMLDivElement>;
  chatMessageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  chatAutoScrolledRef: MutableRefObject<boolean>;
  chatAtBottomRef: MutableRefObject<boolean>;
  pendingNewChatIdsRef: MutableRefObject<Set<number>>;
  setNewChatHintCount: Dispatch<SetStateAction<number>>;
  resetChatToLatest: () => void;
}) {
  const {
    activeTab,
    chatScrollRef,
    chatMessageRefs,
    chatAutoScrolledRef,
    chatAtBottomRef,
    pendingNewChatIdsRef,
    setNewChatHintCount,
    resetChatToLatest,
  } = options;

  useEffect(() => {
    if (activeTab !== 'chat') return;
    chatAutoScrolledRef.current = false;
    requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      if (!container) return;
      const nearBottom = isChatNearBottom(container);
      chatAtBottomRef.current = nearBottom;
      if (nearBottom && pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
        return;
      }
      const { remaining, changed } = consumeSeenPendingChats({
        pendingIdsRef: pendingNewChatIdsRef,
        messageRefs: chatMessageRefs,
        viewportBottom: container.scrollTop + container.clientHeight,
      });
      if (!changed) return;
      setNewChatHintCount(remaining);
    });
  }, [
    activeTab,
    chatAtBottomRef,
    chatAutoScrolledRef,
    chatMessageRefs,
    chatScrollRef,
    pendingNewChatIdsRef,
    setNewChatHintCount,
  ]);

  useEffect(() => {
    if (activeTab !== 'chat') {
      resetChatToLatest();
    }
  }, [activeTab, resetChatToLatest]);
}

