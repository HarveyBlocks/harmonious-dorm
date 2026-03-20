import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';

import { consumeSeenPendingChats } from '@/components/dorm-hub/hooks/chat-pending-seen';
import { mergeChatMessages } from '@/components/dorm-hub/ui-helpers';
import { useChatLayoutSync } from '@/components/dorm-hub/hooks/use-chat-layout-sync';
import { useChatWindow } from '@/components/dorm-hub/hooks/use-chat-window';
import type { ChatMessage } from '@/components/dorm-hub/ui-types';

export function useDormHubChatRuntime(options: {
  activeTab: string;
  liveMessages: ChatMessage[];
  setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  chatQuery: {
    data?: { pages?: Array<{ items: any[] }> };
    dataUpdatedAt: number;
    hasNextPage?: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => Promise<unknown>;
  };
  unreadRows: Array<any>;
  anchorId: number | null;
  chatRefs: {
    chatScrollRef: RefObject<HTMLDivElement>;
    chatMessageRefs: MutableRefObject<Record<number, HTMLDivElement | null>>;
    chatAutoScrolledRef: MutableRefObject<boolean>;
    chatAtBottomRef: MutableRefObject<boolean>;
    chatForceBottomOnNextLayoutRef: MutableRefObject<boolean>;
    pendingNewChatIdsRef: MutableRefObject<Set<number>>;
  };
  setNewChatHintCount: Dispatch<SetStateAction<number>>;
}) {
  const {
    activeTab,
    liveMessages,
    setLiveMessages,
    chatQuery,
    unreadRows,
    anchorId,
    chatRefs,
    setNewChatHintCount,
  } = options;
  const {
    chatScrollRef,
    chatMessageRefs,
    chatAutoScrolledRef,
    chatAtBottomRef,
    chatForceBottomOnNextLayoutRef,
    pendingNewChatIdsRef,
  } = chatRefs;

  const syncSeenNewChatHint = useCallback(() => {
    const container = chatScrollRef.current;
    if (!container) return;
    const { remaining, changed } = consumeSeenPendingChats({
      pendingIdsRef: pendingNewChatIdsRef,
      messageRefs: chatMessageRefs,
      viewportBottom: container.scrollTop + container.clientHeight,
    });
    if (!changed) return;
    setNewChatHintCount(remaining);
  }, [chatMessageRefs, chatScrollRef, pendingNewChatIdsRef, setNewChatHintCount]);

  const chatWindow = useChatWindow({
    unreadRows,
    anchorId,
    chatQuery: {
      hasNextPage: Boolean(chatQuery.hasNextPage),
      isFetchingNextPage: chatQuery.isFetchingNextPage,
      fetchNextPage: () => chatQuery.fetchNextPage(),
    },
    setLiveMessages,
    chatMessageRefs,
    pendingNewChatIdsRef,
    chatAtBottomRef,
    syncSeenNewChatHint,
    setNewChatHintCount,
  });

  const hasStreamingMessage = liveMessages.some((item) => item.isStreaming);
  const liveContentVersion = useMemo(
    () => liveMessages.reduce((sum, item) => sum + item.content.length + (item.isStreaming ? 1 : 0), 0),
    [liveMessages],
  );

  useChatLayoutSync({
    activeTab: activeTab as any,
    liveMessageCount: liveMessages.length,
    liveContentVersion,
    hasStreamingMessage,
    chatScrollRef,
    chatPrependStateRef: chatWindow.chatPrependStateRef,
    chatForceBottomOnNextLayoutRef,
    chatAutoScrolledRef,
    chatAtBottomRef,
    pendingNewChatIdsRef,
    chatMessageRefs,
    setNewChatHintCount,
  });

  useEffect(() => {
    if (chatWindow.chatWindowMode || !chatQuery.data?.pages) return;
    const merged = chatQuery.data.pages.slice().reverse().flatMap((page) => page.items);
    setLiveMessages((prev) => mergeChatMessages(prev, merged));
  }, [chatQuery.data?.pages, chatQuery.dataUpdatedAt, chatWindow.chatWindowMode, setLiveMessages]);

  const jumpToFirstNewChat = useCallback(() => {
    const pendingIds = [...pendingNewChatIdsRef.current].sort((a, b) => a - b);
    if (!pendingIds.length) return;
    const node = chatMessageRefs.current[pendingIds[0]];
    if (!node) return;
    node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setTimeout(() => syncSeenNewChatHint(), 180);
  }, [chatMessageRefs, pendingNewChatIdsRef, syncSeenNewChatHint]);

  return {
    ...chatWindow,
    jumpToFirstNewChat,
  };
}
