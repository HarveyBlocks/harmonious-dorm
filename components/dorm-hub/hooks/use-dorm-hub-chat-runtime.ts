import { useCallback, useEffect } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';

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
    const pending = pendingNewChatIdsRef.current;
    if (pending.size === 0) return;
    const viewportBottom = container.scrollTop + container.clientHeight;
    const seenIds: number[] = [];
    pending.forEach((id) => {
      const node = chatMessageRefs.current[id];
      if (!node) return;
      if (node.offsetTop <= viewportBottom - 8) seenIds.push(id);
    });
    if (!seenIds.length) return;
    for (const id of seenIds) pending.delete(id);
    setNewChatHintCount(pending.size);
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

  useChatLayoutSync({
    activeTab: activeTab as any,
    liveMessageCount: liveMessages.length,
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
