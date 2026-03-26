
import React, { useEffect } from 'react';

import type { LanguageCode } from '@/lib/i18n';
import type { DormState, MePayload } from '@/lib/types';
import type { ActiveTab } from '@/components/dorm-hub/ui-types';

function sameSettingsItems(a: Array<{ key: string; value: string }>, b: Array<{ key: string; value: string }>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.key !== b[i]?.key) return false;
    if (a[i]?.value !== b[i]?.value) return false;
  }
  return true;
}

function sameToolPermissions(a: Array<{ tool: string; permission: 'allow' | 'deny' }>, b: Array<{ tool: string; permission: 'allow' | 'deny' }>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i]?.tool !== b[i]?.tool) return false;
    if (a[i]?.permission !== b[i]?.permission) return false;
  }
  return true;
}

function sameDescriptionMap(a: Record<number, string>, b: Record<number, string>): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if ((a[Number(key)] || '') !== (b[Number(key)] || '')) return false;
  }
  return true;
}

export function useMeSyncState(options: {
  activeTab: ActiveTab;
  me: MePayload | undefined;
  statusRows: Array<{ userId: number; state: DormState }> | undefined;
  assignUserId: number | null;
  setAssignUserId: (value: number | null) => void;
  setParticipants: (value: number[]) => void;
  setName: (value: string) => void;
  setLanguage: (value: LanguageCode) => void;
  setDormNameInput: (value: string) => void;
  setBotNameInput: (value: string) => void;
  setBotMemoryWindowInput: (value: string) => void;
  setBotSettingsInput: (value: Array<{ key: string; value: string }>) => void;
  setBotToolPermissionsInput: (value: Array<{ tool: string; permission: 'allow' | 'deny' }>) => void;
  setBotOtherContent: (value: string) => void;
  setMemberDescriptionsInput: (value: Record<number, string>) => void;
  lastSyncedProfileRef: React.MutableRefObject<{ name: string; language: LanguageCode } | null>;
  lastSyncedDormNameRef: React.MutableRefObject<string>;
  lastSyncedBotNameRef: React.MutableRefObject<string>;
  lastSyncedBotMemoryWindowRef: React.MutableRefObject<number>;
  lastSyncedBotOtherContentRef: React.MutableRefObject<string>;
  lastSyncedBotSettingsRef: React.MutableRefObject<Array<{ key: string; value: string }>>;
  lastSyncedBotToolPermissionsRef: React.MutableRefObject<Array<{ tool: string; permission: 'allow' | 'deny' }>>;
  lastSyncedMemberDescriptionsRef: React.MutableRefObject<Record<number, string>>;
  name: string;
  language: LanguageCode;
  dormNameInput: string;
  botNameInput: string;
  botMemoryWindowInput: string;
  botSettingsInput: Array<{ key: string; value: string }>;
  botToolPermissionsInput: Array<{ tool: string; permission: 'allow' | 'deny' }>;
  botOtherContent: string;
  memberDescriptionsInput: Record<number, string>;
  targetLeaderId: number | null;
  setTargetLeaderId: (value: number | null) => void;
  setSelectedState: (value: DormState) => void;
}) {
  const {
    activeTab,
    me,
    statusRows,
    assignUserId,
    setAssignUserId,
    setParticipants,
    setName,
    setLanguage,
    setDormNameInput,
    setBotNameInput,
    setBotMemoryWindowInput,
    setBotSettingsInput,
    setBotToolPermissionsInput,
    setBotOtherContent,
    setMemberDescriptionsInput,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedBotToolPermissionsRef,
    lastSyncedMemberDescriptionsRef,
    name,
    language,
    dormNameInput,
    botNameInput,
    botMemoryWindowInput,
    botSettingsInput,
    botToolPermissionsInput,
    botOtherContent,
    memberDescriptionsInput,
    targetLeaderId,
    setTargetLeaderId,
    setSelectedState,
  } = options;

  useEffect(() => {
    if (!assignUserId && me?.members.length) {
      setAssignUserId(me.members[0].id);
      setParticipants(me.members.map((item) => item.id));
    }
  }, [assignUserId, me, setAssignUserId, setParticipants]);

  useEffect(() => {
    if (!me) return;
    const incomingDescriptions = Object.fromEntries((me.members || []).map((member) => [member.id, member.description || '']));
    const editingSettings = activeTab === 'settings';

    const profileDirty = name.trim() !== (lastSyncedProfileRef.current?.name || '').trim() || language !== (lastSyncedProfileRef.current?.language || language);
    const dormDirty = dormNameInput.trim() !== lastSyncedDormNameRef.current.trim();
    const botNameDirty = botNameInput.trim() !== lastSyncedBotNameRef.current.trim();
    const botMemoryDirty = Number(botMemoryWindowInput || 0) !== Number(lastSyncedBotMemoryWindowRef.current || 0);
    const botOtherDirty = botOtherContent !== lastSyncedBotOtherContentRef.current;
    const botSettingsDirty = !sameSettingsItems(botSettingsInput || [], lastSyncedBotSettingsRef.current || []);
    const botToolPermissionsDirty = !sameToolPermissions(botToolPermissionsInput || [], lastSyncedBotToolPermissionsRef.current || []);
    const memberDescDirty = !sameDescriptionMap(memberDescriptionsInput || {}, lastSyncedMemberDescriptionsRef.current || {});

    if (!editingSettings || !profileDirty) {
      if (name !== me.name) setName(me.name);
      if (language !== me.language) setLanguage(me.language);
    }
    if (!editingSettings || !dormDirty) {
      if (dormNameInput !== me.dormName) setDormNameInput(me.dormName);
    }
    if (!editingSettings || !botNameDirty) {
      const incomingBotName = me.botName || '';
      if (botNameInput !== incomingBotName) setBotNameInput(incomingBotName);
    }
    if (!editingSettings || !botMemoryDirty) {
      const incomingMemory = String(me.botMemoryWindow || 10);
      if (botMemoryWindowInput !== incomingMemory) setBotMemoryWindowInput(incomingMemory);
    }
    if (!editingSettings || !botSettingsDirty) {
      const incomingBotSettings = me.botSettings || [];
      if (!sameSettingsItems(botSettingsInput || [], incomingBotSettings)) {
        setBotSettingsInput(incomingBotSettings);
      }
    }
    if (!editingSettings || !botToolPermissionsDirty) {
      const incomingToolPermissions = me.botToolPermissions || [];
      if (!sameToolPermissions(botToolPermissionsInput || [], incomingToolPermissions)) {
        setBotToolPermissionsInput(incomingToolPermissions);
      }
    }
    if (!editingSettings || !botOtherDirty) {
      const incomingOther = me.botOtherContent || '';
      if (botOtherContent !== incomingOther) setBotOtherContent(incomingOther);
    }
    if (!editingSettings || !memberDescDirty) {
      if (!sameDescriptionMap(memberDescriptionsInput || {}, incomingDescriptions)) {
        setMemberDescriptionsInput(incomingDescriptions);
      }
    }

    lastSyncedProfileRef.current = { name: me.name.trim(), language: me.language };
    lastSyncedDormNameRef.current = me.dormName.trim();
    lastSyncedBotNameRef.current = (me.botName || '').trim();
    lastSyncedBotMemoryWindowRef.current = me.botMemoryWindow || 10;
    lastSyncedBotOtherContentRef.current = me.botOtherContent || '';
    lastSyncedBotSettingsRef.current = me.botSettings || [];
    lastSyncedBotToolPermissionsRef.current = me.botToolPermissions || [];
    lastSyncedMemberDescriptionsRef.current = incomingDescriptions;
    if (!targetLeaderId) {
      const candidate = me.members.find((item) => !item.isLeader);
      setTargetLeaderId(candidate?.id || null);
    }
  }, [
    lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedDormNameRef,
    lastSyncedMemberDescriptionsRef,
    lastSyncedProfileRef,
    me,
    activeTab,
    name,
    language,
    dormNameInput,
    botNameInput,
    botMemoryWindowInput,
    botSettingsInput,
    botToolPermissionsInput,
    botOtherContent,
    memberDescriptionsInput,
    setBotNameInput,
    setBotOtherContent,
    setBotSettingsInput,
    setBotToolPermissionsInput,
    setBotMemoryWindowInput,
    setDormNameInput,
    setLanguage,
    setMemberDescriptionsInput,
    setName,
    setTargetLeaderId,
    targetLeaderId,
  ]);

  useEffect(() => {
    const myId = me?.id;
    if (!myId) return;
    const mine = (statusRows || []).find((item) => item.userId === myId);
    if (mine?.state) setSelectedState(mine.state);
  }, [me?.id, setSelectedState, statusRows]);
}
