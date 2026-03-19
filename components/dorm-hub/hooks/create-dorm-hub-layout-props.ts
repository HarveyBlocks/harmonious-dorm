export function createDormHubLayoutProps(sections: {
  state: Record<string, any>;
  settingsText: Record<string, any>;
  view: Record<string, any>;
  selection: Record<string, any>;
  domainMutations: Record<string, any>;
  chatInput: Record<string, any>;
  settingsMutations: Record<string, any>;
  noticeAuthMutations: Record<string, any>;
  scrollHandlers: Record<string, any>;
  chatRuntime: Record<string, any>;
  refs: Record<string, any>;
  meta: Record<string, any>;
}) {
  const {
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
    meta,
  } = sections;

  return {
    ...state,
    ...settingsText,
    ...view,
    ...selection,
    ...domainMutations,
    ...chatInput,
    ...settingsMutations,
    ...noticeAuthMutations,
    ...scrollHandlers,
    ...chatRuntime,
    ...meta,
    chatEndRef: refs.chatEndRef,
    chatInputRef: refs.chatInputRef,
    chatScrollRef: refs.chatScrollRef,
    chatMessageRefs: refs.chatMessageRefs,
    notificationListRef: refs.notificationListRef,
    billUnpaidListRef: refs.billUnpaidListRef,
    billPaidListRef: refs.billPaidListRef,
    avatarInputRef: refs.avatarInputRef,
    botAvatarInputRef: refs.botAvatarInputRef,
    botOtherTextareaRef: refs.botOtherTextareaRef,
  };
}
