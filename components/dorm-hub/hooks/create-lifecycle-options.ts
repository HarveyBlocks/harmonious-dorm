export function createLifecycleOptions(input: {
  state: any;
  queries: any;
  refs: any;
  queryClient: any;
  chatRuntime: any;
  noticeAuthMutations: any;
  settingsSaveActions: any;
  view: any;
  setLiveMessages: any;
}) {
  return {
    activeTab: input.state.activeTab,
    socketOptions: {
      dormId: input.queries.meQuery.data?.dormId,
      meId: input.queries.meQuery.data?.id,
      queryClient: input.queryClient,
      socketRef: input.refs.socketRef,
      lastActiveTabRef: input.refs.lastActiveTabRef,
      chatAtBottomRef: input.refs.chatAtBottomRef,
      chatForceBottomOnNextLayoutRef: input.refs.chatForceBottomOnNextLayoutRef,
      pendingNewChatIdsRef: input.refs.pendingNewChatIdsRef,
      setLiveMessages: input.setLiveMessages,
      setNewChatHintCount: input.state.setNewChatHintCount,
      setChatNewerCursor: input.chatRuntime.setChatNewerCursor,
      setChatHasNewer: input.chatRuntime.setChatHasNewer,
      setNoticePopup: input.state.setNoticePopup,
      onBotStreamCommit: () => input.state.setChatContextMessageIds([]),
      autoReadByTypeMutation: input.noticeAuthMutations.autoReadByTypeMutation,
    },
    settingsAutoSaveOptions: {
      activeTab: input.state.activeTab,
      isLeader: Boolean(input.queries.meQuery.data?.isLeader),
      hasMe: Boolean(input.queries.meQuery.data),
      botOtherEditing: input.state.botOtherEditing,
      botOtherTextareaRef: input.refs.botOtherTextareaRef,
      name: input.state.name,
      language: input.state.language,
      dormNameInput: input.state.dormNameInput,
      botNameInput: input.state.botNameInput,
      botMemoryWindowInput: input.state.botMemoryWindowInput,
      botOtherContent: input.state.botOtherContent,
      botSettingsInput: input.state.botSettingsInput,
      botToolPermissionsInput: input.state.botToolPermissionsInput,
      memberDescriptionsInput: input.state.memberDescriptionsInput,
      avatarFile: input.state.avatarFile,
      botAvatarFile: input.state.botAvatarFile,
      ...input.settingsSaveActions,
    },
    chatTabSyncOptions: {
      activeTab: input.state.activeTab,
      chatScrollRef: input.refs.chatScrollRef,
      chatMessageRefs: input.refs.chatMessageRefs,
      chatAutoScrolledRef: input.refs.chatAutoScrolledRef,
      chatAtBottomRef: input.refs.chatAtBottomRef,
      pendingNewChatIdsRef: input.refs.pendingNewChatIdsRef,
      setNewChatHintCount: input.state.setNewChatHintCount,
      resetChatToLatest: input.chatRuntime.resetChatToLatest,
    },
    tabAutoReadOptions: {
      activeTab: input.state.activeTab,
      lastAutoReadTabRef: input.refs.lastAutoReadTabRef,
      mutate: (type: any) => input.noticeAuthMutations.autoReadByTypeMutation.mutate(type),
    },
    tabPrefetchOptions: {
      billsHasNextPage: Boolean(input.queries.billsQuery.hasNextPage),
      billsIsFetchingNextPage: input.queries.billsQuery.isFetchingNextPage,
      fetchNextBills: () => input.queries.billsQuery.fetchNextPage(),
      billsRowCount: input.view.billsRows.length,
      unpaidBillCount: input.view.unpaidBillCount,
      paidBillGroupCount: input.view.groupedPaidBills.length,
      dutyHasNextPage: Boolean(input.queries.dutyAllQuery.hasNextPage),
      dutyIsFetchingNextPage: input.queries.dutyAllQuery.isFetchingNextPage,
      fetchNextDuty: () => input.queries.dutyAllQuery.fetchNextPage(),
      pendingDutyGroupCount: input.view.groupedPendingDuties.length,
      doneDutyGroupCount: input.view.groupedDoneDuties.length,
      notificationRowCount: input.view.notificationRows.length,
      noticeHasNextPage: Boolean(input.queries.notificationsQuery.hasNextPage),
      noticeIsFetchingNextPage: input.queries.notificationsQuery.isFetchingNextPage,
      fetchNextNotices: () => input.queries.notificationsQuery.fetchNextPage(),
      unpaidListRef: input.refs.billUnpaidListRef,
      paidListRef: input.refs.billPaidListRef,
    },
  };
}
