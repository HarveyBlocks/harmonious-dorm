import { useLayoutEffect } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';

import type { ActiveTab } from '@/components/dorm-hub/ui-types';

export function useChatLayoutSync(options: {
  activeTab: ActiveTab;
  liveMessageCount: number;
  chatScrollRef: RefObject<HTMLDivElement>;
  chatPrependStateRef: MutableRefObject<{ pending: boolean; prevHeight: number; prevTop: number }>;
  chatForceBottomOnNextLayoutRef: MutableRefObject<boolean>;
  chatAutoScrolledRef: MutableRefObject<boolean>;
  chatAtBottomRef: MutableRefObject<boolean>;
  pendingNewChatIdsRef: MutableRefObject<Set<number>>;
  chatMessageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
  setNewChatHintCount: Dispatch<SetStateAction<number>>;
}) {
  const {
    activeTab,
    liveMessageCount,
    chatScrollRef,
    chatPrependStateRef,
    chatForceBottomOnNextLayoutRef,
    chatAutoScrolledRef,
    chatAtBottomRef,
    pendingNewChatIdsRef,
    chatMessageRefs,
    setNewChatHintCount,
  } = options;

  useLayoutEffect(() => {
    if (activeTab !== 'chat' || !chatScrollRef.current || liveMessageCount === 0) return;
    const container = chatScrollRef.current;
    if (chatPrependStateRef.current.pending) {
      const { prevHeight, prevTop } = chatPrependStateRef.current;
      const nextHeight = container.scrollHeight;
      container.scrollTop = Math.max(0, nextHeight - prevHeight + prevTop);
      chatPrependStateRef.current.pending = false;
      return;
    }
    if (chatForceBottomOnNextLayoutRef.current) {
      container.scrollTop = container.scrollHeight;
      chatForceBottomOnNextLayoutRef.current = false;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      return;
    }
    if (!chatAutoScrolledRef.current) {
      container.scrollTop = container.scrollHeight;
      chatAutoScrolledRef.current = true;
      chatAtBottomRef.current = true;
      return;
    }
    const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      return;
    }
    chatAtBottomRef.current = false;
    const pending = pendingNewChatIdsRef.current;
    if (pending.size === 0) return;
    const viewportBottom = container.scrollTop + container.clientHeight;
    const seenIds: number[] = [];
    pending.forEach((id) => {
      const node = chatMessageRefs.current[id];
      if (!node) return;
      if (node.offsetTop <= viewportBottom - 8) {
        seenIds.push(id);
      }
    });
    if (seenIds.length === 0) return;
    for (const id of seenIds) {
      pending.delete(id);
    }
    setNewChatHintCount(pending.size);
  }, [
    activeTab,
    chatAtBottomRef,
    chatAutoScrolledRef,
    chatForceBottomOnNextLayoutRef,
    chatMessageRefs,
    chatPrependStateRef,
    chatScrollRef,
    liveMessageCount,
    pendingNewChatIdsRef,
    setNewChatHintCount,
  ]);
}


