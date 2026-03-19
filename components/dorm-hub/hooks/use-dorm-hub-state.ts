import { useState } from 'react';

import type { LanguageCode } from '@/lib/i18n';
import type { DormState } from '@/lib/types';
import { mapPathToTab, todayText } from '@/components/dorm-hub/ui-helpers';
import type { ActiveTab, LineGranularity, NotificationFilter, PeriodType, SettingsCardKey } from '@/components/dorm-hub/ui-types';

function useDormTabState(pathname: string | null) {
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => mapPathToTab(pathname || '/'));
  const [selectedState, setSelectedState] = useState<DormState>('out');
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [showAllDoneDuty, setShowAllDoneDuty] = useState(false);
  const [noticePopup, setNoticePopup] = useState<{ title: string; content: string } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<SettingsCardKey, boolean>>({
    user: false,
    dorm: false,
    member: false,
    bot: false,
    security: false,
  });
  return {
    activeTab,
    setActiveTab,
    selectedState,
    setSelectedState,
    notificationFilter,
    setNotificationFilter,
    showAllDoneDuty,
    setShowAllDoneDuty,
    noticePopup,
    setNoticePopup,
    collapsedSections,
    setCollapsedSections,
  };
}

function useDormComposerState() {
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
  const [newChatHintCount, setNewChatHintCount] = useState(0);
  return {
    assignUserId,
    setAssignUserId,
    assignDate,
    setAssignDate,
    dutyTask,
    setDutyTask,
    billTotal,
    setBillTotal,
    billCategory,
    setBillCategory,
    customCategory,
    setCustomCategory,
    billUseWeights,
    setBillUseWeights,
    participants,
    setParticipants,
    participantWeights,
    setParticipantWeights,
    chatInput,
    setChatInput,
    newChatHintCount,
    setNewChatHintCount,
  };
}

function useDormChartFilterState() {
  const [billPeriodType, setBillPeriodType] = useState<PeriodType>('month');
  const [billYear, setBillYear] = useState(`${new Date().getFullYear()}`);
  const [billPeriodMarker, setBillPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [billLineGranularity, setBillLineGranularity] = useState<LineGranularity>('day');
  const [dutyPeriodType, setDutyPeriodType] = useState<PeriodType>('month');
  const [dutyYear, setDutyYear] = useState(`${new Date().getFullYear()}`);
  const [dutyPeriodMarker, setDutyPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [dutyLineGranularity, setDutyLineGranularity] = useState<LineGranularity>('day');
  return {
    billPeriodType,
    setBillPeriodType,
    billYear,
    setBillYear,
    billPeriodMarker,
    setBillPeriodMarker,
    billLineGranularity,
    setBillLineGranularity,
    dutyPeriodType,
    setDutyPeriodType,
    dutyYear,
    setDutyYear,
    dutyPeriodMarker,
    setDutyPeriodMarker,
    dutyLineGranularity,
    setDutyLineGranularity,
  };
}

function useDormSettingsDraftState() {
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
  return {
    name,
    setName,
    language,
    setLanguage,
    dormNameInput,
    setDormNameInput,
    botNameInput,
    setBotNameInput,
    botSettingsInput,
    setBotSettingsInput,
    botOtherContent,
    setBotOtherContent,
    botOtherEditing,
    setBotOtherEditing,
    memberDescriptionsInput,
    setMemberDescriptionsInput,
    targetLeaderId,
    setTargetLeaderId,
    avatarFile,
    setAvatarFile,
    botAvatarFile,
    setBotAvatarFile,
  };
}

export function useDormHubState(pathname: string | null) {
  return {
    ...useDormTabState(pathname),
    ...useDormComposerState(),
    ...useDormChartFilterState(),
    ...useDormSettingsDraftState(),
  };
}
