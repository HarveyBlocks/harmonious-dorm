
import { useCallback } from 'react';

import { LIMITS } from '@/lib/limits';

export function useSettingsSaveActions(options: {
  me: any;
  name: string;
  setName: (v: string) => void;
  language: any;
  dormNameInput: string;
  setDormNameInput: (v: string) => void;
  botNameInput: string;
  setBotNameInput: (v: string) => void;
  botOtherContent: string;
  botSettingsInput: Array<{ key: string; value: string }>;
  memberDescriptionsInput: Record<number, string>;
  avatarFile: File | null;
  botAvatarFile: File | null;
  lastSyncedProfileRef: React.MutableRefObject<{ name: string; language: any } | null>;
  lastSyncedDormNameRef: React.MutableRefObject<string>;
  lastSyncedBotNameRef: React.MutableRefObject<string>;
  lastSyncedBotOtherContentRef: React.MutableRefObject<string>;
  lastSyncedBotSettingsRef: React.MutableRefObject<Array<{ key: string; value: string }>>;
  lastSyncedMemberDescriptionsRef: React.MutableRefObject<Record<number, string>>;
  updateProfileMutation: { isPending: boolean; mutate: (payload: { name: string; language: any }) => void };
  updateDormMutation: { isPending: boolean; mutate: (name: string) => void };
  updateBotMutation: { isPending: boolean; mutate: (name: string) => void };
  updateBotSettingsMutation: { isPending: boolean; mutate: (payload: { settings: Array<{ key: string; value: string }>; otherContent: string }) => void };
  updateDescriptionsMutation: { isPending: boolean; mutate: (payload: Array<{ userId: number; description: string }>) => void };
  uploadAvatarMutation: { isPending: boolean; mutate: (file: File) => void };
  uploadBotAvatarMutation: { isPending: boolean; mutate: (file: File) => void };
}) {
  const {
    me,
    name,
    setName,
    language,
    dormNameInput,
    setDormNameInput,
    botNameInput,
    setBotNameInput,
    botOtherContent,
    botSettingsInput,
    memberDescriptionsInput,
    avatarFile,
    botAvatarFile,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
    updateProfileMutation,
    updateDormMutation,
    updateBotMutation,
    updateBotSettingsMutation,
    updateDescriptionsMutation,
    uploadAvatarMutation,
    uploadBotAvatarMutation,
  } = options;

  const saveProfileNow = useCallback(() => {
    const synced = lastSyncedProfileRef.current;
    if (!me || !synced || updateProfileMutation.isPending) return;
    const trimmed = name.trim();
    const nextName = trimmed || synced.name;
    const nextLanguage = language;
    if (nextName === synced.name && nextLanguage === synced.language) return;
    if (!trimmed) setName(synced.name);
    updateProfileMutation.mutate({ name: nextName, language: nextLanguage });
  }, [language, lastSyncedProfileRef, me, name, setName, updateProfileMutation]);

  const saveDormNow = useCallback(() => {
    if (!me?.isLeader || updateDormMutation.isPending) return;
    const synced = lastSyncedDormNameRef.current;
    const trimmed = dormNameInput.trim();
    const nextDormName = trimmed || synced;
    if (!nextDormName || nextDormName === synced) return;
    if (!trimmed) setDormNameInput(synced);
    updateDormMutation.mutate(nextDormName);
  }, [dormNameInput, lastSyncedDormNameRef, me?.isLeader, setDormNameInput, updateDormMutation]);

  const saveBotNow = useCallback(() => {
    if (!me?.isLeader || updateBotMutation.isPending) return;
    const synced = lastSyncedBotNameRef.current;
    const trimmed = botNameInput.trim();
    const nextBotName = trimmed || synced;
    if (!nextBotName || nextBotName === synced) return;
    if (!trimmed) setBotNameInput(synced);
    updateBotMutation.mutate(nextBotName);
  }, [botNameInput, lastSyncedBotNameRef, me?.isLeader, setBotNameInput, updateBotMutation]);

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
  }, [
    botOtherContent,
    botSettingsInput,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    me?.isLeader,
    updateBotSettingsMutation,
  ]);

  const saveMemberDescriptionsNow = useCallback(() => {
    if (!me || updateDescriptionsMutation.isPending) return;
    const current = memberDescriptionsInput;
    const synced = lastSyncedMemberDescriptionsRef.current;
    const baseMembers = me.members || [];
    const targetMembers = me.isLeader ? baseMembers : baseMembers.filter((member: any) => member.id === me.id);
    const changed = targetMembers
      .map((member: any) => ({ userId: member.id, description: (current[member.id] || '').trim() }))
      .filter((item: any) => (synced[item.userId] || '') !== item.description);
    if (changed.length === 0) return;
    updateDescriptionsMutation.mutate(changed);
  }, [lastSyncedMemberDescriptionsRef, me, memberDescriptionsInput, updateDescriptionsMutation]);

  const saveAvatarNow = useCallback(() => {
    if (!avatarFile || uploadAvatarMutation.isPending) return;
    uploadAvatarMutation.mutate(avatarFile);
  }, [avatarFile, uploadAvatarMutation]);

  const saveBotAvatarNow = useCallback(() => {
    if (!botAvatarFile || uploadBotAvatarMutation.isPending) return;
    uploadBotAvatarMutation.mutate(botAvatarFile);
  }, [botAvatarFile, uploadBotAvatarMutation]);

  return {
    saveProfileNow,
    saveDormNow,
    saveBotNow,
    saveBotSettingsNow,
    saveMemberDescriptionsNow,
    saveAvatarNow,
    saveBotAvatarNow,
  };
}
