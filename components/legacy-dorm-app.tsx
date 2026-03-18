'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Socket } from 'socket.io-client';

import { apiRequest } from '@/lib/client-api';
import { getUiText, LANG_OPTIONS, type LanguageCode } from '@/lib/i18n';
import { LIMITS } from '@/lib/limits';
import type { BillSummary, CursorPage, DormState, DutyItem, MePayload, NotificationPayload } from '@/lib/types';
import { LineChartCard, PieChartCard } from '@/components/legacy-app/charts';
import {
  BILL_CATEGORIES,
  BILL_PAGE_LIMIT,
  CHAT_PAGE_LIMIT,
} from '@/components/legacy-app/constants';
import {
  dispatchToast,
  isChatNearBottom,
  mapPathToTab,
  mapTabToPath,
  mergeChatMessages,
  parseStatusSystemMessage,
  resolveAvatar,
  settingsFoldLabel,
  todayText,
} from '@/components/legacy-app/helpers';
import { localizeServerText } from '@/components/legacy-app/localization';
import { NoticePopup } from '@/components/legacy-app/notice-popup';
import { useChatInput } from '@/components/legacy-app/hooks/use-chat-input';
import { useChatWindow } from '@/components/legacy-app/hooks/use-chat-window';
import { useDormSocket } from '@/components/legacy-app/hooks/use-dorm-socket';
import { useInfiniteScrollTrigger } from '@/components/legacy-app/hooks/use-infinite-scroll-trigger';
import { useDomainMutations } from '@/components/legacy-app/hooks/use-domain-mutations';
import { useNoticeAuthMutations } from '@/components/legacy-app/hooks/use-notice-auth-mutations';
import { useNotificationSelection } from '@/components/legacy-app/hooks/use-notification-selection';
import { useSettingsAutoSave } from '@/components/legacy-app/hooks/use-settings-auto-save';
import { useSettingsMutations } from '@/components/legacy-app/hooks/use-settings-mutations';
import { useSettingsSaveActions } from '@/components/legacy-app/hooks/use-settings-save-actions';
import { useTabAutoRead } from '@/components/legacy-app/hooks/use-tab-auto-read';
import { useTabPrefetch } from '@/components/legacy-app/hooks/use-tab-prefetch';
import {
  BotSettingsSection,
  DormSettingsSection,
  MemberSettingsSection,
  SecuritySettingsSection,
  UserSettingsSection,
} from '@/components/legacy-app/settings';
import { SideNav } from '@/components/legacy-app/side-nav';
import { ChatTab, DashboardTab, DutyTab, NotificationsTab, WalletTab } from '@/components/legacy-app/tabs';
import { TopHeader } from '@/components/legacy-app/top-header';
import { buildErrorText, buildPanelText, buildSettingsText, calcMonthTotal, calcPreviewAmounts, groupBillsByMonth, groupDutiesByWeek, mapBillChartViewModel, mapDutyChartViewModel, splitDutyLists } from '@/components/legacy-app/view-models';
import type {
  ActiveTab,
  ChartPoint,
  ChatMessage,
  LineSeries,
  LineGranularity,
  NotificationFilter,
  PeriodType,
  RenderedChatMessage,
  SettingsSectionKey,
} from '@/components/legacy-app/types';




