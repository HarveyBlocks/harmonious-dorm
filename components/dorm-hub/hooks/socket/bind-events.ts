import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';

import { mergeChatMessages, tabForNotificationType } from '@/components/dorm-hub/ui-helpers';
import { NOTICE_POPUP_HIDE_MS } from '@/components/dorm-hub/ui-constants';
import type { ActiveTab, ChatMessage } from '@/components/dorm-hub/ui-types';
import type { StreamState } from './stream-types';
import { clearStreamEntry, enqueueStreamDelta, flushStreamEntry } from './stream-buffer';

type AutoReadType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

type CommonDeps = {
  socket: Socket;
  meId: number | null | undefined;
  queryClient: QueryClient;
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
  streamState: StreamState;
};

function updateChatCursor(deps: CommonDeps, messageId: number) {
  deps.setChatNewerCursor((prev) => (prev && prev > messageId ? prev : messageId));
  deps.setChatHasNewer(false);
}

function onPotentialNewChat(deps: CommonDeps, message: ChatMessage) {
  const isChatTab = deps.lastActiveTabRef.current === 'chat';
  const isSelf = deps.meId != null && message.userId === deps.meId;
  if (isChatTab && (deps.chatAtBottomRef.current || isSelf)) {
    deps.chatForceBottomOnNextLayoutRef.current = true;
  }
  const shouldCountAsNew = Boolean(isChatTab && deps.meId && message.userId !== deps.meId);
  if (shouldCountAsNew && !deps.chatAtBottomRef.current) {
    deps.pendingNewChatIdsRef.current.add(message.id);
    deps.setNewChatHintCount(deps.pendingNewChatIdsRef.current.size);
  }
}

function bindChatEvents(deps: CommonDeps) {
  deps.socket.on('chat:new', (message: ChatMessage) => {
    onPotentialNewChat(deps, message);
    deps.setLiveMessages((prev) => mergeChatMessages(prev, [message]));
    updateChatCursor(deps, message.id);
  });

  deps.socket.on('chat:privacy-changed', (payload: { id: number; isPrivateForBot: boolean }) => {
    if (!payload?.id) return;
    deps.setLiveMessages((prev) => prev.map((item) => (item.id === payload.id ? { ...item, isPrivateForBot: payload.isPrivateForBot } : item)));
  });

  deps.socket.on('chat:stream:start', (payload: { streamId: number; message: ChatMessage }) => {
    if (!payload?.message) return;
    deps.streamState.bufferByStreamId.set(payload.streamId, '');
    deps.streamState.lastEmitAtByStreamId.set(payload.streamId, Date.now());
    if (deps.lastActiveTabRef.current === 'chat' && deps.chatAtBottomRef.current) deps.chatForceBottomOnNextLayoutRef.current = true;
    deps.setLiveMessages((prev) => mergeChatMessages(prev, [payload.message]));
    updateChatCursor(deps, payload.message.id);
    deps.onBotStreamCommit();
  });

  deps.socket.on('chat:stream:chunk', (payload: { streamId: number; delta: string }) => {
    if (!payload?.delta) return;
    if (deps.lastActiveTabRef.current === 'chat' && deps.chatAtBottomRef.current) deps.chatForceBottomOnNextLayoutRef.current = true;
    enqueueStreamDelta(deps.streamState, payload.streamId, payload.delta, deps.setLiveMessages);
  });

  deps.socket.on('chat:stream:phase', (payload: { streamId: number; phase: 'requesting' | 'thinking' | 'tool_calling' | 'tool_result_thinking' | 'responding' }) => {
    if (!payload?.streamId || !payload?.phase) return;
    deps.setLiveMessages((prev) => prev.map((item) => (item.id === payload.streamId ? { ...item, streamPhase: payload.phase } : item)));
  });
  deps.socket.on('chat:stream:reasoning', (payload: { streamId: number; reasoningCount: number }) => {
    if (!payload?.streamId) return;
    const safeCount = Number.isFinite(payload.reasoningCount) ? payload.reasoningCount : 0;
    deps.setLiveMessages((prev) => prev.map((item) => (item.id === payload.streamId ? { ...item, reasoningCount: safeCount, streamPhase: item.streamPhase === 'tool_calling' ? 'tool_result_thinking' : 'thinking' } : item))); 
  });

  deps.socket.on('chat:stream:commit', (payload: { streamId: number; message: ChatMessage }) => {
    if (!payload?.message) return;
    flushStreamEntry(deps.streamState, payload.streamId, deps.setLiveMessages);
    clearStreamEntry(deps.streamState, payload.streamId);
    onPotentialNewChat(deps, payload.message);
    deps.setLiveMessages((prev) => mergeChatMessages(prev.filter((item) => item.id !== payload.streamId), [payload.message]));
    updateChatCursor(deps, payload.message.id);
  });

  deps.socket.on('chat:stream:abort', (payload: { streamId: number }) => {
    if (!payload?.streamId) return;
    clearStreamEntry(deps.streamState, payload.streamId);
    deps.setLiveMessages((prev) => prev.filter((item) => item.id !== payload.streamId));
  });

  deps.socket.on('chat:stream:stop-requested', (payload: { streamId: number }) => {
    if (!payload?.streamId) return;
    clearStreamEntry(deps.streamState, payload.streamId);
    deps.setLiveMessages((prev) => prev.map((item) => (item.id === payload.streamId ? { ...item, isStreaming: false } : item)));
  });
}

function bindResourceEvents(deps: CommonDeps) {
  deps.socket.on('duty:changed', () => {
    void deps.queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
  });
  deps.socket.on('bill:changed', () => {
    void deps.queryClient.invalidateQueries({ queryKey: ['bills'] });
  });
  deps.socket.on('status:changed', () => {
    void deps.queryClient.invalidateQueries({ queryKey: ['status'] });
  });
  deps.socket.on('settings:changed', () => {
    void deps.queryClient.invalidateQueries({ queryKey: ['me'] });
  });
}

function bindNotificationEvents(deps: CommonDeps) {
  deps.socket.on('notification:new', (payload: { userId?: number; type?: string; title: string; content: string }) => {
    if (!deps.meId || (payload.userId && payload.userId !== deps.meId)) return;
    const targetTab = tabForNotificationType(payload.type);
    if (targetTab && deps.lastActiveTabRef.current === targetTab) {
      deps.autoReadMutate(payload.type as AutoReadType);
      if (targetTab === 'settings') {
        void deps.queryClient.invalidateQueries({ queryKey: ['me'] });
      }
      return;
    }
    deps.setNoticePopup({ title: payload.title, content: payload.content });
    setTimeout(() => {
      deps.setNoticePopup((current) => (current && current.title === payload.title && current.content === payload.content ? null : current));
    }, NOTICE_POPUP_HIDE_MS);
  });

  deps.socket.on('notification:changed', (payload: { type?: string }) => {
    void deps.queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void deps.queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    void deps.queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
    void deps.queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
    if (payload?.type === 'settings' || payload?.type === 'dorm' || payload?.type === 'leader') {
      void deps.queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });
}

export function bindSocketEvents(deps: CommonDeps) {
  bindChatEvents(deps);
  bindResourceEvents(deps);
  bindNotificationEvents(deps);
}
