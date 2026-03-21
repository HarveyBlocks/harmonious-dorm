import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

import type { ActiveTab, ChatMessage } from '../ui-types';
import { useSocketConnection } from './socket/use-socket-connection';

type AutoReadType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

export function useSocket(options: {
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
  const autoReadMutateRef = useRef(options.autoReadByTypeMutation.mutate);
  const onBotStreamCommitRef = useRef(options.onBotStreamCommit);
  const connectedDormRef = useRef<number | null>(null);
  const initCooldownUntilRef = useRef<number>(0);

  useEffect(() => {
    autoReadMutateRef.current = options.autoReadByTypeMutation.mutate;
  }, [options.autoReadByTypeMutation.mutate]);

  useEffect(() => {
    onBotStreamCommitRef.current = options.onBotStreamCommit;
  }, [options.onBotStreamCommit]);

  useSocketConnection({
    ...options,
    autoReadMutate: autoReadMutateRef.current,
    onBotStreamCommit: onBotStreamCommitRef.current,
    connectedDormRef,
    initCooldownUntilRef,
  });
}
