'use client';

import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

import { mergeChatMessages, tabForNotificationType } from '../helpers';
import type { ActiveTab, ChatMessage } from '../types';

type AutoReadType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

export function useDormSocket(options: {
  dormId: number | null | undefined;
  meId: number | null | undefined;
  queryClient: QueryClient;
  socketRef: React.MutableRefObject<Socket | null>;
  lastActiveTabRef: React.MutableRefObject<ActiveTab>;
  chatAtBottomRef: React.MutableRefObject<boolean>;
  chatForceBottomOnNextLayoutRef: React.MutableRefObject<boolean>;
  pendingNewChatIdsRef: React.MutableRefObject<Set<number>>;
  setLiveMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setNewChatHintCount: React.Dispatch<React.SetStateAction<number>>;
  setChatNewerCursor: React.Dispatch<React.SetStateAction<number | null>>;
  setChatHasNewer: React.Dispatch<React.SetStateAction<boolean>>;
  setNoticePopup: React.Dispatch<React.SetStateAction<{ title: string; content: string } | null>>;
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
    autoReadByTypeMutation,
  } = options;

  useEffect(() => {
    if (!dormId) return;

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
          console.error('[socket-init] failed', error);
        }
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
      if (!mounted) return;

      const socket = io({
        path: '/api/socket',
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
      });
      if (!initOk) {
        console.warn('[socket-init] not ready after retries, continue with socket reconnection');
      }
      socket.emit('join', dormId);

      socket.on('chat:new', (message: ChatMessage) => {
        const isChatTab = lastActiveTabRef.current === 'chat';
        const shouldCountAsNew = Boolean(isChatTab && meId && message.userId !== meId);
        if (isChatTab && chatAtBottomRef.current) {
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

      socket.on('duty:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
      });
      socket.on('bill:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      });

      socket.on('notification:new', (payload: { userId?: number; type?: string; title: string; content: string }) => {
        if (!meId || (payload.userId && payload.userId !== meId)) return;
        const targetTab = tabForNotificationType(payload.type);
        if (targetTab && lastActiveTabRef.current === targetTab) {
          const typeToRead = payload.type as AutoReadType;
          autoReadByTypeMutation.mutate(typeToRead);
          if (targetTab === 'settings') {
            queryClient.invalidateQueries({ queryKey: ['me'] });
          }
          return;
        }
        setNoticePopup({ title: payload.title, content: payload.content });
        setTimeout(() => {
          setNoticePopup((current) => (current && current.title === payload.title && current.content === payload.content ? null : current));
        }, 5000);
      });

      socket.on('notification:changed', (payload: { type?: string }) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
        queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
        if (payload?.type === 'settings' || payload?.type === 'dorm' || payload?.type === 'leader') {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        }
      });

      socket.on('status:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['status'] });
      });

      socketRef.current = socket;
    };

    init();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [
    autoReadByTypeMutation,
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
