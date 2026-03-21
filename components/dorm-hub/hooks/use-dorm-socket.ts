
import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

import { mergeChatMessages, tabForNotificationType } from '../ui-helpers';
import { markAppNavigating } from '@/lib/client-api';
import type { ActiveTab, ChatMessage } from '../ui-types';

type AutoReadType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

const STREAM_TOKEN_DELAY_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_STREAM_TOKEN_DELAY_MS || '0');
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return Math.floor(raw);
})();

function isNavigationInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { __APP_NAVIGATING__?: boolean }).__APP_NAVIGATING__ === true;
}

export function useDormSocket(options: {
  dormId: number | null | undefined;
  meId: number | null | undefined;
  queryClient: QueryClient;
  socketRef: MutableRefObject<Socket | null>;
  lastActiveTabRef: MutableRefObject<ActiveTab>;
  chatAtBottomRef: MutableRefObject<boolean>;
  chatForceBottomOnNextLayoutRef: MutableRefObject<boolean>;
  pendingNewChatIdsRef: MutableRefObject<Set<number>>;
  setLiveMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setNewChatHintCount: Dispatch<SetStateAction<number>>;
  setChatNewerCursor: Dispatch<SetStateAction<number | null>>;
  setChatHasNewer: Dispatch<SetStateAction<boolean>>;
  setNoticePopup: Dispatch<SetStateAction<{ title: string; content: string } | null>>;
  onBotStreamCommit: () => void;
  autoReadByTypeMutation: { mutate: (type: AutoReadType) => void };
}) {
  const {
    dormId,
    meId,
    queryClient,
    socketRef,
    lastActiveTabRef,
    chatAtBottomRef,
    chatForceBottomOnNextLayoutRef,
    pendingNewChatIdsRef,
    setLiveMessages,
    setNewChatHintCount,
    setChatNewerCursor,
    setChatHasNewer,
    setNoticePopup,
    onBotStreamCommit,
    autoReadByTypeMutation,
  } = options;
  const autoReadMutateRef = useRef(autoReadByTypeMutation.mutate);
  const onBotStreamCommitRef = useRef(onBotStreamCommit);
  const connectedDormRef = useRef<number | null>(null);
  const initCooldownUntilRef = useRef<number>(0);
  const streamBufferRef = useRef<Map<number, string>>(new Map());
  const streamTimerRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const streamLastEmitAtRef = useRef<Map<number, number>>(new Map());

  const clearStreamState = (streamId: number) => {
    const timer = streamTimerRef.current.get(streamId);
    if (timer) clearTimeout(timer);
    streamTimerRef.current.delete(streamId);
    streamBufferRef.current.delete(streamId);
    streamLastEmitAtRef.current.delete(streamId);
  };

  const flushStreamBuffer = (streamId: number) => {
    const buffered = streamBufferRef.current.get(streamId);
    if (!buffered) return;
    streamBufferRef.current.set(streamId, '');
    streamLastEmitAtRef.current.set(streamId, Date.now());
    setLiveMessages((prev) =>
      prev.map((item) => (item.id === streamId ? { ...item, content: `${item.content}${buffered}` } : item)),
    );
  };

  const scheduleStreamFlush = (streamId: number) => {
    if (STREAM_TOKEN_DELAY_MS <= 0) {
      flushStreamBuffer(streamId);
      return;
    }
    if (streamTimerRef.current.has(streamId)) return;

    const lastEmitAt = streamLastEmitAtRef.current.get(streamId) ?? Date.now();
    const elapsed = Date.now() - lastEmitAt;
    if (elapsed >= STREAM_TOKEN_DELAY_MS) {
      flushStreamBuffer(streamId);
      return;
    }

    const waitMs = STREAM_TOKEN_DELAY_MS - elapsed;
    const timer = setTimeout(() => {
      streamTimerRef.current.delete(streamId);
      flushStreamBuffer(streamId);
      if (streamBufferRef.current.get(streamId)) {
        scheduleStreamFlush(streamId);
      }
    }, waitMs);
    streamTimerRef.current.set(streamId, timer);
  };

  useEffect(() => {
    autoReadMutateRef.current = autoReadByTypeMutation.mutate;
  }, [autoReadByTypeMutation.mutate]);

  useEffect(() => {
    onBotStreamCommitRef.current = onBotStreamCommit;
  }, [onBotStreamCommit]);

  useEffect(() => {
    if (!dormId) return;
    if (socketRef.current && connectedDormRef.current === dormId) return;
    if (Date.now() < initCooldownUntilRef.current) return;
    markAppNavigating(false);

    let mounted = true;

    const init = async () => {
      let initOk = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const initResp = await fetch('/api/socket-init', {
            method: 'GET',
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          });
          if (initResp.ok) {
            initOk = true;
            break;
          }
        } catch (error) {
          if (!isNavigationInProgress()) {
            console.error('[socket-init] failed', error);
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
      if (!mounted) return;

      if (!initOk) {
        initCooldownUntilRef.current = Date.now() + 5000;
        return;
      }
      const socket = io({
        path: '/api/ws',
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
      });
      socket.emit('join', dormId);
      connectedDormRef.current = dormId;

      socket.on('chat:new', (message: ChatMessage) => {
        const isChatTab = lastActiveTabRef.current === 'chat';
        const shouldCountAsNew = Boolean(isChatTab && meId && message.userId !== meId);
        if (isChatTab && (chatAtBottomRef.current || (meId != null && message.userId === meId))) {
          chatForceBottomOnNextLayoutRef.current = true;
        }
        setLiveMessages((prev) => mergeChatMessages(prev, [message]));
        if (shouldCountAsNew && !chatAtBottomRef.current) {
          pendingNewChatIdsRef.current.add(message.id);
          setNewChatHintCount(pendingNewChatIdsRef.current.size);
        }
        setChatNewerCursor((prev) => (prev && prev > message.id ? prev : message.id));
        setChatHasNewer(false);
      });

      socket.on('chat:privacy-changed', (payload: { id: number; isPrivateForBot: boolean }) => {
        if (!payload?.id) return;
        setLiveMessages((prev) =>
          prev.map((item) =>
            item.id === payload.id ? { ...item, isPrivateForBot: payload.isPrivateForBot } : item,
          ),
        );
      });

      socket.on('chat:stream:start', (payload: { streamId: number; message: ChatMessage }) => {
        if (!payload?.message) return;
        streamBufferRef.current.set(payload.streamId, '');
        streamLastEmitAtRef.current.set(payload.streamId, Date.now());
        const isChatTab = lastActiveTabRef.current === 'chat';
        if (isChatTab && chatAtBottomRef.current) {
          chatForceBottomOnNextLayoutRef.current = true;
        }
        setLiveMessages((prev) => mergeChatMessages(prev, [payload.message]));
        setChatNewerCursor((prev) => (prev && prev > payload.message.id ? prev : payload.message.id));
        setChatHasNewer(false);
        onBotStreamCommitRef.current();
      });

      socket.on('chat:stream:chunk', (payload: { streamId: number; delta: string }) => {
        if (!payload?.delta) return;
        const isChatTab = lastActiveTabRef.current === 'chat';
        if (isChatTab && chatAtBottomRef.current) {
          chatForceBottomOnNextLayoutRef.current = true;
        }
        const prevBuffered = streamBufferRef.current.get(payload.streamId) || '';
        streamBufferRef.current.set(payload.streamId, `${prevBuffered}${payload.delta}`);
        scheduleStreamFlush(payload.streamId);
      });

      socket.on('chat:stream:reasoning', (payload: { streamId: number; reasoningCount: number }) => {
        if (!payload?.streamId) return;
        const safeCount = Number.isFinite(payload.reasoningCount) ? payload.reasoningCount : 0;
        setLiveMessages((prev) =>
          prev.map((item) =>
            item.id === payload.streamId ? { ...item, reasoningCount: safeCount } : item,
          ),
        );
      });

      socket.on('chat:stream:commit', (payload: { streamId: number; message: ChatMessage }) => {
        if (!payload?.message) return;
        flushStreamBuffer(payload.streamId);
        clearStreamState(payload.streamId);
        const isChatTab = lastActiveTabRef.current === 'chat';
        const shouldCountAsNew = Boolean(isChatTab && meId && payload.message.userId !== meId);
        if (isChatTab && chatAtBottomRef.current) {
          chatForceBottomOnNextLayoutRef.current = true;
        }
        setLiveMessages((prev) => mergeChatMessages(prev.filter((item) => item.id !== payload.streamId), [payload.message]));
        if (shouldCountAsNew && !chatAtBottomRef.current) {
          pendingNewChatIdsRef.current.add(payload.message.id);
          setNewChatHintCount(pendingNewChatIdsRef.current.size);
        }
        setChatNewerCursor((prev) => (prev && prev > payload.message.id ? prev : payload.message.id));
        setChatHasNewer(false);
      });

      socket.on('chat:stream:abort', (payload: { streamId: number }) => {
        if (!payload?.streamId) return;
        clearStreamState(payload.streamId);
        setLiveMessages((prev) => prev.filter((item) => item.id !== payload.streamId));
      });

      socket.on('chat:stream:stop-requested', (payload: { streamId: number }) => {
        if (!payload?.streamId) return;
        clearStreamState(payload.streamId);
        setLiveMessages((prev) =>
          prev.map((item) => (item.id === payload.streamId ? { ...item, isStreaming: false } : item)),
        );
      });

      socket.on('duty:changed', () => {
        void queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
      });
      socket.on('bill:changed', () => {
        void queryClient.invalidateQueries({ queryKey: ['bills'] });
      });

      socket.on('notification:new', (payload: { userId?: number; type?: string; title: string; content: string }) => {
        if (!meId || (payload.userId && payload.userId !== meId)) return;
        const targetTab = tabForNotificationType(payload.type);
        if (targetTab && lastActiveTabRef.current === targetTab) {
          const typeToRead = payload.type as AutoReadType;
          autoReadMutateRef.current(typeToRead);
          if (targetTab === 'settings') {
            void queryClient.invalidateQueries({ queryKey: ['me'] });
          }
          return;
        }
        setNoticePopup({ title: payload.title, content: payload.content });
        setTimeout(() => {
          setNoticePopup((current) => (current && current.title === payload.title && current.content === payload.content ? null : current));
        }, 5000);
      });

      socket.on('notification:changed', (payload: { type?: string }) => {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        void queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
        void queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
        if (payload?.type === 'settings' || payload?.type === 'dorm' || payload?.type === 'leader') {
          void queryClient.invalidateQueries({ queryKey: ['me'] });
        }
      });

      socket.on('status:changed', () => {
        void queryClient.invalidateQueries({ queryKey: ['status'] });
      });

      socket.on('settings:changed', () => {
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      });

      socketRef.current = socket;
    };

    void init();

    return () => {
      mounted = false;
      streamTimerRef.current.forEach((timer) => clearTimeout(timer));
      streamTimerRef.current.clear();
      streamBufferRef.current.clear();
      streamLastEmitAtRef.current.clear();
      socketRef.current?.disconnect();
      socketRef.current = null;
      connectedDormRef.current = null;
    };
  }, [
    chatAtBottomRef,
    chatForceBottomOnNextLayoutRef,
    dormId,
    lastActiveTabRef,
    meId,
    pendingNewChatIdsRef,
    queryClient,
    setChatHasNewer,
    setChatNewerCursor,
    setLiveMessages,
    setNewChatHintCount,
    setNoticePopup,
    socketRef,
  ]);
}
