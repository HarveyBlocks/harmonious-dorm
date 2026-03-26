import React, { useEffect, useRef } from 'react';

import { autoResizeTextarea } from '../ui-helpers';
import type { ActiveTab } from '../ui-types';

export function useSettingsAutoSave(options: {
  activeTab: ActiveTab;
  isLeader: boolean;
  hasMe: boolean;
  botOtherEditing: boolean;
  botOtherTextareaRef: React.RefObject<HTMLTextAreaElement>;
  name: string;
  language: string;
  dormNameInput: string;
  botNameInput: string;
  botMemoryWindowInput: string;
  botOtherContent: string;
  botSettingsInput: Array<{ key: string; value: string }>;
  botToolPermissionsInput: Array<{ tool: string; permission: 'allow' | 'deny' }>;
  memberDescriptionsInput: Record<number, string>;
  avatarFile: File | null;
  botAvatarFile: File | null;
  saveProfileNow: () => void;
  saveDormNow: () => void;
  saveBotNow: () => void;
  saveBotSettingsNow: () => void;
  saveMemberDescriptionsNow: () => void;
  saveAvatarNow: () => void;
  saveBotAvatarNow: () => void;
}) {
  const {
    activeTab,
    isLeader,
    hasMe,
    botOtherEditing,
    botOtherTextareaRef,
    name,
    language,
    dormNameInput,
    botNameInput,
    botMemoryWindowInput,
    botOtherContent,
    botSettingsInput,
    botToolPermissionsInput,
    memberDescriptionsInput,
    avatarFile,
    botAvatarFile,
    saveProfileNow,
    saveDormNow,
    saveBotNow,
    saveBotSettingsNow,
    saveMemberDescriptionsNow,
    saveAvatarNow,
    saveBotAvatarNow,
  } = options;

  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dormSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botAvatarSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botSettingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memberDescriptionsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const periodicFlushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActiveTabRef = useRef<ActiveTab>('dashboard');
  const INPUT_DEBOUNCE_MS = 900;
  const AVATAR_DEBOUNCE_MS = 1200;
  const PERIODIC_FLUSH_MS = 3000;

  useEffect(() => {
    if (!botOtherEditing) return;
    const el = botOtherTextareaRef.current;
    if (!el) return;
    autoResizeTextarea(el);
    el.focus();
  }, [botOtherEditing, botOtherTextareaRef]);

  useEffect(() => {
    if (activeTab !== 'settings' || !hasMe) return;
    if (profileSaveTimerRef.current) clearTimeout(profileSaveTimerRef.current);
    profileSaveTimerRef.current = setTimeout(saveProfileNow, INPUT_DEBOUNCE_MS);
    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
    };
  }, [INPUT_DEBOUNCE_MS, activeTab, hasMe, language, name, saveProfileNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (dormSaveTimerRef.current) clearTimeout(dormSaveTimerRef.current);
    dormSaveTimerRef.current = setTimeout(saveDormNow, INPUT_DEBOUNCE_MS);
    return () => {
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
    };
  }, [INPUT_DEBOUNCE_MS, activeTab, dormNameInput, isLeader, saveDormNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (botSaveTimerRef.current) clearTimeout(botSaveTimerRef.current);
    botSaveTimerRef.current = setTimeout(saveBotNow, INPUT_DEBOUNCE_MS);
    return () => {
      if (botSaveTimerRef.current) {
        clearTimeout(botSaveTimerRef.current);
        botSaveTimerRef.current = null;
      }
    };
  }, [INPUT_DEBOUNCE_MS, activeTab, botNameInput, isLeader, saveBotNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (botSettingsSaveTimerRef.current) clearTimeout(botSettingsSaveTimerRef.current);
    botSettingsSaveTimerRef.current = setTimeout(saveBotSettingsNow, INPUT_DEBOUNCE_MS);
    return () => {
      if (botSettingsSaveTimerRef.current) {
        clearTimeout(botSettingsSaveTimerRef.current);
        botSettingsSaveTimerRef.current = null;
      }
    };
  }, [INPUT_DEBOUNCE_MS, activeTab, botMemoryWindowInput, botOtherContent, botSettingsInput, botToolPermissionsInput, isLeader, saveBotSettingsNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !hasMe) return;
    if (memberDescriptionsSaveTimerRef.current) clearTimeout(memberDescriptionsSaveTimerRef.current);
    memberDescriptionsSaveTimerRef.current = setTimeout(saveMemberDescriptionsNow, INPUT_DEBOUNCE_MS);
    return () => {
      if (memberDescriptionsSaveTimerRef.current) {
        clearTimeout(memberDescriptionsSaveTimerRef.current);
        memberDescriptionsSaveTimerRef.current = null;
      }
    };
  }, [INPUT_DEBOUNCE_MS, activeTab, hasMe, memberDescriptionsInput, saveMemberDescriptionsNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !avatarFile) return;
    if (avatarSaveTimerRef.current) clearTimeout(avatarSaveTimerRef.current);
    avatarSaveTimerRef.current = setTimeout(saveAvatarNow, AVATAR_DEBOUNCE_MS);
    return () => {
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
    };
  }, [AVATAR_DEBOUNCE_MS, activeTab, avatarFile, saveAvatarNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !botAvatarFile || !isLeader) return;
    if (botAvatarSaveTimerRef.current) clearTimeout(botAvatarSaveTimerRef.current);
    botAvatarSaveTimerRef.current = setTimeout(saveBotAvatarNow, AVATAR_DEBOUNCE_MS);
    return () => {
      if (botAvatarSaveTimerRef.current) {
        clearTimeout(botAvatarSaveTimerRef.current);
        botAvatarSaveTimerRef.current = null;
      }
    };
  }, [AVATAR_DEBOUNCE_MS, activeTab, botAvatarFile, isLeader, saveBotAvatarNow]);

  useEffect(() => {
    if (activeTab !== 'settings') return;
    if (periodicFlushTimerRef.current) clearInterval(periodicFlushTimerRef.current);
    periodicFlushTimerRef.current = setInterval(() => {
      saveProfileNow();
      saveDormNow();
      saveBotNow();
      saveBotSettingsNow();
      saveMemberDescriptionsNow();
      saveAvatarNow();
      saveBotAvatarNow();
    }, PERIODIC_FLUSH_MS);

    return () => {
      if (periodicFlushTimerRef.current) {
        clearInterval(periodicFlushTimerRef.current);
        periodicFlushTimerRef.current = null;
      }
    };
  }, [
    PERIODIC_FLUSH_MS,
    activeTab,
    saveAvatarNow,
    saveBotAvatarNow,
    saveBotNow,
    saveBotSettingsNow,
    saveDormNow,
    saveMemberDescriptionsNow,
    saveProfileNow,
  ]);

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
  }, [
    activeTab,
    saveAvatarNow,
    saveBotAvatarNow,
    saveBotNow,
    saveBotSettingsNow,
    saveDormNow,
    saveMemberDescriptionsNow,
    saveProfileNow,
  ]);

  useEffect(
    () => () => {
      if (profileSaveTimerRef.current) clearTimeout(profileSaveTimerRef.current);
      if (dormSaveTimerRef.current) clearTimeout(dormSaveTimerRef.current);
      if (botSaveTimerRef.current) clearTimeout(botSaveTimerRef.current);
      if (botSettingsSaveTimerRef.current) clearTimeout(botSettingsSaveTimerRef.current);
      if (memberDescriptionsSaveTimerRef.current) clearTimeout(memberDescriptionsSaveTimerRef.current);
      if (avatarSaveTimerRef.current) clearTimeout(avatarSaveTimerRef.current);
      if (botAvatarSaveTimerRef.current) clearTimeout(botAvatarSaveTimerRef.current);
      if (periodicFlushTimerRef.current) clearInterval(periodicFlushTimerRef.current);
    },
    [],
  );
}
