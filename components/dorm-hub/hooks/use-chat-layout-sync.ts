import { useLayoutEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';

import { consumeSeenPendingChats } from '@/components/dorm-hub/hooks/chat-pending-seen';
import type { ActiveTab } from '@/components/dorm-hub/ui-types';

export function useChatLayoutSync(options: {
  activeTab: ActiveTab;
  liveMessageCount: number;
  liveContentVersion: number;
  hasStreamingMessage: boolean;
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
    liveContentVersion,
    hasStreamingMessage,
    chatScrollRef,
    chatPrependStateRef,
    chatForceBottomOnNextLayoutRef,
    chatAutoScrolledRef,
    chatAtBottomRef,
    pendingNewChatIdsRef,
    chatMessageRefs,
    setNewChatHintCount,
  } = options;
  const metricsRef = useRef<{ height: number; atBottom: boolean } | null>(null);

  useLayoutEffect(() => {
    if (activeTab !== 'chat' || !chatScrollRef.current || liveMessageCount === 0) return;
    const container = chatScrollRef.current;
    const currentHeight = container.scrollHeight;
    const currentNearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
    const previous = metricsRef.current;
    const grew = previous ? currentHeight > previous.height : false;
    const wasAtBottom = previous ? previous.atBottom : currentNearBottom;

    const saveMetrics = () => {
      const nearBottomNow = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
      metricsRef.current = { height: container.scrollHeight, atBottom: nearBottomNow };
    };

    if (chatPrependStateRef.current.pending) {
      const { prevHeight, prevTop } = chatPrependStateRef.current;
      const nextHeight = container.scrollHeight;
      container.scrollTop = Math.max(0, nextHeight - prevHeight + prevTop);
      chatPrependStateRef.current.pending = false;
      saveMetrics();
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
      saveMetrics();
      return;
    }
    if (!chatAutoScrolledRef.current) {
      container.scrollTop = container.scrollHeight;
      chatAutoScrolledRef.current = true;
      chatAtBottomRef.current = true;
      saveMetrics();
      return;
    }
    const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
    if (hasStreamingMessage) {
      const shouldFollowBottom = chatAtBottomRef.current || wasAtBottom;
      if (shouldFollowBottom) {
        container.scrollTop = container.scrollHeight;
      }
      const nearBottomAfterAdjust = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
      chatAtBottomRef.current = shouldFollowBottom ? nearBottomAfterAdjust : false;
      if (chatAtBottomRef.current && pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      saveMetrics();
      return;
    }
    if (!nearBottom && grew && wasAtBottom) {
      container.scrollTop = container.scrollHeight;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      saveMetrics();
      return;
    }
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      saveMetrics();
      return;
    }
    chatAtBottomRef.current = false;
    const { remaining, changed } = consumeSeenPendingChats({
      pendingIdsRef: pendingNewChatIdsRef,
      messageRefs: chatMessageRefs,
      viewportBottom: container.scrollTop + container.clientHeight,
    });
    if (changed) {
      setNewChatHintCount(remaining);
    }
    saveMetrics();
  }, [
    activeTab,
    chatAtBottomRef,
    chatAutoScrolledRef,
    chatForceBottomOnNextLayoutRef,
    chatMessageRefs,
    chatPrependStateRef,
    chatScrollRef,
    hasStreamingMessage,
    liveContentVersion,
    liveMessageCount,
    pendingNewChatIdsRef,
    setNewChatHintCount,
  ]);
}


