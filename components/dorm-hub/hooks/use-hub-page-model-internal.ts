'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { getUiText } from '@/lib/i18n';
import { LIMITS } from '@/lib/limits';
import { dispatchToast, mapPathToTab, mapTabToPath, settingsFoldLabel } from '@/components/dorm-hub/ui-helpers';
import { buildErrorText, buildPanelText, buildSettingsText } from '@/components/dorm-hub/view-model-mappers';
import { useHubRefs } from '@/components/dorm-hub/hooks/use-hub-refs';
import { useHubState } from '@/components/dorm-hub/hooks/use-hub-state';
import { useDormQueries } from '@/components/dorm-hub/hooks/use-dorm-queries';
import { useDormViewModels } from '@/components/dorm-hub/hooks/use-dorm-view-models';
import { useDormMutations } from '@/components/dorm-hub/hooks/use-dorm-mutations';
import { useMeSyncState } from '@/components/dorm-hub/hooks/use-me-sync-state';
import { useSettingsMutations } from '@/components/dorm-hub/hooks/use-settings-mutations';
import { useSettingsSaveActions } from '@/components/dorm-hub/hooks/use-settings-save-actions';
import { useNoticeAuthMutations } from '@/components/dorm-hub/hooks/use-notice-auth-mutations';
import { useNotificationSelection } from '@/components/dorm-hub/hooks/use-notification-selection';
import { useTabRouting } from '@/components/dorm-hub/hooks/use-tab-routing';
import { useTabScrollHandlers } from '@/components/dorm-hub/hooks/use-tab-scroll-handlers';
import { useChatRuntime } from '@/components/dorm-hub/hooks/use-chat-runtime';
import { useHubLifecycleEffects } from '@/components/dorm-hub/hooks/use-hub-lifecycle-effects';
import { createHubLayoutProps } from '@/components/dorm-hub/hooks/create-hub-layout-props';
import { createLifecycleOptions } from '@/components/dorm-hub/hooks/create-lifecycle-options';
import { useChatMemorySelection } from '@/components/dorm-hub/hooks/use-chat-memory-selection';
import { useInviteCodeCopy, useLimitedInputGuard } from '@/components/dorm-hub/hooks/use-input-helpers';
import type { ChatMessage, SettingsCardKey } from '@/components/dorm-hub/ui-types';

export function useHubPageModelInternal() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const state = useHubState(pathname);
  const refs = useHubRefs();

  const toggleSettingsCard = useCallback((section: SettingsCardKey) => {
    state.setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, [state]);

  const tryApplyLimitedInput = useLimitedInputGuard(refs.limitToastRef);

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
    setBotToolPermissionsInput: state.setBotToolPermissionsInput,
    setBotOtherContent: state.setBotOtherContent,
    setMemberDescriptionsInput: state.setMemberDescriptionsInput,
    lastSyncedProfileRef: refs.lastSyncedProfileRef,
    lastSyncedDormNameRef: refs.lastSyncedDormNameRef,
    lastSyncedBotNameRef: refs.lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef: refs.lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef: refs.lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef: refs.lastSyncedBotSettingsRef,
    lastSyncedBotToolPermissionsRef: refs.lastSyncedBotToolPermissionsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
    name: state.name,
    language: state.language,
    dormNameInput: state.dormNameInput,
    botNameInput: state.botNameInput,
    botMemoryWindowInput: state.botMemoryWindowInput,
    botSettingsInput: state.botSettingsInput,
    botToolPermissionsInput: state.botToolPermissionsInput,
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
    chatContextMessageIds: state.chatContextMessageIds,
    setChatContextMessageIds: state.setChatContextMessageIds,
    botName: me?.botName || '',
    chatForceBottomOnNextLayoutRef: refs.chatForceBottomOnNextLayoutRef,
  });

  const chatRuntime = useChatRuntime({
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
    lastSyncedBotToolPermissionsRef: refs.lastSyncedBotToolPermissionsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
  });

  const noticeAuthMutations = useNoticeAuthMutations({ queryClient, notificationFilter: state.notificationFilter, socketRef: refs.socketRef });

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
    botToolPermissionsInput: state.botToolPermissionsInput,
    memberDescriptionsInput: state.memberDescriptionsInput,
    avatarFile: state.avatarFile,
    botAvatarFile: state.botAvatarFile,
    lastSyncedProfileRef: refs.lastSyncedProfileRef,
    lastSyncedDormNameRef: refs.lastSyncedDormNameRef,
    lastSyncedBotNameRef: refs.lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef: refs.lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef: refs.lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef: refs.lastSyncedBotSettingsRef,
    lastSyncedBotToolPermissionsRef: refs.lastSyncedBotToolPermissionsRef,
    lastSyncedMemberDescriptionsRef: refs.lastSyncedMemberDescriptionsRef,
    updateProfileMutation: settingsMutations.updateProfileMutation,
    updateDormMutation: settingsMutations.updateDormMutation,
    updateBotMutation: settingsMutations.updateBotMutation,
    updateBotSettingsMutation: settingsMutations.updateBotSettingsMutation,
    updateBotToolPermissionsBatchMutation: settingsMutations.updateBotToolPermissionsBatchMutation,
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
    onNavigateToNotifications: () => state.setNotificationFilter('unread'),
  });

  const scrollHandlers = useTabScrollHandlers({
    notificationsQuery: queries.notificationsQuery,
    billsQuery: queries.billsQuery,
    dutyAllQuery: queries.dutyAllQuery,
    showAllDoneDuty: state.showAllDoneDuty,
    setShowAllDoneDuty: state.setShowAllDoneDuty,
  });

  const memory = useChatMemorySelection({
    meId: me?.id,
    dormId: me?.dormId,
    botMemoryWindow: me?.botMemoryWindow,
    t,
    liveMessages,
    selectedIds: state.chatContextMessageIds,
    setSelectedIds: state.setChatContextMessageIds,
    togglePrivacyMutation: domainMutations.toggleChatPrivacyMutation,
  });

  const abortBotStream = useCallback((messageId: number) => {
    domainMutations.abortBotStreamMutation.mutate(messageId);
  }, [domainMutations.abortBotStreamMutation]);

  useHubLifecycleEffects(createLifecycleOptions({
    state,
    queries,
    refs,
    queryClient,
    chatRuntime,
    noticeAuthMutations,
    settingsSaveActions,
    view,
    setLiveMessages,
  }));

  const copyInviteCode = useInviteCodeCopy(me?.inviteCode, t.inviteCodeCopied, t.requestFailed);

  return createHubLayoutProps({
    state,
    settingsText,
    view,
    selection,
    domainMutations,
    chatInput: {},
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
      toggleChatContextMessage: memory.toggleMessage,
      isChatContextSelected: memory.isSelected,
      isChatMessagePrivateForBot: memory.isPrivate,
      toggleChatPrivacy: memory.togglePrivacy,
      abortBotStream,
    },
  });
}
