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
  isThisMonth,
  mapPathToTab,
  mapTabToPath,
  mergeChatMessages,
  monthHeader,
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
  const changeAvatarTitle =
    me?.language === 'en'
      ? 'Change avatar'
      : me?.language === 'fr'
      ? 'Changer l’avatar'
      : me?.language === 'zh-TW'
      ? '更換頭像'
      : '更换头像';
  const botLabel =
    me?.language === 'en' ? 'Dorm Bot' : me?.language === 'fr' ? 'Robot du dortoir' : me?.language === 'zh-TW' ? '宿舍機器人' : '宿舍机器人';
  const botNamePlaceholder =
    me?.language === 'en' ? 'Bot name' : me?.language === 'fr' ? 'Nom du robot' : me?.language === 'zh-TW' ? '機器人名稱' : '机器人名称';
  const changeBotAvatarTitle =
    me?.language === 'en' ? 'Change bot avatar' : me?.language === 'fr' ? 'Changer l’avatar du robot' : me?.language === 'zh-TW' ? '更換機器人頭像' : '更换机器人头像';
  const botSettingsLabel =
    me?.language === 'en' ? 'Bot Settings' : me?.language === 'fr' ? 'Paramètres du robot' : me?.language === 'zh-TW' ? '機器人設定' : '机器人设定';
  const memberDescLabel =
    me?.language === 'en' ? 'Member Description' : me?.language === 'fr' ? 'Description des membres' : me?.language === 'zh-TW' ? '成員描述' : '成员描述';
  const memberDescPlaceholder =
    me?.language === 'en' ? 'Write a short self-introduction...' : me?.language === 'fr' ? 'Écrivez une courte présentation...' : me?.language === 'zh-TW' ? '寫一段自我介紹...' : '写一段自我介绍...';
  const botOtherContentLabel =
    me?.language === 'en' ? 'Bot Other Content' : me?.language === 'fr' ? 'Autres contenus du robot' : me?.language === 'zh-TW' ? '機器人的其他內容' : '机器人的其他内容';
  const botOtherContentPlaceholder =
    me?.language === 'en'
      ? 'Input additional bot content...'
      : me?.language === 'fr'
      ? 'Saisissez du contenu supplémentaire du robot...'
      : me?.language === 'zh-TW'
      ? '輸入機器人的額外內容...'
      : '输入机器人的额外内容...';
  const botSettingKeyLabel =
    me?.language === 'en' ? 'Field name' : me?.language === 'fr' ? 'Nom du champ' : me?.language === 'zh-TW' ? '欄位名' : '字段名';
  const botSettingValueLabel =
    me?.language === 'en' ? 'Field value' : me?.language === 'fr' ? 'Valeur du champ' : me?.language === 'zh-TW' ? '欄位值' : '字段值';
  const addFieldLabel =
    me?.language === 'en' ? 'Add field' : me?.language === 'fr' ? 'Ajouter un champ' : me?.language === 'zh-TW' ? '新增欄位' : '新增字段';
  const removeFieldLabel =
    me?.language === 'en' ? 'Remove' : me?.language === 'fr' ? 'Supprimer' : me?.language === 'zh-TW' ? '刪除' : '删除';
  const eText = useMemo(() => ({
    chooseMember: t.chooseMember,
    invalidDate: t.invalidDate,
    amountRequired:
      me?.language === 'en'
        ? 'Please enter bill amount'
        : me?.language === 'fr'
        ? 'Veuillez saisir le montant'
        : me?.language === 'zh-TW'
        ? '請輸入帳單金額'
        : '请输入账单金额',
    amountNotNumber:
      me?.language === 'en'
        ? 'Bill amount must be a number'
        : me?.language === 'fr'
        ? 'Le montant doit être un nombre'
        : me?.language === 'zh-TW'
        ? '帳單金額必須是數字'
        : '账单金额必须是数字',
    amountGtZero:
      me?.language === 'en'
        ? 'Bill amount must be greater than 0'
        : me?.language === 'fr'
        ? 'Le montant doit être supérieur à 0'
        : me?.language === 'zh-TW'
        ? '帳單金額必須大於 0'
        : '账单金额必须大于 0',
    amountMax:
      me?.language === 'en'
        ? 'Amount cannot exceed 1000000'
        : me?.language === 'fr'
        ? 'Le montant ne peut pas dépasser 1000000'
        : me?.language === 'zh-TW'
        ? '帳單金額不能超過 1000000'
        : '账单金额不能超过 1000000',
    amountDecimal:
      me?.language === 'en'
        ? 'Amount can have at most 2 decimal places'
        : me?.language === 'fr'
        ? 'Le montant accepte au plus 2 décimales'
        : me?.language === 'zh-TW'
        ? '帳單金額最多保留兩位小數'
        : '账单金额最多保留两位小数',
    participantsRequired:
      me?.language === 'en'
        ? 'Please select at least one participant'
        : me?.language === 'fr'
        ? 'Sélectionnez au moins un participant'
        : me?.language === 'zh-TW'
        ? '至少選擇一位參與成員'
        : '至少选择一位参与成员',
    customCategoryRequired:
      me?.language === 'en'
        ? 'Please enter custom category'
        : me?.language === 'fr'
        ? 'Veuillez saisir une catégorie personnalisée'
        : me?.language === 'zh-TW'
        ? '請輸入自訂消費類型'
        : '请输入自定义消费类型',
    messageRequired:
      me?.language === 'en'
        ? 'Message cannot be empty'
        : me?.language === 'fr'
        ? 'Le message ne peut pas être vide'
        : me?.language === 'zh-TW'
        ? '訊息不能為空'
        : '消息不能为空',
    messageTooLong:
      me?.language === 'en'
        ? `Message cannot exceed ${LIMITS.CHAT_USER_CONTENT} characters`
        : me?.language === 'fr'
        ? `Le message ne peut pas dépasser ${LIMITS.CHAT_USER_CONTENT} caractères`
        : me?.language === 'zh-TW'
        ? `訊息不能超過 ${LIMITS.CHAT_USER_CONTENT} 字`
        : `消息不能超过 ${LIMITS.CHAT_USER_CONTENT} 字`,
    nameTooLong:
      me?.language === 'en'
        ? `Nickname cannot exceed ${LIMITS.USER_NAME} characters`
        : me?.language === 'fr'
        ? `Le pseudo ne peut pas dépasser ${LIMITS.USER_NAME} caractères`
        : me?.language === 'zh-TW'
        ? `暱稱不能超過 ${LIMITS.USER_NAME} 字`
        : `昵称不能超过 ${LIMITS.USER_NAME} 字`,
    dormNameTooLong:
      me?.language === 'en'
        ? `Dorm name cannot exceed ${LIMITS.DORM_NAME} characters`
        : me?.language === 'fr'
        ? `Le nom du dortoir ne peut pas dépasser ${LIMITS.DORM_NAME} caractères`
        : me?.language === 'zh-TW'
        ? `宿舍名稱不能超過 ${LIMITS.DORM_NAME} 字`
        : `宿舍名称不能超过 ${LIMITS.DORM_NAME} 字`,
    billDescTooLong:
      me?.language === 'en'
        ? `Bill description cannot exceed ${LIMITS.BILL_DESCRIPTION} characters`
        : me?.language === 'fr'
        ? `La description de la facture ne peut pas dépasser ${LIMITS.BILL_DESCRIPTION} caractères`
        : me?.language === 'zh-TW'
        ? `帳單說明不能超過 ${LIMITS.BILL_DESCRIPTION} 字`
        : `账单说明不能超过 ${LIMITS.BILL_DESCRIPTION} 字`,
    customCategoryTooLong:
      me?.language === 'en'
        ? `Custom category cannot exceed ${LIMITS.BILL_CUSTOM_CATEGORY} characters`
        : me?.language === 'fr'
        ? `La catégorie personnalisée ne peut pas dépasser ${LIMITS.BILL_CUSTOM_CATEGORY} caractères`
        : me?.language === 'zh-TW'
        ? `自訂類型不能超過 ${LIMITS.BILL_CUSTOM_CATEGORY} 字`
        : `自定义账单类型不能超过 ${LIMITS.BILL_CUSTOM_CATEGORY} 字`,
    memberDescriptionTooLong:
      me?.language === 'en'
        ? `Member description cannot exceed ${LIMITS.MEMBER_DESCRIPTION} characters`
        : me?.language === 'fr'
        ? `La description du membre ne peut pas dépasser ${LIMITS.MEMBER_DESCRIPTION} caractères`
        : me?.language === 'zh-TW'
        ? `成員描述不能超過 ${LIMITS.MEMBER_DESCRIPTION} 字`
        : `成员描述不能超过 ${LIMITS.MEMBER_DESCRIPTION} 字`,
    botNameTooLong:
      me?.language === 'en'
        ? `Bot name cannot exceed ${LIMITS.BOT_NAME} characters`
        : me?.language === 'fr'
        ? `Le nom du robot ne peut pas dépasser ${LIMITS.BOT_NAME} caractères`
        : me?.language === 'zh-TW'
        ? `機器人名稱不能超過 ${LIMITS.BOT_NAME} 字`
        : `机器人名称不能超过 ${LIMITS.BOT_NAME} 字`,
    botSettingKeyTooLong:
      me?.language === 'en'
        ? `Bot setting key cannot exceed ${LIMITS.BOT_SETTING_KEY} characters`
        : me?.language === 'fr'
        ? `La clé du paramètre du robot ne peut pas dépasser ${LIMITS.BOT_SETTING_KEY} caractères`
        : me?.language === 'zh-TW'
        ? `機器人設定鍵不能超過 ${LIMITS.BOT_SETTING_KEY} 字`
        : `机器人设定键不能超过 ${LIMITS.BOT_SETTING_KEY} 字`,
    botSettingValueTooLong:
      me?.language === 'en'
        ? `Bot setting value cannot exceed ${LIMITS.BOT_SETTING_VALUE} characters`
        : me?.language === 'fr'
        ? `La valeur du paramètre du robot ne peut pas dépasser ${LIMITS.BOT_SETTING_VALUE} caractères`
        : me?.language === 'zh-TW'
        ? `機器人設定值不能超過 ${LIMITS.BOT_SETTING_VALUE} 字`
        : `机器人设定值不能超过 ${LIMITS.BOT_SETTING_VALUE} 字`,
    botOtherTooLong:
      me?.language === 'en'
        ? `Bot extra content cannot exceed ${LIMITS.BOT_OTHER_CONTENT} characters`
        : me?.language === 'fr'
        ? `Le contenu supplémentaire du robot ne peut pas dépasser ${LIMITS.BOT_OTHER_CONTENT} caractères`
        : me?.language === 'zh-TW'
        ? `機器人的其他內容不能超過 ${LIMITS.BOT_OTHER_CONTENT} 字`
        : `机器人的其他内容不能超过 ${LIMITS.BOT_OTHER_CONTENT} 字`,
    botSettingsTooMany:
      me?.language === 'en'
        ? `Bot settings cannot exceed ${LIMITS.BOT_SETTINGS_ITEMS} items`
        : me?.language === 'fr'
        ? `Les paramètres du robot ne peuvent pas dépasser ${LIMITS.BOT_SETTINGS_ITEMS} éléments`
        : me?.language === 'zh-TW'
        ? `機器人設定不能超過 ${LIMITS.BOT_SETTINGS_ITEMS} 條`
        : `机器人设定不能超过 ${LIMITS.BOT_SETTINGS_ITEMS} 条`,
    dormNameRequired:
      me?.language === 'en'
        ? 'Dorm name cannot be empty'
        : me?.language === 'fr'
        ? 'Le nom du dortoir est requis'
        : me?.language === 'zh-TW'
        ? '宿舍名稱不能為空'
        : '宿舍名称不能为空',
    transferTargetRequired:
      me?.language === 'en'
        ? 'Please choose a target user'
        : me?.language === 'fr'
        ? 'Veuillez choisir un utilisateur'
        : me?.language === 'zh-TW'
        ? '請選擇移交對象'
        : '请选择移交对象',
    avatarRequired:
      me?.language === 'en'
        ? 'Please choose an avatar file'
        : me?.language === 'fr'
        ? 'Veuillez choisir un fichier avatar'
        : me?.language === 'zh-TW'
        ? '請選擇頭像檔案'
        : '请选择头像文件',
    avatarUploadFailed:
      me?.language === 'en'
        ? 'Avatar upload failed'
        : me?.language === 'fr'
        ? 'Échec du téléversement de l’avatar'
        : me?.language === 'zh-TW'
        ? '頭像上傳失敗'
        : '头像上传失败',
    dutyTaskRequired:
      me?.language === 'en'
        ? 'Please input duty task'
        : me?.language === 'fr'
        ? 'Veuillez saisir la tâche'
        : me?.language === 'zh-TW'
        ? '請輸入值日任務'
        : '请输入值日任务',
    dutyTaskTooLong:
      me?.language === 'en'
        ? `Duty task cannot exceed ${LIMITS.DUTY_TASK} characters`
        : me?.language === 'fr'
        ? `La tâche ne peut pas dépasser ${LIMITS.DUTY_TASK} caractères`
        : me?.language === 'zh-TW'
        ? `值日任務不能超過 ${LIMITS.DUTY_TASK} 字`
        : `值日任务不能超过 ${LIMITS.DUTY_TASK} 字`,
    weightInvalid:
      me?.language === 'en'
        ? 'Weight must be a non-negative number'
        : me?.language === 'fr'
        ? 'Le poids doit être un nombre non négatif'
        : me?.language === 'zh-TW'
        ? '權重必須是大於等於 0 的數字'
        : '权重必须是大于等于 0 的数字',
    weightTooLarge:
      me?.language === 'en'
        ? `Weight cannot exceed ${LIMITS.BILL_WEIGHT}`
        : me?.language === 'fr'
        ? `Le poids ne peut pas dépasser ${LIMITS.BILL_WEIGHT}`
        : me?.language === 'zh-TW'
        ? `權重不能超過 ${LIMITS.BILL_WEIGHT}`
        : `权重不能超过 ${LIMITS.BILL_WEIGHT}`,
    weightAllZero:
      me?.language === 'en'
        ? 'At least one participant must pay'
        : me?.language === 'fr'
        ? 'Au moins un participant doit payer'
        : me?.language === 'zh-TW'
        ? '至少需要一位成員支付'
        : '至少需要一位成员支付',
  }), [me?.language, t.chooseMember, t.invalidDate]);

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

  const monthTotal = useMemo(() => {
    return billsRows.filter((item) => isThisMonth(item.createdAt)).reduce((sum, item) => sum + item.total, 0);
  }, [billsRows]);
  const previewAmounts = useMemo(() => {
    const total = Number(billTotal);
    if (!Number.isFinite(total) || total <= 0 || participants.length === 0) return new Map<number, number>();
    const rows = participants.map((userId) => {
      const raw = participantWeights[userId];
      const parsed = raw == null || raw === '' ? 1 : Number(raw);
      return { userId, weight: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
    });
    return allocateAmounts(total, participants, rows);
  }, [billTotal, participantWeights, participants]);

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
  const pText = useMemo(
    () => ({
      month: me?.language === 'en' ? 'Month' : me?.language === 'fr' ? 'Mois' : me?.language === 'zh-TW' ? '月份' : '月份',
      quarter: me?.language === 'en' ? 'Quarter' : me?.language === 'fr' ? 'Trimestre' : me?.language === 'zh-TW' ? '季度' : '季度',
      year: me?.language === 'en' ? 'Year' : me?.language === 'fr' ? 'Annee' : me?.language === 'zh-TW' ? '年份' : '年份',
      byMonth: me?.language === 'en' ? 'By month' : me?.language === 'fr' ? 'Par mois' : me?.language === 'zh-TW' ? '按月' : '按月',
      byDay: me?.language === 'en' ? 'By day' : me?.language === 'fr' ? 'Par jour' : me?.language === 'zh-TW' ? '按日' : '按日',
      billPie: me?.language === 'en' ? 'Category Share' : me?.language === 'fr' ? 'Part des categories' : me?.language === 'zh-TW' ? '分類占比' : '分类占比',
      billLine: me?.language === 'en' ? 'Amount Trend' : me?.language === 'fr' ? 'Tendance des montants' : me?.language === 'zh-TW' ? '金額趨勢' : '金额趋势',
      billLineByCategory: me?.language === 'en' ? 'Category Amount Trend' : me?.language === 'fr' ? 'Tendance par categorie' : me?.language === 'zh-TW' ? '分類金額趨勢' : '分类金额趋势',
      unpaidBills: me?.language === 'en' ? 'Pending Payment Bills' : me?.language === 'fr' ? 'Factures a payer' : me?.language === 'zh-TW' ? '待支付帳單' : '待支付账单',
      paidBills: me?.language === 'en' ? 'Paid Bills' : me?.language === 'fr' ? 'Factures payees' : me?.language === 'zh-TW' ? '已支付帳單' : '已支付账单',
      dutyPie: me?.language === 'en' ? 'Task Status Share' : me?.language === 'fr' ? 'Part des statuts de tache' : me?.language === 'zh-TW' ? '任務狀態占比' : '任务状态占比',
      dutyByMemberPie: me?.language === 'en' ? 'Completed By Member' : me?.language === 'fr' ? 'Taches terminees par membre' : me?.language === 'zh-TW' ? '完成者占比' : '完成人占比',
      dutyLine: me?.language === 'en' ? 'Task Trend' : me?.language === 'fr' ? 'Tendance des taches' : me?.language === 'zh-TW' ? '任務趨勢' : '任务趋势',
      dutyLineByMember: me?.language === 'en' ? 'Member Completion Trend' : me?.language === 'fr' ? 'Tendance de completion par membre' : me?.language === 'zh-TW' ? '成員完成趨勢' : '成员完成趋势',
      doneList: me?.language === 'en' ? 'Completed List' : me?.language === 'fr' ? 'Liste terminee' : me?.language === 'zh-TW' ? '完成列表' : '完成列表',
      showMore: me?.language === 'en' ? 'Show all' : me?.language === 'fr' ? 'Tout afficher' : me?.language === 'zh-TW' ? '顯示全部' : '显示全部',
      showLess: me?.language === 'en' ? 'Collapse' : me?.language === 'fr' ? 'Replier' : me?.language === 'zh-TW' ? '收起' : '收起',
      pendingTasks: me?.language === 'en' ? 'Pending Tasks' : me?.language === 'fr' ? 'Taches en attente' : me?.language === 'zh-TW' ? '待完成任務' : '待完成任务',
      popupNewNotice: me?.language === 'en' ? 'New notification' : me?.language === 'fr' ? 'Nouvelle notification' : me?.language === 'zh-TW' ? '新通知' : '新通知',
      splitEqual: me?.language === 'en' ? 'Split equally' : me?.language === 'fr' ? 'Partage egal' : me?.language === 'zh-TW' ? '平均分攤' : '平均分摊',
      splitWeight: me?.language === 'en' ? 'Split by weight' : me?.language === 'fr' ? 'Partage par poids' : me?.language === 'zh-TW' ? '按權重分攤' : '按权重分摊',
      billWeight: me?.language === 'en' ? 'Weight' : me?.language === 'fr' ? 'Poids' : me?.language === 'zh-TW' ? '權重' : '权重',
      dutyTaskPlaceholder: me?.language === 'en' ? 'Duty task (e.g. mop floor)' : me?.language === 'fr' ? 'Tache (ex: laver le sol)' : me?.language === 'zh-TW' ? '值日任務（例如：拖地）' : '值日任务（例如：拖地）',
    }),
    [me?.language],
  );

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

  const groupedUnpaidBills = useMemo(() => {
    const map = new Map<string, BillSummary[]>();
    billListRows
      .filter((bill) => !bill.myPaid)
      .forEach((bill) => {
        const key = monthHeader(bill.createdAt);
        map.set(key, [...(map.get(key) || []), bill]);
      });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [billListRows]);
  const unpaidBillCount = useMemo(
    () => groupedUnpaidBills.reduce((sum, [, items]) => sum + items.length, 0),
    [groupedUnpaidBills],
  );

  const groupedPaidBills = useMemo(() => {
    const map = new Map<string, BillSummary[]>();
    billListRows
      .filter((bill) => bill.myPaid)
      .forEach((bill) => {
        const key = monthHeader(bill.createdAt);
        map.set(key, [...(map.get(key) || []), bill]);
      });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [billListRows]);

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
