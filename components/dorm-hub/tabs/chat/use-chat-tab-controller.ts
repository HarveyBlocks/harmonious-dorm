import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

import {
  CHAT_CONTEXT_LONG_PRESS_MS,
  CHAT_CONTEXT_MENU_HEIGHT,
  CHAT_CONTEXT_MENU_MARGIN,
  CHAT_CONTEXT_MENU_OFFSET,
  CHAT_CONTEXT_MENU_WIDTH,
} from '@/components/dorm-hub/ui-constants';
import type { ChatTabProps, ContextMenuState } from './types';

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}

function resolveContextMenuPosition(x: number, y: number) {
  const menuWidth = CHAT_CONTEXT_MENU_WIDTH;
  const menuHeight = CHAT_CONTEXT_MENU_HEIGHT;
  const margin = CHAT_CONTEXT_MENU_MARGIN;
  return {
    x: Math.min(Math.max(margin, x + CHAT_CONTEXT_MENU_OFFSET), window.innerWidth - menuWidth - margin),
    y: Math.min(Math.max(margin, y + CHAT_CONTEXT_MENU_OFFSET), window.innerHeight - menuHeight - margin),
  };
}

export function useChatTabController(props: ChatTabProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendChatRef = useRef(props.onSendChat);
  const maxInputLengthRef = useRef(props.maxInputLength);
  const messageTooLongTextRef = useRef(props.messageTooLongText);

  useEffect(() => {
    sendChatRef.current = props.onSendChat;
  }, [props.onSendChat]);

  useEffect(() => {
    maxInputLengthRef.current = props.maxInputLength;
    messageTooLongTextRef.current = props.messageTooLongText;
  }, [props.maxInputLength, props.messageTooLongText]);

  useEffect(() => {
    if (!contextMenu) return;
    const handleWindowClick = () => setContextMenu(null);
    const handleWindowScroll = () => setContextMenu(null);
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('scroll', handleWindowScroll, true);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('scroll', handleWindowScroll, true);
    };
  }, [contextMenu]);

  const openContextMenu = useCallback((x: number, y: number, messageId: number) => {
    const pos = resolveContextMenuPosition(x, y);
    setContextMenu({ x: pos.x, y: pos.y, messageId });
  }, []);

  const onSubmitChat = useCallback((draft: string) => {
    const text = draft.trim();
    if (text.length > maxInputLengthRef.current) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: messageTooLongTextRef.current } }));
      return false;
    }
    sendChatRef.current(draft);
    return true;
  }, []);

  return {
    contextMenu,
    setContextMenu,
    onSubmitChat,
    onMessageContextMenu: (event: React.MouseEvent<HTMLDivElement>, messageId: number) => {
      event.preventDefault();
      openContextMenu(event.clientX, event.clientY, messageId);
    },
    onMessageTouchStart: (event: React.TouchEvent<HTMLDivElement>, messageId: number) => {
      const touch = event.touches[0];
      if (!touch) return;
      clearTimer(longPressTimerRef);
      longPressTimerRef.current = setTimeout(
        () => openContextMenu(touch.clientX, touch.clientY, messageId),
        CHAT_CONTEXT_LONG_PRESS_MS,
      );
    },
    onMessageTouchMove: () => clearTimer(longPressTimerRef),
    onMessageTouchEnd: () => clearTimer(longPressTimerRef),
  };
}