export default function LegacyDormApp() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => mapPathToTab(pathname || '/'));
  const [selectedState, setSelectedState] = useState<DormState>('out');
  const [assignUserId, setAssignUserId] = useState<number | null>(null);
  const [assignDate, setAssignDate] = useState(todayText());
  const [dutyTask, setDutyTask] = useState('');
  const [billTotal, setBillTotal] = useState('');
  const [billCategory, setBillCategory] = useState('electricity');
  const [customCategory, setCustomCategory] = useState('');
  const [billUseWeights, setBillUseWeights] = useState(false);
  const [participants, setParticipants] = useState<number[]>([]);
  const [participantWeights, setParticipantWeights] = useState<Record<number, string>>({});
  const [chatInput, setChatInput] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [newChatHintCount, setNewChatHintCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [billPeriodType, setBillPeriodType] = useState<PeriodType>('month');
  const [billYear, setBillYear] = useState(`${new Date().getFullYear()}`);
  const [billPeriodMarker, setBillPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [billLineGranularity, setBillLineGranularity] = useState<LineGranularity>('day');
  const [dutyPeriodType, setDutyPeriodType] = useState<PeriodType>('month');
  const [dutyYear, setDutyYear] = useState(`${new Date().getFullYear()}`);
  const [dutyPeriodMarker, setDutyPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [dutyLineGranularity, setDutyLineGranularity] = useState<LineGranularity>('day');
  const [showAllDoneDuty, setShowAllDoneDuty] = useState(false);
  const [noticePopup, setNoticePopup] = useState<{ title: string; content: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<SettingsSectionKey, boolean>>({
    user: false,
    dorm: false,
    member: false,
    bot: false,
    security: false,
  });

  const [name, setName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('zh-CN');
  const [dormNameInput, setDormNameInput] = useState('');
  const [botNameInput, setBotNameInput] = useState('');
  const [botSettingsInput, setBotSettingsInput] = useState<Array<{ key: string; value: string }>>([]);
  const [botOtherContent, setBotOtherContent] = useState('');
  const [botOtherEditing, setBotOtherEditing] = useState(false);
  const [memberDescriptionsInput, setMemberDescriptionsInput] = useState<Record<number, string>>({});
  const [targetLeaderId, setTargetLeaderId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [botAvatarFile, setBotAvatarFile] = useState<File | null>(null);

  const socketRef = useRef<Socket | null>(null);
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
  const limitToastRef = useRef<Record<string, number>>({});
  const chatAutoScrolledRef = useRef(false);
  const chatAtBottomRef = useRef(true);
  const chatForceBottomOnNextLayoutRef = useRef(false);
  const pendingNewChatIdsRef = useRef<Set<number>>(new Set());
  const lastActiveTabRef = useRef<ActiveTab>('dashboard');
  const lastAutoReadTabRef = useRef<ActiveTab>('dashboard');
  const lastSyncedProfileRef = useRef<{ name: string; language: LanguageCode } | null>(null);
  const lastSyncedDormNameRef = useRef<string>('');
  const lastSyncedBotNameRef = useRef<string>('');
  const lastSyncedBotOtherContentRef = useRef<string>('');
  const lastSyncedBotSettingsRef = useRef<Array<{ key: string; value: string }>>([]);
  const lastSyncedMemberDescriptionsRef = useRef<Record<number, string>>({});

  const toggleSettingsSection = useCallback((section: SettingsSectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const tryApplyLimitedInput = useCallback(
    (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => {
      if (value.length > max) {
        const now = Date.now();
        const last = limitToastRef.current[key] || 0;
        if (now - last > 800) {
          dispatchToast('error', message);
          limitToastRef.current[key] = now;
        }
        return false;
      }
      apply(value);
      return true;
    },
    [],
  );

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<MePayload>('/api/users/me'),
  });
  const authReady = Boolean(meQuery.data?.id);

  const dutyAllQuery = useInfiniteQuery({
    queryKey: ['duty', 'all'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<DutyItem>>(
        `/api/duty?scope=all&limit=8${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const billsQuery = useInfiniteQuery({
    queryKey: ['bills'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<BillSummary>>(`/api/bills?limit=${BILL_PAGE_LIMIT}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const chatQuery = useInfiniteQuery({
    queryKey: ['chat'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<ChatMessage>>(`/api/chat?limit=${CHAT_PAGE_LIMIT}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const statusQuery = useQuery({
    queryKey: ['status'],
    queryFn: () => apiRequest<Array<{ userId: number; state: DormState }>>('/api/status'),
    enabled: authReady,
  });

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications', notificationFilter],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<NotificationPayload>>(
        `/api/notifications?status=${notificationFilter}&limit=10${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const notificationsUnreadQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => apiRequest<CursorPage<NotificationPayload>>('/api/notifications?status=unread&limit=60'),
    enabled: authReady,
  });

  const chatAnchorNoticeQuery = useQuery({
    queryKey: ['notifications-chat-anchor'],
    queryFn: () => apiRequest<{ oldestUnreadChatNotificationTime: string | null }>('/api/notifications/chat-anchor'),
    enabled: authReady,
  });

  const chatAnchorQuery = useQuery({
    queryKey: ['chat-anchor-id', chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime],
    queryFn: () =>
      apiRequest<{ anchorId: number | null }>(
        `/api/chat/anchor?from=${encodeURIComponent(chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime || '')}`,
      ),
    enabled: authReady && Boolean(chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime),
  });

  const billStatsQuery = useQuery({
    queryKey: ['stats-bills', billPeriodType, billYear, billPeriodMarker, billLineGranularity],
    queryFn: () =>
      apiRequest<{
        pieData: ChartPoint[];
        lineData: ChartPoint[];
        categoryLineSeries: LineSeries[];
      }>(
        `/api/stats/bills?periodType=${billPeriodType}&year=${encodeURIComponent(billYear)}&marker=${billPeriodMarker}&lineGranularity=${billLineGranularity}`,
      ),
    enabled: authReady,
  });

  const dutyStatsQuery = useQuery({
    queryKey: ['stats-duty', dutyPeriodType, dutyYear, dutyPeriodMarker, dutyLineGranularity],
    queryFn: () =>
      apiRequest<{
        pieData: ChartPoint[];
        memberPieData: ChartPoint[];
        lineData: ChartPoint[];
        memberLineSeries: LineSeries[];
      }>(
        `/api/stats/duty?periodType=${dutyPeriodType}&year=${encodeURIComponent(dutyYear)}&marker=${dutyPeriodMarker}&lineGranularity=${dutyLineGranularity}`,
      ),
    enabled: authReady,
  });


  useLayoutEffect(() => {
    if (activeTab !== 'chat' || !chatScrollRef.current || liveMessages.length === 0) return;
    const container = chatScrollRef.current;
    if (chatPrependStateRef.current.pending) {
      const { prevHeight, prevTop } = chatPrependStateRef.current;
      const nextHeight = container.scrollHeight;
      const nextTop = Math.max(0, nextHeight - prevHeight + prevTop);
      container.scrollTop = nextTop;
      chatPrependStateRef.current.pending = false;
      return;
    }
    if (chatForceBottomOnNextLayoutRef.current) {
      container.scrollTop = container.scrollHeight;
      chatForceBottomOnNextLayoutRef.current = false;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      return;
    }
    if (!chatAutoScrolledRef.current) {
      container.scrollTop = container.scrollHeight;
      chatAutoScrolledRef.current = true;
      chatAtBottomRef.current = true;
      return;
    }
    const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
      chatAtBottomRef.current = true;
      if (pendingNewChatIdsRef.current.size > 0) {
        pendingNewChatIdsRef.current.clear();
        setNewChatHintCount(0);
      }
      return;
    }
    chatAtBottomRef.current = false;
    const pending = pendingNewChatIdsRef.current;
    if (pending.size > 0) {
      const viewportBottom = container.scrollTop + container.clientHeight;
      const seenIds: number[] = [];
      pending.forEach((id) => {
        const node = chatMessageRefs.current[id];
        if (!node) return;
        if (node.offsetTop <= viewportBottom - 8) {
          seenIds.push(id);
        }
      });
      if (seenIds.length > 0) {
        for (const id of seenIds) {
          pending.delete(id);
        }
        setNewChatHintCount(pending.size);
      }
    }
  }, [activeTab, liveMessages.length]);

  useEffect(() => {
    if (!assignUserId && meQuery.data?.members.length) {
      setAssignUserId(meQuery.data.members[0].id);
      setParticipants(meQuery.data.members.map((item) => item.id));
    }
  }, [assignUserId, meQuery.data]);

  useEffect(() => {
    if (meQuery.data) {
      setName(meQuery.data.name);
      setLanguage(meQuery.data.language);
      setDormNameInput(meQuery.data.dormName);
      setBotNameInput(meQuery.data.botName || '');
      setBotSettingsInput(meQuery.data.botSettings || []);
      setBotOtherContent(meQuery.data.botOtherContent || '');
      setMemberDescriptionsInput(
        Object.fromEntries((meQuery.data.members || []).map((member) => [member.id, member.description || ''])),
      );
      lastSyncedProfileRef.current = {
        name: meQuery.data.name.trim(),
        language: meQuery.data.language,
      };
      lastSyncedDormNameRef.current = meQuery.data.dormName.trim();
      lastSyncedBotNameRef.current = (meQuery.data.botName || '').trim();
      lastSyncedBotOtherContentRef.current = meQuery.data.botOtherContent || '';
      lastSyncedBotSettingsRef.current = meQuery.data.botSettings || [];
      lastSyncedMemberDescriptionsRef.current = Object.fromEntries(
        (meQuery.data.members || []).map((member) => [member.id, member.description || '']),
      );
      if (!targetLeaderId) {
        const candidate = meQuery.data.members.find((item) => !item.isLeader);
        setTargetLeaderId(candidate?.id || null);
      }
    }
  }, [meQuery.data, targetLeaderId]);

  useEffect(() => {
    const myId = meQuery.data?.id;
    if (!myId) return;
    const mine = (statusQuery.data || []).find((item) => item.userId === myId);
    if (mine?.state) {
      setSelectedState(mine.state);
    }
  }, [meQuery.data?.id, statusQuery.data]);

  const me = meQuery.data;
  const t = getUiText(me?.language || 'zh-CN');
  const copyInviteCode = async () => {
    const code = me?.inviteCode;
    if (!code || typeof window === 'undefined') return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'success', message: t.inviteCodeCopied },
        }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'error', message: t.requestFailed },
        }),
      );
    }
  };
  const {
    changeAvatarTitle,
    botLabel,
    botNamePlaceholder,
    changeBotAvatarTitle,
    botSettingsLabel,
    memberDescLabel,
    memberDescPlaceholder,
    botOtherContentLabel,
    botOtherContentPlaceholder,
    botSettingKeyLabel,
    botSettingValueLabel,
    addFieldLabel,
    removeFieldLabel,
  } = useMemo(() => buildSettingsText(me?.language), [me?.language]);
  const eText = useMemo(() => buildErrorText(me?.language, t), [me?.language, t]);

  const displayUsers = useMemo(() => {
    const statusMap = new Map((statusQuery.data || []).map((item) => [item.userId, item.state as DormState]));
    return (me?.members || []).map((member) => ({
      id: member.id,
      name: member.name,
      avatar: resolveAvatar(member.avatarPath, member.id),
      role: member.isLeader ? 'leader' : 'member',
      state: statusMap.get(member.id) || 'out',
      status: member.isLeader ? 'online' : 'busy',
    }));
  }, [me, statusQuery.data]);
  const memberAvatarMap = useMemo(() => {
    const map = new Map<number, string>();
    (me?.members || []).forEach((member) => {
      map.set(member.id, resolveAvatar(member.avatarPath, member.id));
    });
    return map;
  }, [me?.members]);

  const themeClass = useMemo(() => {
    let classes = selectedState === 'sleep' ? 'dark-mode' : '';
    if (selectedState === 'study') classes += ' study-mode';
    if (selectedState === 'game') classes += ' party-mode';
    return classes;
  }, [selectedState]);
  const billsRows = useMemo(() => billsQuery.data?.pages.flatMap((page) => page.items) || [], [billsQuery.data?.pages]);
  const dutyRows = useMemo(() => dutyAllQuery.data?.pages.flatMap((page) => page.items) || [], [dutyAllQuery.data?.pages]);
  const billListRows = useMemo(
    () => [...billsRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [billsRows],
  );
  const dutyListRows = useMemo(
    () => [...dutyRows].sort((a, b) => (a.date === b.date ? b.dutyId - a.dutyId : b.date.localeCompare(a.date))),
    [dutyRows],
  );
  const notificationRows = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) || [],
    [notificationsQuery.data?.pages],
  );
  const {
    menuOpen: notificationMenuOpen,
    setMenuOpen: setNotificationMenuOpen,
    isChecked: isNoticeChecked,
    selectedCount: selectedNoticeCount,
    selectionPayload,
    toggleSelect: toggleNoticeSelect,
    selectAllRows: setNoticeSelectAll,
    clearSelection: clearNoticeSelection,
  } = useNotificationSelection({
    filterKey: notificationFilter,
    totalRowCount: notificationRows.length,
  });
  const renderedLiveMessages = useMemo<RenderedChatMessage[]>(() => {
    const lang = me?.language || 'zh-CN';
    return liveMessages.map((msg) => {
      const isStatusMessage = Boolean(parseStatusSystemMessage(msg.content));
      const isBotMessage = Boolean(me?.botId && msg.userId === me.botId);
      return {
        ...msg,
        isStatusMessage,
        isBotMessage,
        localizedContent: localizeServerText(lang, msg.content),
        avatar: isBotMessage ? resolveAvatar(me?.botAvatarPath, msg.userId) : memberAvatarMap.get(msg.userId) || resolveAvatar(null, msg.userId),
      };
    });
  }, [liveMessages, me?.botAvatarPath, me?.botId, me?.language, memberAvatarMap]);

  const monthTotal = useMemo(() => calcMonthTotal(billsRows), [billsRows]);
  const previewAmounts = useMemo(
    () => calcPreviewAmounts(billTotal, participants, participantWeights),
    [billTotal, participants, participantWeights],
  );
  const {
    assignMutation,
    toggleDutyMutation,
    deleteDutyMutation,
    createBillMutation,
    togglePaidMutation,
    updateStatusMutation,
    sendChatMutation,
  } = useDomainMutations({
    queryClient,
    eText,
    assignUserId,
    assignDate,
    dutyTask,
    setDutyTask,
    billTotal,
    billCategory,
    customCategory,
    participants,
    participantWeights,
    billUseWeights,
    setBillTotal,
    setCustomCategory,
    setBillUseWeights,
    setParticipantWeights,
    chatInput,
    setChatInput,
  });

  const { onChatInputKeyDown, onChatInputChange } = useChatInput({
    chatInput,
    setChatInput,
    maxLength: LIMITS.CHAT_USER_CONTENT,
    tooLongMessage: eText.messageTooLong,
    tryApplyLimitedInput,
    onSend: () => sendChatMutation.mutate(),
  });

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
      const top = node.offsetTop;
      if (top <= viewportBottom - 8) {
        seenIds.push(id);
      }
    });
    if (seenIds.length === 0) return;
    for (const id of seenIds) {
      pending.delete(id);
    }
    setNewChatHintCount(pending.size);
  }, []);

  const {
    chatWindowMode,
    setChatOlderCursor,
    setChatNewerCursor,
    setChatHasOlder,
    setChatHasNewer,
    chatPrependStateRef,
    unreadChatCount,
    lastPositionChatId,
    jumpToLastPosition,
    resetChatToLatest,
    onChatListScroll,
  } = useChatWindow({
    unreadRows: notificationsUnreadQuery.data?.items || [],
    anchorId: chatAnchorQuery.data?.anchorId || null,
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

  useEffect(() => {
    if (chatWindowMode) return;
    if (!chatQuery.data?.pages) return;
    const merged = chatQuery.data.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items);
    setLiveMessages((prev) => mergeChatMessages(prev, merged));
  }, [chatQuery.dataUpdatedAt, chatWindowMode]);

  const jumpToFirstNewChat = useCallback(() => {
    const pendingIds = [...pendingNewChatIdsRef.current].sort((a, b) => a - b);
    if (pendingIds.length === 0) return;
    const firstId = pendingIds[0];
    const node = chatMessageRefs.current[firstId];
    if (!node) return;
    node.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setTimeout(() => {
      syncSeenNewChatHint();
    }, 180);
  }, [syncSeenNewChatHint]);

  const {
    updateProfileMutation,
    updateDormMutation,
    updateBotMutation,
    updateBotSettingsMutation,
    updateDescriptionsMutation,
    transferMutation,
    uploadAvatarMutation,
    uploadBotAvatarMutation,
  } = useSettingsMutations({
    queryClient,
    eText,
    targetLeaderId,
    setAvatarFile,
    setBotAvatarFile,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
  });

  const {
    readNoticeMutation,
    readSelectedNoticeMutation,
    deleteSelectedNoticeMutation,
    autoReadByTypeMutation,
    deleteNoticeMutation,
    logoutMutation,
    deleteAccountMutation,
  } = useNoticeAuthMutations({
    queryClient,
    notificationFilter,
    socketRef,
  });

  useDormSocket({
    dormId: meQuery.data?.dormId,
    meId: meQuery.data?.id,
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
  });


  const {
    saveProfileNow,
    saveDormNow,
    saveBotNow,
    saveBotSettingsNow,
    saveMemberDescriptionsNow,
    saveAvatarNow,
    saveBotAvatarNow,
  } = useSettingsSaveActions({
    me,
    name,
    setName,
    language,
    dormNameInput,
    setDormNameInput,
    botNameInput,
    setBotNameInput,
    botOtherContent,
    botSettingsInput,
    memberDescriptionsInput,
    avatarFile,
    botAvatarFile,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
    updateProfileMutation,
    updateDormMutation,
    updateBotMutation,
    updateBotSettingsMutation,
    updateDescriptionsMutation,
    uploadAvatarMutation,
    uploadBotAvatarMutation,
  });

  useSettingsAutoSave({
    activeTab,
    isLeader: Boolean(me?.isLeader),
    hasMe: Boolean(me),
    botOtherEditing,
    botOtherTextareaRef,
    name,
    language,
    dormNameInput,
    botNameInput,
    botOtherContent,
    botSettingsInput,
    memberDescriptionsInput,
    avatarFile,
    botAvatarFile,
    saveProfileNow,
    saveDormNow,
    saveBotNow,
    saveBotSettingsNow,
    saveMemberDescriptionsNow,
    saveAvatarNow,
    saveBotAvatarNow,
  });

  useEffect(() => {
    if (activeTab === 'chat') {
      chatAutoScrolledRef.current = false;
      requestAnimationFrame(() => {
        const container = chatScrollRef.current;
        if (!container) return;
        const nearBottom = isChatNearBottom(container);
        chatAtBottomRef.current = nearBottom;
        if (nearBottom && pendingNewChatIdsRef.current.size > 0) {
          pendingNewChatIdsRef.current.clear();
          setNewChatHintCount(0);
          return;
        }
        const pending = pendingNewChatIdsRef.current;
        if (pending.size === 0) return;
        const viewportBottom = container.scrollTop + container.clientHeight;
        const seenIds: number[] = [];
        pending.forEach((id) => {
          const node = chatMessageRefs.current[id];
          if (!node) return;
          if (node.offsetTop <= viewportBottom - 8) {
            seenIds.push(id);
          }
        });
        if (seenIds.length === 0) return;
        for (const id of seenIds) {
          pending.delete(id);
        }
        setNewChatHintCount(pending.size);
      });
    }
  }, [activeTab]);

  useTabAutoRead({
    activeTab,
    lastAutoReadTabRef,
    mutate: (type) => autoReadByTypeMutation.mutate(type),
  });

  useEffect(() => {
    setActiveTab(mapPathToTab(pathname || '/'));
  }, [pathname]);

  useEffect(() => {
    lastActiveTabRef.current = activeTab;
  }, [activeTab]);

  const navigateToTab = useCallback(
    (tab: ActiveTab) => {
      const targetPath = mapTabToPath(tab);
      setActiveTab(tab);
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    },
    [pathname, router],
  );

  const onNoticeListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(notificationsQuery.hasNextPage),
    isFetchingNextPage: notificationsQuery.isFetchingNextPage,
    fetchNextPage: () => notificationsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onBillUnpaidListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(billsQuery.hasNextPage),
    isFetchingNextPage: billsQuery.isFetchingNextPage,
    fetchNextPage: () => billsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onBillPaidListScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(billsQuery.hasNextPage),
    isFetchingNextPage: billsQuery.isFetchingNextPage,
    fetchNextPage: () => billsQuery.fetchNextPage(),
    threshold: 80,
  });

  const onPendingDutyScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(dutyAllQuery.hasNextPage),
    isFetchingNextPage: dutyAllQuery.isFetchingNextPage,
    fetchNextPage: () => dutyAllQuery.fetchNextPage(),
    threshold: 80,
  });

  const onDoneDutyScroll = useInfiniteScrollTrigger({
    hasNextPage: Boolean(dutyAllQuery.hasNextPage),
    isFetchingNextPage: dutyAllQuery.isFetchingNextPage,
    fetchNextPage: () => dutyAllQuery.fetchNextPage(),
    threshold: 80,
    beforeFetch: () => {
      if (!showAllDoneDuty) setShowAllDoneDuty(true);
    },
  });

  const dormName = me?.dormName || t.dormTitle;
  const meId = me?.id ?? null;
  const notificationAllRows = notificationRows;
  const notificationVisibleRows = notificationAllRows;
  const unreadNoticeCount = useMemo(
    () => (notificationsUnreadQuery.data?.items || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [notificationsUnreadQuery.data?.items],
  );
  useEffect(() => {
    if (activeTab !== 'chat') {
      resetChatToLatest();
    }
  }, [activeTab, resetChatToLatest]);
  const pText = useMemo(() => buildPanelText(me?.language), [me?.language]);

  const { billPieData, billLineData, billCategoryLineSeries } = useMemo(
    () =>
      mapBillChartViewModel(me?.language, {
        pieData: billStatsQuery.data?.pieData,
        lineData: billStatsQuery.data?.lineData,
        categoryLineSeries: billStatsQuery.data?.categoryLineSeries,
      }),
    [billStatsQuery.data?.categoryLineSeries, billStatsQuery.data?.lineData, billStatsQuery.data?.pieData, me?.language],
  );

  const { pending: pendingDutyList, done: doneDutyList } = useMemo(() => splitDutyLists(dutyListRows), [dutyListRows]);
  const visiblePendingDutyList = pendingDutyList;
  const effectiveDoneLimit = showAllDoneDuty ? doneDutyList.length : 5;
  const doneDutyPreview = useMemo(() => doneDutyList.slice(0, effectiveDoneLimit), [doneDutyList, effectiveDoneLimit]);

  const groupedUnpaidBills = useMemo(() => groupBillsByMonth(billListRows, false), [billListRows]);
  const unpaidBillCount = useMemo(
    () => groupedUnpaidBills.reduce((sum, [, items]) => sum + items.length, 0),
    [groupedUnpaidBills],
  );

  const groupedPaidBills = useMemo(() => groupBillsByMonth(billListRows, true), [billListRows]);

  const groupedPendingDuties = useMemo(() => groupDutiesByWeek(visiblePendingDutyList), [visiblePendingDutyList]);

  const groupedDoneDuties = useMemo(() => groupDutiesByWeek(doneDutyPreview), [doneDutyPreview]);

  const { dutyPieData, dutyLineData, dutyByMemberPieData, dutyMemberLineSeries } = useMemo(
    () =>
      mapDutyChartViewModel(me?.language, {
        pieData: dutyStatsQuery.data?.pieData,
        memberPieData: dutyStatsQuery.data?.memberPieData,
        lineData: dutyStatsQuery.data?.lineData,
        memberLineSeries: dutyStatsQuery.data?.memberLineSeries,
      }),
    [dutyStatsQuery.data?.lineData, dutyStatsQuery.data?.memberLineSeries, dutyStatsQuery.data?.memberPieData, dutyStatsQuery.data?.pieData, me?.language],
  );

  useTabPrefetch({
    activeTab,
    billsHasNextPage: Boolean(billsQuery.hasNextPage),
    billsIsFetchingNextPage: billsQuery.isFetchingNextPage,
    fetchNextBills: () => {
      billsQuery.fetchNextPage();
    },
    billsRowCount: billsRows.length,
    unpaidBillCount,
    paidBillGroupCount: groupedPaidBills.length,
    dutyHasNextPage: Boolean(dutyAllQuery.hasNextPage),
    dutyIsFetchingNextPage: dutyAllQuery.isFetchingNextPage,
    fetchNextDuty: () => {
      dutyAllQuery.fetchNextPage();
    },
    pendingDutyGroupCount: groupedPendingDuties.length,
    doneDutyGroupCount: groupedDoneDuties.length,
    notificationRowCount: notificationRows.length,
    noticeHasNextPage: Boolean(notificationsQuery.hasNextPage),
    noticeIsFetchingNextPage: notificationsQuery.isFetchingNextPage,
    fetchNextNotices: () => {
      notificationsQuery.fetchNextPage();
    },
    unpaidListRef: billUnpaidListRef,
    paidListRef: billPaidListRef,
  });

  return (
    <div className={`min-h-screen app-shell ${themeClass}`}>
      <NoticePopup
        popup={noticePopup}
        popupLabel={pText.popupNewNotice}
        language={me?.language || 'zh-CN'}
        onClose={() => setNoticePopup(null)}
      />
      <SideNav
        t={t}
        activeTab={activeTab}
        unreadNoticeCount={unreadNoticeCount}
        avatarPath={me?.avatarPath}
        meId={meId || 0}
        onNavigate={navigateToTab}
      />

      <main className="pb-24 md:pb-8 md:pl-24 lg:pl-72 p-4 md:p-8 max-w-7xl mx-auto">
        <TopHeader
          t={t}
          dormName={dormName}
          meName={me?.name}
          language={me?.language || 'zh-CN'}
          selectedState={selectedState}
          onChangeState={(state) => {
            setSelectedState(state);
            updateStatusMutation.mutate(state);
          }}
        />

        <AnimatePresence initial={false}>
          {activeTab === 'dashboard' && (
            <DashboardTab
              t={t}
              me={me}
              displayUsers={displayUsers}
            />
          )}

          {activeTab === 'duty' && (
            <DutyTab
              t={t}
              pText={pText}
              me={me}
              meId={me?.id}
              selectedState={selectedState}
              groupedPendingDuties={groupedPendingDuties}
              groupedDoneDuties={groupedDoneDuties}
              doneDutyList={doneDutyList}
              showAllDoneDuty={showAllDoneDuty}
              setShowAllDoneDuty={setShowAllDoneDuty}
              onPendingDutyScroll={onPendingDutyScroll}
              onDoneDutyScroll={onDoneDutyScroll}
              toggleDutyMutation={toggleDutyMutation}
              deleteDutyMutation={deleteDutyMutation}
              assignUserId={assignUserId}
              setAssignUserId={setAssignUserId}
              assignDate={assignDate}
              setAssignDate={setAssignDate}
              dutyTask={dutyTask}
              setDutyTask={setDutyTask}
              tryApplyLimitedInput={tryApplyLimitedInput}
              eText={eText}
              LIMITS={LIMITS}
              assignMutation={assignMutation}
              dutyPeriodType={dutyPeriodType}
              setDutyPeriodType={setDutyPeriodType}
              dutyYear={dutyYear}
              setDutyYear={setDutyYear}
              dutyPeriodMarker={dutyPeriodMarker}
              setDutyPeriodMarker={setDutyPeriodMarker}
              dutyLineGranularity={dutyLineGranularity}
              setDutyLineGranularity={setDutyLineGranularity}
              dutyPieData={dutyPieData}
              dutyByMemberPieData={dutyByMemberPieData}
              dutyLineData={dutyLineData}
              dutyMemberLineSeries={dutyMemberLineSeries}
            />
          )}

          {activeTab === 'chat' && (
            <ChatTab
              t={t}
              dormName={dormName}
              meId={meId}
              lastPositionChatId={lastPositionChatId}
              unreadChatCount={unreadChatCount}
              jumpToLastPosition={jumpToLastPosition}
              chatScrollRef={chatScrollRef}
              onChatListScroll={onChatListScroll}
              renderedLiveMessages={renderedLiveMessages}
              chatMessageRefs={chatMessageRefs}
              newChatHintCount={newChatHintCount}
              jumpToFirstNewChat={jumpToFirstNewChat}
              chatEndRef={chatEndRef}
              chatInputRef={chatInputRef}
              chatInput={chatInput}
              onChatInputChange={onChatInputChange}
              onChatInputKeyDown={onChatInputKeyDown}
              onSendChat={() => sendChatMutation.mutate()}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletTab
              t={t}
              pText={pText}
              me={me}
              selectedState={selectedState}
              billsRows={billsRows}
              monthTotal={monthTotal}
              groupedUnpaidBills={groupedUnpaidBills}
              groupedPaidBills={groupedPaidBills}
              billUnpaidListRef={billUnpaidListRef}
              billPaidListRef={billPaidListRef}
              onBillUnpaidListScroll={onBillUnpaidListScroll}
              onBillPaidListScroll={onBillPaidListScroll}
              togglePaidMutation={togglePaidMutation}
              billTotal={billTotal}
              setBillTotal={setBillTotal}
              billCategory={billCategory}
              setBillCategory={setBillCategory}
              customCategory={customCategory}
              setCustomCategory={setCustomCategory}
              billUseWeights={billUseWeights}
              setBillUseWeights={setBillUseWeights}
              participants={participants}
              setParticipants={setParticipants}
              participantWeights={participantWeights}
              setParticipantWeights={setParticipantWeights}
              previewAmounts={previewAmounts}
              tryApplyLimitedInput={tryApplyLimitedInput}
              eText={eText}
              LIMITS={LIMITS}
              createBillMutation={createBillMutation}
              billPeriodType={billPeriodType}
              setBillPeriodType={setBillPeriodType}
              billYear={billYear}
              setBillYear={setBillYear}
              billPeriodMarker={billPeriodMarker}
              setBillPeriodMarker={setBillPeriodMarker}
              billLineGranularity={billLineGranularity}
              setBillLineGranularity={setBillLineGranularity}
              billPieData={billPieData}
              billLineData={billLineData}
              billCategoryLineSeries={billCategoryLineSeries}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsTab
              t={t}
              language={me?.language || 'zh-CN'}
              selectedNoticeCount={selectedNoticeCount}
              notificationMenuOpen={notificationMenuOpen}
              onToggleMenu={() => setNotificationMenuOpen((prev) => !prev)}
              onCloseMenu={() => setNotificationMenuOpen(false)}
              onSelectAll={setNoticeSelectAll}
              onMarkSelectedRead={() => {
                readSelectedNoticeMutation.mutate(selectionPayload, {
                  onSuccess: () => {
                    clearNoticeSelection();
                  },
                });
              }}
              onDeleteSelected={() => {
                deleteSelectedNoticeMutation.mutate(selectionPayload, {
                  onSuccess: () => {
                    clearNoticeSelection();
                  },
                });
              }}
              markSelectedDisabled={selectedNoticeCount === 0 || readSelectedNoticeMutation.isPending}
              deleteSelectedDisabled={selectedNoticeCount === 0 || deleteSelectedNoticeMutation.isPending}
              notificationFilter={notificationFilter}
              onFilterChange={setNotificationFilter}
              notificationListRef={notificationListRef}
              onNoticeListScroll={onNoticeListScroll}
              notices={notificationVisibleRows}
              onOpenNotice={(notice) => {
                if (!notice.isRead) {
                  readNoticeMutation.mutate(notice.id);
                }
                if (notice.targetPath) {
                  const tab = mapPathToTab(notice.targetPath);
                  const targetPath = mapTabToPath(tab);
                  setActiveTab(tab);
                  if (pathname !== targetPath) {
                    router.push(targetPath);
                  }
                }
              }}
              onToggleSelect={toggleNoticeSelect}
              isChecked={isNoticeChecked}
            />
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" animate={{ opacity: 1 }} className="space-y-8">
              <UserSettingsSection
                t={t}
                me={me}
                meId={meId || 0}
                folded={collapsedSections.user}
                toggleLabel={settingsFoldLabel(language, collapsedSections.user)}
                onToggle={() => toggleSettingsSection('user')}
                avatarInputRef={avatarInputRef}
                changeAvatarTitle={changeAvatarTitle}
                setAvatarFile={setAvatarFile}
                name={name}
                setName={setName}
                language={language}
                setLanguage={setLanguage}
                tryApplyLimitedInput={tryApplyLimitedInput}
                eText={eText}
              />

              <DormSettingsSection
                t={t}
                me={me}
                folded={collapsedSections.dorm}
                toggleLabel={settingsFoldLabel(language, collapsedSections.dorm)}
                onToggle={() => toggleSettingsSection('dorm')}
                copyInviteCode={copyInviteCode}
                dormNameInput={dormNameInput}
                setDormNameInput={setDormNameInput}
                tryApplyLimitedInput={tryApplyLimitedInput}
                eText={eText}
                targetLeaderId={targetLeaderId}
                setTargetLeaderId={setTargetLeaderId}
                transferMutation={transferMutation}
              />

              <MemberSettingsSection
                t={t}
                me={me}
                folded={collapsedSections.member}
                title={memberDescLabel}
                toggleLabel={settingsFoldLabel(language, collapsedSections.member)}
                onToggle={() => toggleSettingsSection('member')}
                memberDescriptionsInput={memberDescriptionsInput}
                setMemberDescriptionsInput={setMemberDescriptionsInput}
                memberDescPlaceholder={memberDescPlaceholder}
                tryApplyLimitedInput={tryApplyLimitedInput}
                eText={eText}
              />

              <BotSettingsSection
                me={me}
                folded={collapsedSections.bot}
                title={botLabel}
                toggleLabel={settingsFoldLabel(language, collapsedSections.bot)}
                onToggle={() => toggleSettingsSection('bot')}
                botAvatarInputRef={botAvatarInputRef}
                changeBotAvatarTitle={changeBotAvatarTitle}
                setBotAvatarFile={setBotAvatarFile}
                botNameInput={botNameInput}
                setBotNameInput={setBotNameInput}
                botNamePlaceholder={botNamePlaceholder}
                tryApplyLimitedInput={tryApplyLimitedInput}
                eText={eText}
                botSettingsLabel={botSettingsLabel}
                botSettingsInput={botSettingsInput}
                setBotSettingsInput={setBotSettingsInput}
                addFieldLabel={addFieldLabel}
                removeFieldLabel={removeFieldLabel}
                botSettingKeyLabel={botSettingKeyLabel}
                botSettingValueLabel={botSettingValueLabel}
                botOtherContentLabel={botOtherContentLabel}
                botOtherEditing={botOtherEditing}
                setBotOtherEditing={setBotOtherEditing}
                botOtherTextareaRef={botOtherTextareaRef}
                botOtherContent={botOtherContent}
                setBotOtherContent={setBotOtherContent}
                botOtherContentPlaceholder={botOtherContentPlaceholder}
                dispatchToast={dispatchToast}
              />

              <SecuritySettingsSection
                t={t}
                folded={collapsedSections.security}
                toggleLabel={settingsFoldLabel(language, collapsedSections.security)}
                onToggle={() => toggleSettingsSection('security')}
                logoutMutation={logoutMutation}
                deleteAccountMutation={deleteAccountMutation}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
