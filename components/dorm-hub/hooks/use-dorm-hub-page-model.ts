'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { getUiText } from '@/lib/i18n';
import { LIMITS } from '@/lib/limits';
import { dispatchToast, mapPathToTab, mapTabToPath, settingsFoldLabel } from '@/components/dorm-hub/ui-helpers';
import { buildErrorText, buildPanelText, buildSettingsText } from '@/components/dorm-hub/view-model-mappers';
import { useDormHubRefs } from '@/components/dorm-hub/hooks/use-dorm-hub-refs';
import { useDormHubState } from '@/components/dorm-hub/hooks/use-dorm-hub-state';
import { useDormQueries } from '@/components/dorm-hub/hooks/use-dorm-queries';
import { useDormViewModels } from '@/components/dorm-hub/hooks/use-dorm-view-models';
import { useDormMutations } from '@/components/dorm-hub/hooks/use-dorm-mutations';
import { useMeSyncState } from '@/components/dorm-hub/hooks/use-me-sync-state';
import { useChatInput } from '@/components/dorm-hub/hooks/use-chat-input';
import { useSettingsMutations } from '@/components/dorm-hub/hooks/use-settings-mutations';
import { useSettingsSaveActions } from '@/components/dorm-hub/hooks/use-settings-save-actions';
import { useNoticeAuthMutations } from '@/components/dorm-hub/hooks/use-notice-auth-mutations';
import { useNotificationSelection } from '@/components/dorm-hub/hooks/use-notification-selection';
import { useTabRouting } from '@/components/dorm-hub/hooks/use-tab-routing';
import { useTabScrollHandlers } from '@/components/dorm-hub/hooks/use-tab-scroll-handlers';
import { useDormHubChatRuntime } from '@/components/dorm-hub/hooks/use-dorm-hub-chat-runtime';
import { useDormHubLifecycleEffects } from '@/components/dorm-hub/hooks/use-dorm-hub-lifecycle-effects';
import { createDormHubLayoutProps } from '@/components/dorm-hub/hooks/create-dorm-hub-layout-props';
import type { ChatMessage, SettingsCardKey } from '@/components/dorm-hub/ui-types';

