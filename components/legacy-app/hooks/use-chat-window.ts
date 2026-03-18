
import { useCallback, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/client-api';
import type { NotificationPayload } from '@/lib/types';

import { isChatNearBottom, mergeChatMessages } from '../helpers';
import type { ChatMessage } from '../types';

interface ChatWindowPage {
  items: ChatMessage[];
  nextCursor: number | null;
  hasMore: boolean;
}

interface ChatAroundPage {
  items: ChatMessage[];
  olderCursor: number | null;
  newerCursor: number | null;
  hasOlder: boolean;
  hasNewer: boolean;
}

export function useChatWindow(options: {
  unreadRows: NotificationPayload[];
  anchorId: number | null;
  chatQuery: {
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => Promise<unknown>;
  };
  setLiveMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  chatMessageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  pendingNewChatIdsRef: React.MutableRefObject<Set<number>>;
  chatAtBottomRef: React.MutableRefObject<boolean>;
  syncSeenNewChatHint: () => void;
  setNewChatHintCount: React.Dispatch<React.SetStateAction<number>>;
}) {
  const {
    unreadRows,
    anchorId,
    chatQuery,
    setLiveMessages,
    chatMessageRefs,
    pendingNewChatIdsRef,
    chatAtBottomRef,
    syncSeenNewChatHint,
    setNewChatHintCount,
  } = options;

  const [chatWindowMode, setChatWindowMode] = useState(false);
  const [chatOlderCursor, setChatOlderCursor] = useState<number | null>(null);
  const [chatNewerCursor, setChatNewerCursor] = useState<number | null>(null);
  const [chatHasOlder, setChatHasOlder] = useState(true);
  const [chatHasNewer, setChatHasNewer] = useState(false);

  const chatLoadingOlderRef = useRef(false);
  const chatLoadingNewerRef = useRef(false);
  const chatPrependStateRef = useRef<{ pending: boolean; prevHeight: number; prevTop: number }>({
    pending: false,
    prevHeight: 0,
    prevTop: 0,
  });

  const unreadChatCount = useMemo(() => {
    return unreadRows
      .filter((item) => item.type === 'chat')
      .reduce((sum, item) => sum + Math.max(item.unreadCount || 0, 1), 0);
  }, [unreadRows]);

  const lastPositionChatId = anchorId || null;

  const jumpToLastPosition = useCallback(async () => {
    if (unreadChatCount <= 20) return;
    if (!lastPositionChatId) return;

    const windowResp = await apiRequest<ChatAroundPage>(
      `/api/chat/window?mode=around&anchorId=${lastPositionChatId}&before=10&after=10`,
    );
    if (!windowResp.items.length) return;

    setChatWindowMode(true);
    setLiveMessages(windowResp.items);
    setChatOlderCursor(windowResp.olderCursor);
    setChatNewerCursor(windowResp.newerCursor);
    setChatHasOlder(windowResp.hasOlder);
    setChatHasNewer(windowResp.hasNewer);

    requestAnimationFrame(() => {
      const node = chatMessageRefs.current[lastPositionChatId];
      if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [chatMessageRefs, lastPositionChatId, setLiveMessages, unreadChatCount]);

  const resetChatToLatest = useCallback(() => {
    setChatWindowMode(false);
    setChatOlderCursor(null);
    setChatNewerCursor(null);
    setChatHasOlder(true);
    setChatHasNewer(false);
  }, []);

  const onChatListScroll = useCallback(async (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const nearTop = el.scrollTop <= 80;
    const nearBottom = isChatNearBottom(el);
    chatAtBottomRef.current = nearBottom;

    if (nearBottom && pendingNewChatIdsRef.current.size > 0) {
      pendingNewChatIdsRef.current.clear();
      setNewChatHintCount(0);
    } else {
      syncSeenNewChatHint();
    }

    if (chatWindowMode) {
      if (nearTop && chatHasOlder && chatOlderCursor && !chatLoadingOlderRef.current) {
        chatLoadingOlderRef.current = true;
        chatPrependStateRef.current = {
          pending: true,
          prevHeight: el.scrollHeight,
          prevTop: el.scrollTop,
        };

        try {
          const resp = await apiRequest<ChatWindowPage>(`/api/chat/window?mode=older&cursor=${chatOlderCursor}&limit=20`);
          if (resp.items.length > 0) {
            setLiveMessages((prev) => mergeChatMessages(resp.items, prev));
            setChatOlderCursor(resp.nextCursor ?? chatOlderCursor);
          }
          setChatHasOlder(Boolean(resp.hasMore && resp.nextCursor));
        } finally {
          chatLoadingOlderRef.current = false;
        }
        return;
      }

      if (nearBottom && chatHasNewer && chatNewerCursor && !chatLoadingNewerRef.current) {
        chatLoadingNewerRef.current = true;
        try {
          const resp = await apiRequest<ChatWindowPage>(`/api/chat/window?mode=newer&cursor=${chatNewerCursor}&limit=20`);
          if (resp.items.length > 0) {
            setLiveMessages((prev) => mergeChatMessages(prev, resp.items));
            setChatNewerCursor(resp.nextCursor ?? chatNewerCursor);
          }
          setChatHasNewer(Boolean(resp.hasMore && resp.nextCursor));
        } finally {
          chatLoadingNewerRef.current = false;
        }
      }
      return;
    }

    if (nearTop && chatQuery.hasNextPage && !chatQuery.isFetchingNextPage) {
      chatPrependStateRef.current = {
        pending: true,
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
      await chatQuery.fetchNextPage();
    }
  }, [
    chatAtBottomRef,
    chatHasNewer,
    chatHasOlder,
    chatNewerCursor,
    chatOlderCursor,
    chatQuery,
    chatWindowMode,
    pendingNewChatIdsRef,
    setLiveMessages,
    setNewChatHintCount,
    syncSeenNewChatHint,
  ]);

  return {
    chatWindowMode,
    setChatWindowMode,
    chatOlderCursor,
    setChatOlderCursor,
    chatNewerCursor,
    setChatNewerCursor,
    chatHasOlder,
    setChatHasOlder,
    chatHasNewer,
    setChatHasNewer,
    chatPrependStateRef,
    unreadChatCount,
    lastPositionChatId,
    jumpToLastPosition,
    resetChatToLatest,
    onChatListScroll,
  };
}
