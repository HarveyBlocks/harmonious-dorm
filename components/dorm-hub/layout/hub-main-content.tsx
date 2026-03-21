import { AnimatePresence, motion } from 'motion/react';

import {
  BotSettingsCard,
  DormSettingsCard,
  MemberSettingsCard,
  SecuritySettingsCard,
  UserSettingsCard,
} from '@/components/dorm-hub/settings';
import { ChatTab, DashboardTab, DutyTab, NotificationsTab, WalletTab } from '@/components/dorm-hub/tabs';
import { TopHeader } from '@/components/dorm-hub/top-header';

export function HubMainContent(props: any) {
  const p = props;
  return (
    <main className="pb-24 md:pb-8 md:ml-24 lg:ml-72">
      <div className="pt-3 md:pt-5 px-8 md:px-16 lg:px-24 max-w-[1680px] mx-auto">
        <TopHeader
          t={p.t}
          dormName={p.dormName}
          meName={p.me?.name}
          language={p.me?.language || 'zh-CN'}
          selectedState={p.selectedState}
          onChangeState={(state) => {
            p.setSelectedState(state);
            p.updateStatusMutation.mutate(state);
          }}
        />
        <AnimatePresence initial={false}>
          {p.activeTab === 'dashboard' && <DashboardTab t={p.t} me={p.me} displayUsers={p.displayUsers} />}
          {p.activeTab === 'duty' && <DutyTab {...buildDutyProps(p)} />}
          {p.activeTab === 'chat' && <ChatTab {...buildChatProps(p)} />}
          {p.activeTab === 'wallet' && <WalletTab {...buildWalletProps(p)} />}
          {p.activeTab === 'notifications' && <NotificationsTab {...buildNotificationProps(p)} />}
          {p.activeTab === 'settings' && (
            <motion.div key="settings" animate={{ opacity: 1 }} className="space-y-10">
              <UserSettingsCard {...buildUserSettingsProps(p)} />
              <DormSettingsCard {...buildDormSettingsProps(p)} />
              <MemberSettingsCard {...buildMemberSettingsProps(p)} />
              <BotSettingsCard {...buildBotSettingsProps(p)} />
              <SecuritySettingsCard {...buildSecuritySettingsProps(p)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function buildDutyProps(p: any) {
  return {
    t: p.t, pText: p.pText, me: p.me, meId: p.me?.id, selectedState: p.selectedState,
    groupedPendingDuties: p.groupedPendingDuties, groupedDoneDuties: p.groupedDoneDuties, doneDutyList: p.doneDutyList,
    showAllDoneDuty: p.showAllDoneDuty, setShowAllDoneDuty: p.setShowAllDoneDuty,
    onPendingDutyScroll: p.onPendingDutyScroll, onDoneDutyScroll: p.onDoneDutyScroll,
    toggleDutyMutation: p.toggleDutyMutation, deleteDutyMutation: p.deleteDutyMutation,
    assignUserId: p.assignUserId, setAssignUserId: p.setAssignUserId, assignDate: p.assignDate, setAssignDate: p.setAssignDate,
    dutyTask: p.dutyTask, setDutyTask: p.setDutyTask, tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText, LIMITS: p.LIMITS,
    assignMutation: p.assignMutation, dutyPeriodType: p.dutyPeriodType, setDutyPeriodType: p.setDutyPeriodType, dutyYear: p.dutyYear,
    setDutyYear: p.setDutyYear, dutyPeriodMarker: p.dutyPeriodMarker, setDutyPeriodMarker: p.setDutyPeriodMarker,
    dutyLineGranularity: p.dutyLineGranularity, setDutyLineGranularity: p.setDutyLineGranularity,
    dutyPieData: p.dutyPieData, dutyByMemberPieData: p.dutyByMemberPieData, dutyLineData: p.dutyLineData, dutyMemberLineSeries: p.dutyMemberLineSeries,
  };
}

function buildChatProps(p: any) {
  return {
    t: p.t, dormName: p.dormName, meId: p.meId, lastPositionChatId: p.lastPositionChatId, unreadChatCount: p.unreadChatCount,
    jumpToLastPosition: p.jumpToLastPosition, chatScrollRef: p.chatScrollRef, onChatListScroll: p.onChatListScroll,
    renderedLiveMessages: p.renderedLiveMessages, chatMessageRefs: p.chatMessageRefs, newChatHintCount: p.newChatHintCount,
    jumpToFirstNewChat: p.jumpToFirstNewChat, chatEndRef: p.chatEndRef, chatInputRef: p.chatInputRef, onSendChat: p.sendChat,
    messageTooLongText: p.eText.messageTooLong, maxInputLength: p.LIMITS.CHAT_USER_CONTENT, isChatContextSelected: p.isChatContextSelected,
    onToggleChatContextMessage: p.toggleChatContextMessage, isChatMessagePrivateForBot: p.isChatMessagePrivateForBot,
    onToggleChatPrivacy: p.toggleChatPrivacy, addRobotMemoryText: p.t.addToRobotMemory, removeRobotMemoryText: p.t.removeFromRobotMemory,
    setPrivateText: p.t.markAsPrivate, unsetPrivateText: p.t.unmarkPrivate, stopGeneratingText: p.t.stopGenerating, onAbortBotStream: p.abortBotStream,
  };
}

function buildWalletProps(p: any) {
  return {
    t: p.t, pText: p.pText, me: p.me, selectedState: p.selectedState, billsRows: p.billsRows, monthTotal: p.monthTotal,
    groupedUnpaidBills: p.groupedUnpaidBills, groupedPaidBills: p.groupedPaidBills, billUnpaidListRef: p.billUnpaidListRef, billPaidListRef: p.billPaidListRef,
    onBillUnpaidListScroll: p.onBillUnpaidListScroll, onBillPaidListScroll: p.onBillPaidListScroll, togglePaidMutation: p.togglePaidMutation,
    billTotal: p.billTotal, setBillTotal: p.setBillTotal, billCategory: p.billCategory, setBillCategory: p.setBillCategory, customCategory: p.customCategory,
    setCustomCategory: p.setCustomCategory, billUseWeights: p.billUseWeights, setBillUseWeights: p.setBillUseWeights, participants: p.participants,
    setParticipants: p.setParticipants, participantWeights: p.participantWeights, setParticipantWeights: p.setParticipantWeights, previewAmounts: p.previewAmounts,
    tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText, LIMITS: p.LIMITS, createBillMutation: p.createBillMutation, billPeriodType: p.billPeriodType,
    setBillPeriodType: p.setBillPeriodType, billYear: p.billYear, setBillYear: p.setBillYear, billPeriodMarker: p.billPeriodMarker,
    setBillPeriodMarker: p.setBillPeriodMarker, billLineGranularity: p.billLineGranularity, setBillLineGranularity: p.setBillLineGranularity,
    billPieData: p.billPieData, billLineData: p.billLineData, billCategoryLineSeries: p.billCategoryLineSeries,
  };
}

function buildNotificationProps(p: any) {
  return {
    t: p.t, language: p.me?.language || 'zh-CN', selectedNoticeCount: p.selectedCount, notificationMenuOpen: p.menuOpen,
    onToggleMenu: () => p.setMenuOpen((prev: boolean) => !prev), onCloseMenu: () => p.setMenuOpen(false), onSelectAll: p.selectAllRows,
    onMarkSelectedRead: () => p.readSelectedNoticeMutation.mutate(p.selectionPayload, { onSuccess: () => p.clearSelection() }),
    onDeleteSelected: () => p.deleteSelectedNoticeMutation.mutate(p.selectionPayload, { onSuccess: () => p.clearSelection() }),
    markSelectedDisabled: p.selectedCount === 0 || p.readSelectedNoticeMutation.isPending,
    deleteSelectedDisabled: p.selectedCount === 0 || p.deleteSelectedNoticeMutation.isPending,
    notificationFilter: p.notificationFilter, onFilterChange: p.setNotificationFilter, notificationListRef: p.notificationListRef,
    onNoticeListScroll: p.onNoticeListScroll, notices: p.notificationVisibleRows, onToggleSelect: p.toggleSelect, isChecked: p.isChecked,
    onOpenNotice: (notice: any) => {
      if (!notice.isRead) p.readNoticeMutation.mutate(notice.id);
      if (!notice.targetPath) return;
      const tab = p.mapPathToTab(notice.targetPath);
      const targetPath = p.mapTabToPath(tab);
      p.setActiveTab(tab);
      if (p.pathname !== targetPath) p.router.push(targetPath);
    },
  };
}

function buildUserSettingsProps(p: any) {
  return {
    t: p.t, me: p.me, meId: p.meId || 0, folded: p.collapsedSections.user,
    toggleLabel: p.settingsFoldLabel(p.language, p.collapsedSections.user), onToggle: () => p.toggleSettingsCard('user'),
    avatarInputRef: p.avatarInputRef, changeAvatarTitle: p.changeAvatarTitle, setAvatarFile: p.setAvatarFile,
    name: p.name, setName: p.setName, language: p.language, setLanguage: p.setLanguage,
    tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText,
  };
}

function buildDormSettingsProps(p: any) {
  return {
    t: p.t, me: p.me, folded: p.collapsedSections.dorm,
    toggleLabel: p.settingsFoldLabel(p.language, p.collapsedSections.dorm), onToggle: () => p.toggleSettingsCard('dorm'),
    copyInviteCode: p.copyInviteCode, dormNameInput: p.dormNameInput, setDormNameInput: p.setDormNameInput,
    tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText, targetLeaderId: p.targetLeaderId,
    setTargetLeaderId: p.setTargetLeaderId, transferMutation: p.transferMutation,
  };
}

function buildMemberSettingsProps(p: any) {
  return {
    t: p.t, me: p.me, folded: p.collapsedSections.member, title: p.memberDescLabel,
    toggleLabel: p.settingsFoldLabel(p.language, p.collapsedSections.member), onToggle: () => p.toggleSettingsCard('member'),
    memberDescriptionsInput: p.memberDescriptionsInput, setMemberDescriptionsInput: p.setMemberDescriptionsInput,
    memberDescPlaceholder: p.memberDescPlaceholder, tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText,
  };
}

function buildBotSettingsProps(p: any) {
  return {
    me: p.me, folded: p.collapsedSections.bot, title: p.botLabel,
    toggleLabel: p.settingsFoldLabel(p.language, p.collapsedSections.bot), onToggle: () => p.toggleSettingsCard('bot'),
    botAvatarInputRef: p.botAvatarInputRef, changeBotAvatarTitle: p.changeBotAvatarTitle, setBotAvatarFile: p.setBotAvatarFile,
    botNameInput: p.botNameInput, setBotNameInput: p.setBotNameInput, botNamePlaceholder: p.botNamePlaceholder,
    tryApplyLimitedInput: p.tryApplyLimitedInput, eText: p.eText, botSettingsLabel: p.botSettingsLabel,
    noFieldsYetText: p.noFieldsYet, botSettingsInput: p.botSettingsInput, setBotSettingsInput: p.setBotSettingsInput,
    addFieldLabel: p.addFieldLabel, removeFieldLabel: p.removeFieldLabel, botSettingKeyLabel: p.botSettingKeyLabel,
    botSettingValueLabel: p.botSettingValueLabel, botMemoryWindowLabel: p.botMemoryWindowLabel, botMemoryWindowInput: p.botMemoryWindowInput,
    setBotMemoryWindowInput: p.setBotMemoryWindowInput, botMemoryWindowHintSimple: p.botMemoryWindowHintSimple,
    botMemoryWindowHintHeavy: p.botMemoryWindowHintHeavy, botMemoryWindowHintTech: p.botMemoryWindowHintTech,
    botMemoryWindowHintHyper: p.botMemoryWindowHintHyper, botOtherContentLabel: p.botOtherContentLabel, botOtherEditing: p.botOtherEditing,
    setBotOtherEditing: p.setBotOtherEditing, botOtherTextareaRef: p.botOtherTextareaRef, botOtherContent: p.botOtherContent,
    setBotOtherContent: p.setBotOtherContent, botOtherContentPlaceholder: p.botOtherContentPlaceholder, dispatchToast: p.dispatchToast,
  };
}

function buildSecuritySettingsProps(p: any) {
  return {
    t: p.t, folded: p.collapsedSections.security,
    toggleLabel: p.settingsFoldLabel(p.language, p.collapsedSections.security), onToggle: () => p.toggleSettingsCard('security'),
    logoutMutation: p.logoutMutation, deleteAccountMutation: p.deleteAccountMutation,
  };
}
