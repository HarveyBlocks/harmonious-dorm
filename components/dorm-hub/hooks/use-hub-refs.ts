import { useRef } from 'react';
import type { Socket } from 'socket.io-client';

import type { LanguageCode } from '@/lib/i18n';
import type { ActiveTab } from '@/components/dorm-hub/ui-types';

function useHubNodeRefs() {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatMessageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const notificationListRef = useRef<HTMLDivElement>(null);
  const billUnpaidListRef = useRef<HTMLDivElement>(null);
  const billPaidListRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const botAvatarInputRef = useRef<HTMLInputElement>(null);
  const botOtherTextareaRef = useRef<HTMLTextAreaElement>(null);
  return {
    chatEndRef,
    chatScrollRef,
    chatMessageRefs,
    chatInputRef,
    notificationListRef,
    billUnpaidListRef,
    billPaidListRef,
    avatarInputRef,
    botAvatarInputRef,
    botOtherTextareaRef,
  };
}

function useHubRuntimeRefs() {
  const socketRef = useRef<Socket | null>(null);
  const limitToastRef = useRef<Record<string, number>>({});
  const chatAutoScrolledRef = useRef(false);
  const chatAtBottomRef = useRef(true);
  const chatForceBottomOnNextLayoutRef = useRef(false);
  const pendingNewChatIdsRef = useRef<Set<number>>(new Set());
  const lastActiveTabRef = useRef<ActiveTab>('dashboard');
  const lastAutoReadTabRef = useRef<ActiveTab>('dashboard');
  return {
    socketRef,
    limitToastRef,
    chatAutoScrolledRef,
    chatAtBottomRef,
    chatForceBottomOnNextLayoutRef,
    pendingNewChatIdsRef,
    lastActiveTabRef,
    lastAutoReadTabRef,
  };
}

function useHubSyncedDraftRefs() {
  const lastSyncedProfileRef = useRef<{ name: string; language: LanguageCode } | null>(null);
  const lastSyncedDormNameRef = useRef<string>('');
  const lastSyncedBotNameRef = useRef<string>('');
  const lastSyncedBotMemoryWindowRef = useRef<number>(10);
  const lastSyncedBotOtherContentRef = useRef<string>('');
  const lastSyncedBotSettingsRef = useRef<Array<{ key: string; value: string }>>([]);
  const lastSyncedMemberDescriptionsRef = useRef<Record<number, string>>({});
  return {
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
  };
}

export function useHubRefs() {
  return {
    ...useHubNodeRefs(),
    ...useHubRuntimeRefs(),
    ...useHubSyncedDraftRefs(),
  };
}
