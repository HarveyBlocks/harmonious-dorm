'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { apiRequest } from '@/lib/client-api';
import { getUiText, LANG_OPTIONS, type LanguageCode } from '@/lib/i18n';
import { LIMITS } from '@/lib/limits';
import { allocateAmounts } from '@/lib/share-allocation';
import type { BillSummary, CursorPage, DormState, DutyItem, MePayload, NotificationPayload } from '@/lib/types';
import { LineChartCard, PieChartCard } from '@/components/legacy-app/charts';
import {
  BILL_AUTO_FILL_TOTAL_GROUPS,
  BILL_AUTO_FILL_UNPAID,
  BILL_CATEGORIES,
  BILL_CATEGORY_CUSTOM,
  BILL_PAGE_LIMIT,
  CHAT_PAGE_LIMIT,
} from '@/components/legacy-app/constants';
import {
  autoResizeTextarea,
  currentQuarter,
  dispatchToast,
  formatPaidInfo,
  isChatNearBottom,
  mapPathToTab,
  mapTabToPath,
  mergeChatMessages,
  parseStatusSystemMessage,
  resetTextareaHeight,
  resolveAvatar,
  settingsFoldLabel,
  tabForNotificationType,
  todayText,
  unnamedBill,
  weekStartLabel,
} from '@/components/legacy-app/helpers';
import { categoryLabel, localizeServerText } from '@/components/legacy-app/localization';
import { NoticePopup } from '@/components/legacy-app/notice-popup';
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
import { buildErrorText, buildPanelText, buildSettingsText, calcMonthTotal, calcPreviewAmounts, groupBillsByMonth } from '@/components/legacy-app/view-models';
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
  const [chatWindowMode, setChatWindowMode] = useState(false);
  const [chatOlderCursor, setChatOlderCursor] = useState<number | null>(null);
  const [chatNewerCursor, setChatNewerCursor] = useState<number | null>(null);
  const [chatHasOlder, setChatHasOlder] = useState(true);
  const [chatHasNewer, setChatHasNewer] = useState(false);
  const [newChatHintCount, setNewChatHintCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [notificationSelectAll, setNotificationSelectAll] = useState(false);
  const [notificationIncludeIds, setNotificationIncludeIds] = useState<Set<number>>(new Set());
  const [notificationExcludeIds, setNotificationExcludeIds] = useState<Set<number>>(new Set());
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
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
  const chatLoadingOlderRef = useRef(false);
  const chatLoadingNewerRef = useRef(false);
  const chatPrependStateRef = useRef<{ pending: boolean; prevHeight: number; prevTop: number }>({
    pending: false,
    prevHeight: 0,
    prevTop: 0,
  });
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dormSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botAvatarSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botSettingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberDescriptionsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    if (chatWindowMode) return;
    if (!chatQuery.data?.pages) return;
    const merged = chatQuery.data.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items);
    setLiveMessages((prev) => mergeChatMessages(prev, merged));
  }, [chatQuery.dataUpdatedAt, chatWindowMode]);

  useEffect(() => {
    const dormId = meQuery.data?.dormId;
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
        const shouldCountAsNew = Boolean(isChatTab && meQuery.data?.id && message.userId !== meQuery.data.id);
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
        if (!meQuery.data?.id || (payload.userId && payload.userId !== meQuery.data.id)) return;
        const targetTab = tabForNotificationType(payload.type);
        if (targetTab && lastActiveTabRef.current === targetTab) {
          const typeToRead = payload.type as 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';
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
  }, [meQuery.data?.dormId, meQuery.data?.id, queryClient]);

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

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assignUserId) {
        throw new Error(eText.chooseMember);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) {
        throw new Error(eText.invalidDate);
      }
      const task = dutyTask.trim();
      if (!task) throw new Error(eText.dutyTaskRequired);
      if (task.length > LIMITS.DUTY_TASK) throw new Error(eText.dutyTaskTooLong);
      return apiRequest('/api/duty/assign', {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, date: assignDate, task }),
      });
    },
    onSuccess: () => {
      setDutyTask('');
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const toggleDutyMutation = useMutation({
    mutationFn: (payload: { dutyId: number; completed: boolean }) =>
      apiRequest('/api/duty/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const deleteDutyMutation = useMutation({
    mutationFn: (dutyId: number) => apiRequest(`/api/duty/${dutyId}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const createBillMutation = useMutation({
    mutationFn: () => {
      const total = Number(billTotal);
      if (!billTotal.trim()) throw new Error(eText.amountRequired);
      if (Number.isNaN(total)) throw new Error(eText.amountNotNumber);
      if (total <= 0) throw new Error(eText.amountGtZero);
      if (total > 1_000_000) throw new Error(eText.amountMax);
      if (!Number.isInteger(total * 100)) throw new Error(eText.amountDecimal);
      if (!participants.length) throw new Error(eText.participantsRequired);
      if (billCategory === BILL_CATEGORY_CUSTOM && !customCategory.trim()) throw new Error(eText.customCategoryRequired);

      const weightedRows = participants.map((userId) => {
        const raw = participantWeights[userId];
        const parsed = raw == null || raw === '' ? 1 : Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) throw new Error(eText.weightInvalid);
        if (parsed > LIMITS.BILL_WEIGHT) throw new Error(eText.weightTooLarge);
        return { userId, weight: parsed };
      });
      const amountMap = allocateAmounts(total, participants, weightedRows);
      if (amountMap.size === 0) throw new Error(eText.weightAllZero);

      return apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          total,
          description: billCategory === BILL_CATEGORY_CUSTOM ? customCategory.trim() : null,
          category: billCategory === BILL_CATEGORY_CUSTOM ? 'other' : billCategory,
          customCategory: billCategory === BILL_CATEGORY_CUSTOM ? customCategory.trim() : null,
          participants,
          participantWeights: billUseWeights ? weightedRows : undefined,
        }),
      });
    },
    onSuccess: () => {
      setBillTotal('');
      setCustomCategory('');
      setBillUseWeights(false);
      setParticipantWeights({});
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: (payload: { billId: number; paid: boolean }) =>
      apiRequest(`/api/bills/${payload.billId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paid: payload.paid }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (state: DormState) =>
      apiRequest('/api/status', {
        method: 'PUT',
        body: JSON.stringify({ state }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }),
  });

  const sendChatMutation = useMutation({
    mutationFn: () => {
      const trimmed = chatInput.trim();
      if (!trimmed) throw new Error(eText.messageRequired);
      if (trimmed.length > LIMITS.CHAT_USER_CONTENT) {
        dispatchToast('error', eText.messageTooLong);
        throw new Error(eText.messageTooLong);
      }
      return apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      });
    },
    onSuccess: () => {
      setChatInput('');
    },
  });

  const onChatInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key !== 'Enter') return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const target = event.currentTarget;
        const start = target.selectionStart ?? chatInput.length;
        const end = target.selectionEnd ?? chatInput.length;
        const next = `${chatInput.slice(0, start)}\n${chatInput.slice(end)}`;
        tryApplyLimitedInput('chat_input', next, LIMITS.CHAT_USER_CONTENT, eText.messageTooLong, (safeValue) => {
          setChatInput(safeValue);
          requestAnimationFrame(() => {
            target.selectionStart = start + 1;
            target.selectionEnd = start + 1;
          });
        });
        return;
      }
      event.preventDefault();
      sendChatMutation.mutate();
    },
    [chatInput, eText.messageTooLong, sendChatMutation, tryApplyLimitedInput],
  );

  const onChatInputChange = useCallback((value: string) => {
    tryApplyLimitedInput('chat_input', value, LIMITS.CHAT_USER_CONTENT, eText.messageTooLong, setChatInput);
  }, [eText.messageTooLong, tryApplyLimitedInput]);

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

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { name: string; language: LanguageCode }) =>
      apiRequest('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('app_lang', payload.language);
      }
      lastSyncedProfileRef.current = { name: payload.name.trim(), language: payload.language };
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateDormMutation = useMutation({
    mutationFn: (dormName: string) => {
      if (!dormName.trim()) throw new Error(eText.dormNameRequired);
      return apiRequest('/api/dorm', {
        method: 'PUT',
        body: JSON.stringify({ name: dormName }),
      });
    },
    onSuccess: (_, dormName) => {
      lastSyncedDormNameRef.current = dormName.trim();
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateBotMutation = useMutation({
    mutationFn: (botName: string) =>
      apiRequest<{ name: string; avatarPath: string | null }>('/api/dorm/bot', {
        method: 'PUT',
        body: JSON.stringify({ name: botName }),
      }),
    onSuccess: (_, botName) => {
      lastSyncedBotNameRef.current = botName.trim();
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateBotSettingsMutation = useMutation({
    mutationFn: (payload: { settings: Array<{ key: string; value: string }>; otherContent: string }) =>
      apiRequest<{ settings: Array<{ key: string; value: string }>; otherContent: string }>('/api/dorm/bot/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      const normalized = payload.settings
        .map((item) => ({ key: item.key.trim(), value: item.value }))
        .filter((item) => item.key.length > 0);
      lastSyncedBotSettingsRef.current = normalized;
      lastSyncedBotOtherContentRef.current = payload.otherContent.trim();
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateDescriptionsMutation = useMutation({
    mutationFn: (items: Array<{ userId: number; description: string }>) =>
      apiRequest<{ success: true }>('/api/users/descriptions', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_, items) => {
      const next = { ...lastSyncedMemberDescriptionsRef.current };
      for (const item of items) {
        next[item.userId] = item.description;
      }
      lastSyncedMemberDescriptionsRef.current = next;
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!targetLeaderId) throw new Error(eText.transferTargetRequired);
      return apiRequest('/api/dorm/transfer-leader', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetLeaderId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || eText.avatarUploadFailed);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setAvatarFile(null);
    },
  });

  const uploadBotAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/dorm/bot/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || eText.avatarUploadFailed);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setBotAvatarFile(null);
    },
  });

  const readNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const readSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const autoReadByTypeMutation = useMutation({
    mutationFn: (type: 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader') =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: 'unread',
          selectAll: true,
          ids: [],
          types: [type],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
      queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest<{ success: true }>('/api/logout', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest<{ success: true }>('/api/users/me', { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const saveProfileNow = useCallback(() => {
    const synced = lastSyncedProfileRef.current;
    if (!me || !synced || updateProfileMutation.isPending) return;
    const trimmed = name.trim();
    const nextName = trimmed || synced.name;
    const nextLanguage = language;
    if (nextName === synced.name && nextLanguage === synced.language) return;
    if (!trimmed) {
      setName(synced.name);
    }
    updateProfileMutation.mutate({ name: nextName, language: nextLanguage });
  }, [language, me, name, updateProfileMutation]);

  const saveDormNow = useCallback(() => {
    if (!me?.isLeader || updateDormMutation.isPending) return;
    const synced = lastSyncedDormNameRef.current;
    const trimmed = dormNameInput.trim();
    const nextDormName = trimmed || synced;
    if (!nextDormName || nextDormName === synced) return;
    if (!trimmed) {
      setDormNameInput(synced);
    }
    updateDormMutation.mutate(nextDormName);
  }, [dormNameInput, me?.isLeader, updateDormMutation]);

  const saveBotNow = useCallback(() => {
    if (!me?.isLeader || updateBotMutation.isPending) return;
    const synced = lastSyncedBotNameRef.current;
    const trimmed = botNameInput.trim();
    const nextBotName = trimmed || synced;
    if (!nextBotName || nextBotName === synced) return;
    if (!trimmed) {
      setBotNameInput(synced);
    }
    updateBotMutation.mutate(nextBotName);
  }, [botNameInput, me?.isLeader, updateBotMutation]);

  const saveBotSettingsNow = useCallback(() => {
    if (!me?.isLeader || updateBotSettingsMutation.isPending) return;
    const otherContent = botOtherContent.trim();
    if (otherContent.length > LIMITS.BOT_OTHER_CONTENT) return;
    const normalized = botSettingsInput
      .map((item) => ({ key: item.key.trim(), value: item.value }))
      .filter((item) => item.key.length > 0);
    const old = JSON.stringify(lastSyncedBotSettingsRef.current);
    const next = JSON.stringify(normalized);
    const syncedOtherContent = lastSyncedBotOtherContentRef.current;
    if (old === next && otherContent === syncedOtherContent) return;
    updateBotSettingsMutation.mutate({ settings: normalized, otherContent });
  }, [botOtherContent, botSettingsInput, me?.isLeader, updateBotSettingsMutation]);

  const saveMemberDescriptionsNow = useCallback(() => {
    if (!me || updateDescriptionsMutation.isPending) return;
    const current = memberDescriptionsInput;
    const synced = lastSyncedMemberDescriptionsRef.current;
    const baseMembers = me.members || [];
    const targetMembers = me.isLeader ? baseMembers : baseMembers.filter((member) => member.id === me.id);
    const changed = targetMembers
      .map((member) => ({
        userId: member.id,
        description: (current[member.id] || '').trim(),
      }))
      .filter((item) => (synced[item.userId] || '') !== item.description);
    if (changed.length === 0) return;
    updateDescriptionsMutation.mutate(changed);
  }, [me, memberDescriptionsInput, updateDescriptionsMutation]);

  const saveAvatarNow = useCallback(() => {
    if (!avatarFile || uploadAvatarMutation.isPending) return;
    uploadAvatarMutation.mutate(avatarFile);
  }, [avatarFile, uploadAvatarMutation]);

  const saveBotAvatarNow = useCallback(() => {
    if (!botAvatarFile || uploadBotAvatarMutation.isPending) return;
    uploadBotAvatarMutation.mutate(botAvatarFile);
  }, [botAvatarFile, uploadBotAvatarMutation]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me) return;
    const synced = lastSyncedProfileRef.current;
    if (!synced) return;
    const nextName = name.trim() || synced.name;
    if (nextName === synced.name && language === synced.language) return;

    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
    }
    profileSaveTimerRef.current = setTimeout(() => {
      saveProfileNow();
    }, 900);

    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
    };
  }, [activeTab, language, me, name, saveProfileNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me?.isLeader) return;
    const synced = lastSyncedDormNameRef.current;
    const nextDormName = dormNameInput.trim() || synced;
    if (!nextDormName || nextDormName === synced) return;

    if (dormSaveTimerRef.current) {
      clearTimeout(dormSaveTimerRef.current);
    }
    dormSaveTimerRef.current = setTimeout(() => {
      saveDormNow();
    }, 900);

    return () => {
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
    };
  }, [activeTab, dormNameInput, me?.isLeader, saveDormNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me?.isLeader) return;
    const synced = lastSyncedBotNameRef.current;
    const nextBotName = botNameInput.trim() || synced;
    if (!nextBotName || nextBotName === synced) return;

    if (botSaveTimerRef.current) {
      clearTimeout(botSaveTimerRef.current);
    }
    botSaveTimerRef.current = setTimeout(() => {
      saveBotNow();
    }, 900);

    return () => {
      if (botSaveTimerRef.current) {
        clearTimeout(botSaveTimerRef.current);
        botSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botNameInput, me?.isLeader, saveBotNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me?.isLeader) return;
    if (botSettingsSaveTimerRef.current) {
      clearTimeout(botSettingsSaveTimerRef.current);
    }
    botSettingsSaveTimerRef.current = setTimeout(() => {
      saveBotSettingsNow();
    }, 900);

    return () => {
      if (botSettingsSaveTimerRef.current) {
        clearTimeout(botSettingsSaveTimerRef.current);
        botSettingsSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botOtherContent, botSettingsInput, me?.isLeader, saveBotSettingsNow]);

  useEffect(() => {
    if (!botOtherEditing) return;
    const el = botOtherTextareaRef.current;
    if (!el) return;
    autoResizeTextarea(el);
    el.focus();
  }, [botOtherEditing]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me) return;
    if (memberDescriptionsSaveTimerRef.current) {
      clearTimeout(memberDescriptionsSaveTimerRef.current);
    }
    memberDescriptionsSaveTimerRef.current = setTimeout(() => {
      saveMemberDescriptionsNow();
    }, 900);
    return () => {
      if (memberDescriptionsSaveTimerRef.current) {
        clearTimeout(memberDescriptionsSaveTimerRef.current);
        memberDescriptionsSaveTimerRef.current = null;
      }
    };
  }, [activeTab, me, memberDescriptionsInput, saveMemberDescriptionsNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !avatarFile) return;
    if (avatarSaveTimerRef.current) {
      clearTimeout(avatarSaveTimerRef.current);
    }
    avatarSaveTimerRef.current = setTimeout(() => {
      saveAvatarNow();
    }, 1200);

    return () => {
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
    };
  }, [activeTab, avatarFile, saveAvatarNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !botAvatarFile || !me?.isLeader) return;
    if (botAvatarSaveTimerRef.current) {
      clearTimeout(botAvatarSaveTimerRef.current);
    }
    botAvatarSaveTimerRef.current = setTimeout(() => {
      saveBotAvatarNow();
    }, 1200);

    return () => {
      if (botAvatarSaveTimerRef.current) {
        clearTimeout(botAvatarSaveTimerRef.current);
        botAvatarSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botAvatarFile, me?.isLeader, saveBotAvatarNow]);

  useEffect(() => {
    if (lastActiveTabRef.current === 'settings' && activeTab !== 'settings') {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
      if (botSaveTimerRef.current) {
        clearTimeout(botSaveTimerRef.current);
        botSaveTimerRef.current = null;
      }
      if (botSettingsSaveTimerRef.current) {
        clearTimeout(botSettingsSaveTimerRef.current);
        botSettingsSaveTimerRef.current = null;
      }
      if (memberDescriptionsSaveTimerRef.current) {
        clearTimeout(memberDescriptionsSaveTimerRef.current);
        memberDescriptionsSaveTimerRef.current = null;
      }
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
      if (botAvatarSaveTimerRef.current) {
        clearTimeout(botAvatarSaveTimerRef.current);
        botAvatarSaveTimerRef.current = null;
      }
      saveProfileNow();
      saveDormNow();
      saveBotNow();
      saveBotSettingsNow();
      saveMemberDescriptionsNow();
      saveAvatarNow();
      saveBotAvatarNow();
    }
    lastActiveTabRef.current = activeTab;
  }, [activeTab, saveAvatarNow, saveBotAvatarNow, saveBotNow, saveBotSettingsNow, saveDormNow, saveMemberDescriptionsNow, saveProfileNow]);

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

  useEffect(() => {
    if (lastAutoReadTabRef.current === activeTab) return;
    lastAutoReadTabRef.current = activeTab;
    if (activeTab === 'chat') {
      autoReadByTypeMutation.mutate('chat');
      return;
    }
    if (activeTab === 'wallet') {
      autoReadByTypeMutation.mutate('bill');
      return;
    }
    if (activeTab === 'duty') {
      autoReadByTypeMutation.mutate('duty');
      return;
    }
    if (activeTab === 'settings') {
      autoReadByTypeMutation.mutate('settings');
      autoReadByTypeMutation.mutate('dorm');
      autoReadByTypeMutation.mutate('leader');
    }
  }, [activeTab, autoReadByTypeMutation]);

  useEffect(
    () => () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
      }
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
      }
      if (botSaveTimerRef.current) {
        clearTimeout(botSaveTimerRef.current);
      }
      if (botSettingsSaveTimerRef.current) {
        clearTimeout(botSettingsSaveTimerRef.current);
      }
      if (memberDescriptionsSaveTimerRef.current) {
        clearTimeout(memberDescriptionsSaveTimerRef.current);
      }
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
      }
      if (botAvatarSaveTimerRef.current) {
        clearTimeout(botAvatarSaveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setActiveTab(mapPathToTab(pathname || '/'));
  }, [pathname]);

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

  useEffect(() => {
    setNotificationSelectAll(false);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
    setNotificationMenuOpen(false);
  }, [notificationFilter]);

  const toggleNoticeSelect = useCallback((id: number) => {
    if (notificationSelectAll) {
      setNotificationExcludeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setNotificationIncludeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [notificationSelectAll]);

  const setNoticeSelectAll = useCallback(() => {
    setNotificationSelectAll(true);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
  }, []);

  const clearNoticeSelection = useCallback(() => {
    setNotificationSelectAll(false);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
  }, []);

  const onNoticeListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 80 &&
      notificationsQuery.hasNextPage &&
      !notificationsQuery.isFetchingNextPage
    ) {
      notificationsQuery.fetchNextPage();
    }
  }, [notificationsQuery]);

  const onBillUnpaidListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && billsQuery.hasNextPage && !billsQuery.isFetchingNextPage) {
      billsQuery.fetchNextPage();
    }
  }, [billsQuery]);

  const onBillPaidListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && billsQuery.hasNextPage && !billsQuery.isFetchingNextPage) {
      billsQuery.fetchNextPage();
    }
  }, [billsQuery]);

  const onPendingDutyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && dutyAllQuery.hasNextPage && !dutyAllQuery.isFetchingNextPage) {
      dutyAllQuery.fetchNextPage();
    }
  }, [dutyAllQuery]);

  const onDoneDutyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (!showAllDoneDuty) {
      setShowAllDoneDuty(true);
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && dutyAllQuery.hasNextPage && !dutyAllQuery.isFetchingNextPage) {
      dutyAllQuery.fetchNextPage();
    }
  }, [dutyAllQuery, showAllDoneDuty]);

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
          const resp = await apiRequest<{ items: ChatMessage[]; nextCursor: number | null; hasMore: boolean }>(
            `/api/chat/window?mode=older&cursor=${chatOlderCursor}&limit=20`,
          );
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
          const resp = await apiRequest<{ items: ChatMessage[]; nextCursor: number | null; hasMore: boolean }>(
            `/api/chat/window?mode=newer&cursor=${chatNewerCursor}&limit=20`,
          );
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
  }, [chatHasNewer, chatHasOlder, chatNewerCursor, chatOlderCursor, chatQuery, chatWindowMode, syncSeenNewChatHint]);


  const dormName = me?.dormName || t.dormTitle;
  const meId = me?.id ?? null;
  const notificationAllRows = notificationRows;
  const notificationVisibleRows = notificationAllRows;
  const isNoticeChecked = useCallback(
    (id: number) => (notificationSelectAll ? !notificationExcludeIds.has(id) : notificationIncludeIds.has(id)),
    [notificationExcludeIds, notificationIncludeIds, notificationSelectAll],
  );
  const selectedNoticeCount = useMemo(() => {
    if (notificationSelectAll) {
      return Math.max(notificationAllRows.length - notificationExcludeIds.size, 0);
    }
    return notificationIncludeIds.size;
  }, [notificationAllRows.length, notificationExcludeIds.size, notificationIncludeIds.size, notificationSelectAll]);
  const selectionPayload = useMemo(
    () => ({
      selectAll: notificationSelectAll,
      ids: notificationSelectAll ? [...notificationExcludeIds] : [...notificationIncludeIds],
    }),
    [notificationExcludeIds, notificationIncludeIds, notificationSelectAll],
  );
  const unreadNoticeCount = useMemo(
    () => (notificationsUnreadQuery.data?.items || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [notificationsUnreadQuery.data?.items],
  );
  const unreadChatCount = useMemo(() => {
    const unreadRows = notificationsUnreadQuery.data?.items || [];
    return unreadRows
      .filter((item) => item.type === 'chat')
      .reduce((sum, item) => sum + Math.max(item.unreadCount || 0, 1), 0);
  }, [notificationsUnreadQuery.data?.items]);
  const lastPositionChatId = chatAnchorQuery.data?.anchorId || null;
  const jumpToLastPosition = useCallback(async () => {
    if (unreadChatCount <= 20) return;
    if (!lastPositionChatId) return;
    const windowResp = await apiRequest<{
      items: ChatMessage[];
      olderCursor: number | null;
      newerCursor: number | null;
      hasOlder: boolean;
      hasNewer: boolean;
    }>(`/api/chat/window?mode=around&anchorId=${lastPositionChatId}&before=10&after=10`);
    if (!windowResp.items.length) return;
    setChatWindowMode(true);
    setLiveMessages(windowResp.items);
    setChatOlderCursor(windowResp.olderCursor);
    setChatNewerCursor(windowResp.newerCursor);
    setChatHasOlder(windowResp.hasOlder);
    setChatHasNewer(windowResp.hasNewer);
    requestAnimationFrame(() => {
      const node = chatMessageRefs.current[lastPositionChatId];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [lastPositionChatId, unreadChatCount]);

  const resetChatToLatest = useCallback(() => {
    setChatWindowMode(false);
    setChatOlderCursor(null);
    setChatNewerCursor(null);
    setChatHasOlder(true);
    setChatHasNewer(false);
  }, []);

  useEffect(() => {
    if (activeTab !== 'chat') {
      resetChatToLatest();
    }
  }, [activeTab, resetChatToLatest]);
  const pText = useMemo(() => buildPanelText(me?.language), [me?.language]);

  const billPieData = useMemo(
    () => (billStatsQuery.data?.pieData || []).map((item) => ({ label: categoryLabel(me?.language || 'zh-CN', item.label), value: item.value })),
    [billStatsQuery.data?.pieData, me?.language],
  );
  const billLineData = useMemo(() => billStatsQuery.data?.lineData || [], [billStatsQuery.data?.lineData]);
  const billCategoryLineSeries = useMemo(
    () =>
      (billStatsQuery.data?.categoryLineSeries || []).map((line) => ({
        name: categoryLabel(me?.language || 'zh-CN', line.name),
        points: line.points,
      })),
    [billStatsQuery.data?.categoryLineSeries, me?.language],
  );

  const pendingDutyList = useMemo(() => dutyListRows.filter((item) => !item.completed), [dutyListRows]);
  const doneDutyList = useMemo(() => dutyListRows.filter((item) => item.completed), [dutyListRows]);
  const visiblePendingDutyList = pendingDutyList;
  const effectiveDoneLimit = showAllDoneDuty ? doneDutyList.length : 5;
  const doneDutyPreview = useMemo(() => doneDutyList.slice(0, effectiveDoneLimit), [doneDutyList, effectiveDoneLimit]);

  const groupedUnpaidBills = useMemo(() => groupBillsByMonth(billListRows, false), [billListRows]);
  const unpaidBillCount = useMemo(
    () => groupedUnpaidBills.reduce((sum, [, items]) => sum + items.length, 0),
    [groupedUnpaidBills],
  );

  const groupedPaidBills = useMemo(() => groupBillsByMonth(billListRows, true), [billListRows]);

  const groupedPendingDuties = useMemo(() => {
    const map = new Map<string, DutyItem[]>();
    visiblePendingDutyList.forEach((item) => {
      const key = weekStartLabel(item.date);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visiblePendingDutyList]);

  const groupedDoneDuties = useMemo(() => {
    const map = new Map<string, DutyItem[]>();
    doneDutyPreview.forEach((item) => {
      const key = weekStartLabel(item.date);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [doneDutyPreview]);

  const dutyPieData = useMemo(() => {
    const doneLabel = me?.language === 'en' ? 'Completed' : me?.language === 'fr' ? 'Termine' : me?.language === 'zh-TW' ? '已完成' : '已完成';
    const pendingLabel = me?.language === 'en' ? 'Pending' : me?.language === 'fr' ? 'En attente' : me?.language === 'zh-TW' ? '未完成' : '未完成';
    return (dutyStatsQuery.data?.pieData || []).map((item) => ({
      label: item.label === 'completed' ? doneLabel : pendingLabel,
      value: item.value,
    }));
  }, [dutyStatsQuery.data?.pieData, me?.language]);

  const dutyLineData = useMemo(() => dutyStatsQuery.data?.lineData || [], [dutyStatsQuery.data?.lineData]);
  const dutyByMemberPieData = useMemo(() => dutyStatsQuery.data?.memberPieData || [], [dutyStatsQuery.data?.memberPieData]);
  const dutyMemberLineSeries = useMemo(() => dutyStatsQuery.data?.memberLineSeries || [], [dutyStatsQuery.data?.memberLineSeries]);

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsQuery.hasNextPage || billsQuery.isFetchingNextPage) return;
    if (unpaidBillCount >= BILL_AUTO_FILL_UNPAID && groupedPaidBills.length >= BILL_AUTO_FILL_TOTAL_GROUPS) return;
    billsQuery.fetchNextPage();
  }, [activeTab, billsQuery, groupedPaidBills.length, unpaidBillCount]);

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsQuery.hasNextPage || billsQuery.isFetchingNextPage) return;
    const unpaidList = billUnpaidListRef.current;
    const paidList = billPaidListRef.current;
    const unpaidNotScrollable = unpaidList ? unpaidList.scrollHeight <= unpaidList.clientHeight + 8 : false;
    const paidNotScrollable = paidList ? paidList.scrollHeight <= paidList.clientHeight + 8 : false;
    if ((unpaidNotScrollable || paidNotScrollable) && billsRows.length > 0) {
      billsQuery.fetchNextPage();
    }
  }, [activeTab, billsQuery, billsRows.length, groupedPaidBills.length, unpaidBillCount]);

  useEffect(() => {
    if (activeTab !== 'duty') return;
    if (groupedPendingDuties.length + groupedDoneDuties.length > 0) return;
    if (!dutyAllQuery.hasNextPage || dutyAllQuery.isFetchingNextPage) return;
    dutyAllQuery.fetchNextPage();
  }, [activeTab, dutyAllQuery, groupedDoneDuties.length, groupedPendingDuties.length]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    if (notificationRows.length > 0) return;
    if (!notificationsQuery.hasNextPage || notificationsQuery.isFetchingNextPage) return;
    notificationsQuery.fetchNextPage();
  }, [activeTab, notificationRows.length, notificationsQuery]);

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