export function useDormHubPageModel() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const state = useDormHubState(pathname);
  const refs = useDormHubRefs();

  const toggleSettingsCard = useCallback((section: SettingsCardKey) => {
    state.setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, [state]);

  const tryApplyLimitedInput = useCallback(
    (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => {
      if (value.length > max) {
        const now = Date.now();
        const last = refs.limitToastRef.current[key] || 0;
        if (now - last > 800) {
          dispatchToast('error', message);
          refs.limitToastRef.current[key] = now;
        }
        return false;
      }
      apply(value);
      return true;
    },
    [refs.limitToastRef],
  );

  const queries = useDormQueries({
    notificationFilter: state.notificationFilter,
    billPeriodType: state.billPeriodType,
    billYear: state.billYear,
    billPeriodMarker: state.billPeriodMarker,
    billLineGranularity: state.billLineGranularity,
    dutyPeriodType: state.dutyPeriodType,
    dutyYear: state.dutyYear,
    dutyPeriodMarker: state.dutyPeriodMarker,
    dutyLineGranularity: state.dutyLineGranularity,
  });

  useMeSyncState({
    activeTab: state.activeTab,
    me: queries.meQuery.data,
    statusRows: queries.statusQuery.data,
    assignUserId: state.assignUserId,
    setAssignUserId: state.setAssignUserId,
    setParticipants: state.setParticipants,
    setName: state.setName,
    setLanguage: state.setLanguage,
    setDormNameInput: state.setDormNameInput,
    setBotNameInput: state.setBotNameInput,
    setBotMemoryWindowInput: state.setBotMemoryWindowInput,
    setBotSettingsInput: state.setBotSettingsInput,
    setBotOtherContent: state.setBotOtherContent,
    setMemberDescriptionsInput: state.setMemberDescriptionsInput,
    lastSyncedProfileRef: refs.lastSyncedProfileRef,
    lastSyncedDormNameRef: refs.lastSyncedDormNameRef,
    lastSyncedBotNameRef: refs.lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef: refs.lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef: refs.lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef: refs.lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
    name: state.name,
    language: state.language,
    dormNameInput: state.dormNameInput,
    botNameInput: state.botNameInput,
    botMemoryWindowInput: state.botMemoryWindowInput,
    botSettingsInput: state.botSettingsInput,
    botOtherContent: state.botOtherContent,
    memberDescriptionsInput: state.memberDescriptionsInput,
    targetLeaderId: state.targetLeaderId,
    setTargetLeaderId: state.setTargetLeaderId,
    setSelectedState: state.setSelectedState,
  });

  const me = queries.meQuery.data;
  const t = getUiText(me?.language || 'zh-CN');
  const pText = useMemo(() => buildPanelText(me?.language), [me?.language]);
  const eText = useMemo(() => buildErrorText(me?.language, t), [me?.language, t]);
  const settingsText = useMemo(() => buildSettingsText(me?.language), [me?.language]);

  const view = useDormViewModels({
    me,
    statusRows: queries.statusQuery.data,
    selectedState: state.selectedState,
    billsPages: queries.billsQuery.data?.pages,
    dutyPages: queries.dutyAllQuery.data?.pages,
    notificationPages: queries.notificationsQuery.data?.pages,
    notificationsUnreadItems: queries.notificationsUnreadQuery.data?.items,
    liveMessages,
    billStats: queries.billStatsQuery.data,
    dutyStats: queries.dutyStatsQuery.data,
    billTotal: state.billTotal,
    participants: state.participants,
    participantWeights: state.participantWeights,
    showAllDoneDuty: state.showAllDoneDuty,
  });

  const selection = useNotificationSelection({
    filterKey: state.notificationFilter,
    totalRowCount: view.notificationRows.length,
  });

  const domainMutations = useDormMutations({
    queryClient,
    eText,
    assignUserId: state.assignUserId,
    assignDate: state.assignDate,
    dutyTask: state.dutyTask,
    setDutyTask: state.setDutyTask,
    billTotal: state.billTotal,
    billCategory: state.billCategory,
    customCategory: state.customCategory,
    participants: state.participants,
    participantWeights: state.participantWeights,
    billUseWeights: state.billUseWeights,
    setBillTotal: state.setBillTotal,
    setCustomCategory: state.setCustomCategory,
    setBillUseWeights: state.setBillUseWeights,
    setParticipantWeights: state.setParticipantWeights,
    chatInput: state.chatInput,
    setChatInput: state.setChatInput,
    chatForceBottomOnNextLayoutRef: refs.chatForceBottomOnNextLayoutRef,
  });

  const chatInput = useChatInput({
    chatInput: state.chatInput,
    setChatInput: state.setChatInput,
    maxLength: LIMITS.CHAT_USER_CONTENT,
    tooLongMessage: eText.messageTooLong,
    tryApplyLimitedInput,
    onSend: () => domainMutations.sendChat(),
  });

  const chatRuntime = useDormHubChatRuntime({
    activeTab: state.activeTab,
    liveMessages,
    setLiveMessages,
    chatQuery: {
      data: queries.chatQuery.data,
      dataUpdatedAt: queries.chatQuery.dataUpdatedAt,
      hasNextPage: queries.chatQuery.hasNextPage,
      isFetchingNextPage: queries.chatQuery.isFetchingNextPage,
      fetchNextPage: () => queries.chatQuery.fetchNextPage(),
    },
    unreadRows: queries.notificationsUnreadQuery.data?.items || [],
    anchorId: queries.chatAnchorQuery.data?.anchorId || null,
    chatRefs: {
      chatScrollRef: refs.chatScrollRef,
      chatMessageRefs: refs.chatMessageRefs,
      chatAutoScrolledRef: refs.chatAutoScrolledRef,
      chatAtBottomRef: refs.chatAtBottomRef,
      chatForceBottomOnNextLayoutRef: refs.chatForceBottomOnNextLayoutRef,
      pendingNewChatIdsRef: refs.pendingNewChatIdsRef,
    },
    setNewChatHintCount: state.setNewChatHintCount,
  });

  const settingsMutations = useSettingsMutations({
    queryClient,
    eText,
    targetLeaderId: state.targetLeaderId,
    setAvatarFile: state.setAvatarFile,
    setBotAvatarFile: state.setBotAvatarFile,
    lastSyncedProfileRef: refs.lastSyncedProfileRef,
    lastSyncedDormNameRef: refs.lastSyncedDormNameRef,
    lastSyncedBotNameRef: refs.lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef: refs.lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef: refs.lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef: refs.lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
  });

  const noticeAuthMutations = useNoticeAuthMutations({
    queryClient,
    notificationFilter: state.notificationFilter,
    socketRef: refs.socketRef,
  });

  const settingsSaveActions = useSettingsSaveActions({
    me,
    name: state.name,
    setName: state.setName,
    language: state.language,
    dormNameInput: state.dormNameInput,
    setDormNameInput: state.setDormNameInput,
    botNameInput: state.botNameInput,
    setBotNameInput: state.setBotNameInput,
    botMemoryWindowInput: state.botMemoryWindowInput,
    setBotMemoryWindowInput: state.setBotMemoryWindowInput,
    botOtherContent: state.botOtherContent,
    botSettingsInput: state.botSettingsInput,
    memberDescriptionsInput: state.memberDescriptionsInput,
    avatarFile: state.avatarFile,
    botAvatarFile: state.botAvatarFile,
    lastSyncedProfileRef: refs.lastSyncedProfileRef,
    lastSyncedDormNameRef: refs.lastSyncedDormNameRef,
    lastSyncedBotNameRef: refs.lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef: refs.lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef: refs.lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef: refs.lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
    updateProfileMutation: settingsMutations.updateProfileMutation,
    updateDormMutation: settingsMutations.updateDormMutation,
    updateBotMutation: settingsMutations.updateBotMutation,
    updateBotSettingsMutation: settingsMutations.updateBotSettingsMutation,
    updateDescriptionsMutation: settingsMutations.updateDescriptionsMutation,
    uploadAvatarMutation: settingsMutations.uploadAvatarMutation,
    uploadBotAvatarMutation: settingsMutations.uploadBotAvatarMutation,
  });

  const { navigateToTab } = useTabRouting({
    pathname,
    router,
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
    lastActiveTabRef: refs.lastActiveTabRef,
  });
  const scrollHandlers = useTabScrollHandlers({
    notificationsQuery: queries.notificationsQuery,
    billsQuery: queries.billsQuery,
    dutyAllQuery: queries.dutyAllQuery,
    showAllDoneDuty: state.showAllDoneDuty,
    setShowAllDoneDuty: state.setShowAllDoneDuty,
  });

  useDormHubLifecycleEffects({
    activeTab: state.activeTab,
    socketOptions: {
      dormId: queries.meQuery.data?.dormId,
      meId: queries.meQuery.data?.id,
      queryClient,
      socketRef: refs.socketRef,
      lastActiveTabRef: refs.lastActiveTabRef,
      chatAtBottomRef: refs.chatAtBottomRef,
      chatForceBottomOnNextLayoutRef: refs.chatForceBottomOnNextLayoutRef,
      pendingNewChatIdsRef: refs.pendingNewChatIdsRef,
      setLiveMessages,
      setNewChatHintCount: state.setNewChatHintCount,
      setChatNewerCursor: chatRuntime.setChatNewerCursor,
      setChatHasNewer: chatRuntime.setChatHasNewer,
      setNoticePopup: state.setNoticePopup,
      autoReadByTypeMutation: noticeAuthMutations.autoReadByTypeMutation,
    },
    settingsAutoSaveOptions: {
      activeTab: state.activeTab,
      isLeader: Boolean(me?.isLeader),
      hasMe: Boolean(me),
      botOtherEditing: state.botOtherEditing,
      botOtherTextareaRef: refs.botOtherTextareaRef,
      name: state.name,
      language: state.language,
      dormNameInput: state.dormNameInput,
      botNameInput: state.botNameInput,
      botMemoryWindowInput: state.botMemoryWindowInput,
      botOtherContent: state.botOtherContent,
      botSettingsInput: state.botSettingsInput,
      memberDescriptionsInput: state.memberDescriptionsInput,
      avatarFile: state.avatarFile,
      botAvatarFile: state.botAvatarFile,
      ...settingsSaveActions,
    },
    chatTabSyncOptions: {
      activeTab: state.activeTab,
      chatScrollRef: refs.chatScrollRef,
      chatMessageRefs: refs.chatMessageRefs,
      chatAutoScrolledRef: refs.chatAutoScrolledRef,
      chatAtBottomRef: refs.chatAtBottomRef,
      pendingNewChatIdsRef: refs.pendingNewChatIdsRef,
      setNewChatHintCount: state.setNewChatHintCount,
      resetChatToLatest: chatRuntime.resetChatToLatest,
    },
    tabAutoReadOptions: {
      activeTab: state.activeTab,
      lastAutoReadTabRef: refs.lastAutoReadTabRef,
      mutate: (type: any) => noticeAuthMutations.autoReadByTypeMutation.mutate(type),
    },
    tabPrefetchOptions: {
      billsHasNextPage: Boolean(queries.billsQuery.hasNextPage),
      billsIsFetchingNextPage: queries.billsQuery.isFetchingNextPage,
      fetchNextBills: () => queries.billsQuery.fetchNextPage(),
      billsRowCount: view.billsRows.length,
      unpaidBillCount: view.unpaidBillCount,
      paidBillGroupCount: view.groupedPaidBills.length,
      dutyHasNextPage: Boolean(queries.dutyAllQuery.hasNextPage),
      dutyIsFetchingNextPage: queries.dutyAllQuery.isFetchingNextPage,
      fetchNextDuty: () => queries.dutyAllQuery.fetchNextPage(),
      pendingDutyGroupCount: view.groupedPendingDuties.length,
      doneDutyGroupCount: view.groupedDoneDuties.length,
      notificationRowCount: view.notificationRows.length,
      noticeHasNextPage: Boolean(queries.notificationsQuery.hasNextPage),
      noticeIsFetchingNextPage: queries.notificationsQuery.isFetchingNextPage,
      fetchNextNotices: () => queries.notificationsQuery.fetchNextPage(),
      unpaidListRef: refs.billUnpaidListRef,
      paidListRef: refs.billPaidListRef,
    },
  });

  const copyInviteCode = async () => {
    const code = me?.inviteCode;
    if (!code || typeof window === 'undefined') return;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(code);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: t.inviteCodeCopied } }));
    } catch {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: t.requestFailed } }));
    }
  };

  return createDormHubLayoutProps({
    state,
    settingsText,
    view,
    selection,
    domainMutations,
    chatInput,
    settingsMutations,
    noticeAuthMutations,
    scrollHandlers,
    chatRuntime,
    refs,
    meta: {
      t,
      pText,
      me,
      pathname,
      router,
      navigateToTab,
      tryApplyLimitedInput,
      eText,
      LIMITS,
      mapPathToTab,
      mapTabToPath,
      settingsFoldLabel,
      toggleSettingsCard,
      copyInviteCode,
      meId: me?.id ?? null,
      dormName: me?.dormName || t.dormTitle,
      notificationVisibleRows: view.notificationRows,
      dispatchToast,
    },
  });
}
