import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

import { markAppNavigating } from '@/lib/client-api';
import type { ActiveTab, ChatMessage } from '@/components/dorm-hub/ui-types';
import { bindSocketEvents } from './bind-events';
import { clearAllStreamEntries, createStreamState } from './stream-buffer';

type AutoReadType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

type Input = {
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
  autoReadMutate: (type: AutoReadType) => void;
  onBotStreamCommit: () => void;
  connectedDormRef: MutableRefObject<number | null>;
  initCooldownUntilRef: MutableRefObject<number>;
};

function isNavigationInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  return (window as Window & { __APP_NAVIGATING__?: boolean }).__APP_NAVIGATING__ === true;
}

async function initSocketServerEndpoint(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const initResp = await fetch('/api/socket-init', { method: 'GET', cache: 'no-store', headers: { Accept: 'application/json' } });
      if (initResp.ok) return true;
    } catch (error) {
      if (!isNavigationInProgress()) console.error('[socket-init] failed', error);
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return false;
}

function createSocketClient(dormId: number) {
  const socket = io({
    path: '/api/ws',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
  });
  socket.emit('join', dormId);
  return socket;
}

export function useSocketConnection(input: Input) {
  const streamStateRef = useRef(createStreamState());

  useEffect(() => {
    if (!input.dormId) return;
    const dormId = input.dormId;
    if (input.socketRef.current && input.connectedDormRef.current === dormId) return;
    if (Date.now() < input.initCooldownUntilRef.current) return;
    markAppNavigating(false);

    let mounted = true;
    const init = async () => {
      const initOk = await initSocketServerEndpoint();
      if (!mounted) return;
      if (!initOk) {
        input.initCooldownUntilRef.current = Date.now() + 5000;
        return;
      }

      const socket = createSocketClient(dormId);
      input.connectedDormRef.current = dormId;
      bindSocketEvents({
        socket,
        meId: input.meId,
        queryClient: input.queryClient,
        lastActiveTabRef: input.lastActiveTabRef,
        chatAtBottomRef: input.chatAtBottomRef,
        chatForceBottomOnNextLayoutRef: input.chatForceBottomOnNextLayoutRef,
        pendingNewChatIdsRef: input.pendingNewChatIdsRef,
        setLiveMessages: input.setLiveMessages,
        setNewChatHintCount: input.setNewChatHintCount,
        setChatNewerCursor: input.setChatNewerCursor,
        setChatHasNewer: input.setChatHasNewer,
        setNoticePopup: input.setNoticePopup,
        autoReadMutate: input.autoReadMutate,
        onBotStreamCommit: input.onBotStreamCommit,
        streamState: streamStateRef.current,
      });
      input.socketRef.current = socket;
    };

    void init();
    return () => {
      mounted = false;
      clearAllStreamEntries(streamStateRef.current);
      input.socketRef.current?.disconnect();
      input.socketRef.current = null;
      input.connectedDormRef.current = null;
    };
  }, [
    input.chatAtBottomRef,
    input.chatForceBottomOnNextLayoutRef,
    input.dormId,
    input.initCooldownUntilRef,
    input.lastActiveTabRef,
    input.meId,
    input.pendingNewChatIdsRef,
    input.queryClient,
    input.setChatHasNewer,
    input.setChatNewerCursor,
    input.setLiveMessages,
    input.setNewChatHintCount,
    input.setNoticePopup,
    input.socketRef,
    input.connectedDormRef,
    input.autoReadMutate,
    input.onBotStreamCommit,
  ]);
}
