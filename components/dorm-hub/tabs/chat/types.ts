import type React from 'react';
import type { RenderedChatMessage } from '@/components/dorm-hub/ui-types';

export type ContextMenuState = { x: number; y: number; messageId: number } | null;

export type ChatTabProps = {
  t: any;
  dormName: string;
  meId: number | null;
  lastPositionChatId: number | null;
  unreadChatCount: number;
  jumpToLastPosition: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onChatListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  renderedLiveMessages: RenderedChatMessage[];
  chatMessageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  newChatHintCount: number;
  jumpToFirstNewChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  onSendChat: (content: string) => void;
  messageTooLongText: string;
  maxInputLength: number;
  isChatContextSelected: (messageId: number) => boolean;
  onToggleChatContextMessage: (messageId: number) => void;
  isChatMessagePrivateForBot: (messageId: number) => boolean;
  onToggleChatPrivacy: (messageId: number) => void;
  addRobotMemoryText: string;
  removeRobotMemoryText: string;
  setPrivateText: string;
  unsetPrivateText: string;
  stopGeneratingText: string;
  onAbortBotStream: (messageId: number) => void;
};

export type ChatMessagesPaneProps = {
  t: any;
  meId: number | null;
  lastPositionChatId: number | null;
  unreadChatCount: number;
  jumpToLastPosition: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onChatListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  renderedLiveMessages: RenderedChatMessage[];
  chatMessageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isChatContextSelected: (messageId: number) => boolean;
  isChatMessagePrivateForBot: (messageId: number) => boolean;
  stopGeneratingText: string;
  onAbortBotStream: (messageId: number) => void;
  onMessageContextMenu: (event: React.MouseEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchStart: (event: React.TouchEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchMove: () => void;
  onMessageTouchEnd: () => void;
};

export type ChatComposerProps = {
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  placeholder: string;
  onSubmit: (text: string) => boolean;
};

export type ChatContextMenuProps = {
  contextMenu: ContextMenuState;
  isSelected: (messageId: number) => boolean;
  isPrivate: (messageId: number) => boolean;
  addText: string;
  removeText: string;
  setPrivateText: string;
  unsetPrivateText: string;
  onClose: () => void;
  onToggle: (messageId: number) => void;
  onTogglePrivacy: (messageId: number) => void;
};
