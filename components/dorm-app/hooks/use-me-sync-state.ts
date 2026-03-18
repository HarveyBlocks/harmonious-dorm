
import React, { useEffect } from 'react';

import type { LanguageCode } from '@/lib/i18n';
import type { DormState, MePayload } from '@/lib/types';

export function useMeSyncState(options: {
  me: MePayload | undefined;
  statusRows: Array<{ userId: number; state: DormState }> | undefined;
  assignUserId: number | null;
  setAssignUserId: (value: number | null) => void;
  setParticipants: (value: number[]) => void;
  setName: (value: string) => void;
  setLanguage: (value: LanguageCode) => void;
  setDormNameInput: (value: string) => void;
  setBotNameInput: (value: string) => void;
  setBotSettingsInput: (value: Array<{ key: string; value: string }>) => void;
  setBotOtherContent: (value: string) => void;
  setMemberDescriptionsInput: (value: Record<number, string>) => void;
  lastSyncedProfileRef: React.MutableRefObject<{ name: string; language: LanguageCode } | null>;
  lastSyncedDormNameRef: React.MutableRefObject<string>;
  lastSyncedBotNameRef: React.MutableRefObject<string>;
  lastSyncedBotOtherContentRef: React.MutableRefObject<string>;
  lastSyncedBotSettingsRef: React.MutableRefObject<Array<{ key: string; value: string }>>;
  lastSyncedMemberDescriptionsRef: React.MutableRefObject<Record<number, string>>;
  targetLeaderId: number | null;
  setTargetLeaderId: (value: number | null) => void;
  setSelectedState: (value: DormState) => void;
}) {
  const {
    me,
    statusRows,
    assignUserId,
    setAssignUserId,
    setParticipants,
    setName,
    setLanguage,
    setDormNameInput,
    setBotNameInput,
    setBotSettingsInput,
    setBotOtherContent,
    setMemberDescriptionsInput,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
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
    setName(me.name);
    setLanguage(me.language);
    setDormNameInput(me.dormName);
    setBotNameInput(me.botName || '');
    setBotSettingsInput(me.botSettings || []);
    setBotOtherContent(me.botOtherContent || '');
    setMemberDescriptionsInput(Object.fromEntries((me.members || []).map((member) => [member.id, member.description || ''])));
    lastSyncedProfileRef.current = { name: me.name.trim(), language: me.language };
    lastSyncedDormNameRef.current = me.dormName.trim();
    lastSyncedBotNameRef.current = (me.botName || '').trim();
    lastSyncedBotOtherContentRef.current = me.botOtherContent || '';
    lastSyncedBotSettingsRef.current = me.botSettings || [];
    lastSyncedMemberDescriptionsRef.current = Object.fromEntries((me.members || []).map((member) => [member.id, member.description || '']));
    if (!targetLeaderId) {
      const candidate = me.members.find((item) => !item.isLeader);
      setTargetLeaderId(candidate?.id || null);
    }
  }, [
    lastSyncedBotNameRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedDormNameRef,
    lastSyncedMemberDescriptionsRef,
    lastSyncedProfileRef,
    me,
    setBotNameInput,
    setBotOtherContent,
    setBotSettingsInput,
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
