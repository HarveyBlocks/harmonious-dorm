'use client';

import { useEffect, useRef } from 'react';

import { autoResizeTextarea } from '../helpers';
import type { ActiveTab } from '../types';

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
  botOtherContent: string;
  botSettingsInput: Array<{ key: string; value: string }>;
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
    botOtherContent,
    botSettingsInput,
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
  const lastActiveTabRef = useRef<ActiveTab>('dashboard');

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
    profileSaveTimerRef.current = setTimeout(saveProfileNow, 900);
    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
    };
  }, [activeTab, hasMe, language, name, saveProfileNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (dormSaveTimerRef.current) clearTimeout(dormSaveTimerRef.current);
    dormSaveTimerRef.current = setTimeout(saveDormNow, 900);
    return () => {
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
    };
  }, [activeTab, dormNameInput, isLeader, saveDormNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (botSaveTimerRef.current) clearTimeout(botSaveTimerRef.current);
    botSaveTimerRef.current = setTimeout(saveBotNow, 900);
    return () => {
      if (botSaveTimerRef.current) {
        clearTimeout(botSaveTimerRef.current);
        botSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botNameInput, isLeader, saveBotNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !isLeader) return;
    if (botSettingsSaveTimerRef.current) clearTimeout(botSettingsSaveTimerRef.current);
    botSettingsSaveTimerRef.current = setTimeout(saveBotSettingsNow, 900);
    return () => {
      if (botSettingsSaveTimerRef.current) {
        clearTimeout(botSettingsSaveTimerRef.current);
        botSettingsSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botOtherContent, botSettingsInput, isLeader, saveBotSettingsNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !hasMe) return;
    if (memberDescriptionsSaveTimerRef.current) clearTimeout(memberDescriptionsSaveTimerRef.current);
    memberDescriptionsSaveTimerRef.current = setTimeout(saveMemberDescriptionsNow, 900);
    return () => {
      if (memberDescriptionsSaveTimerRef.current) {
        clearTimeout(memberDescriptionsSaveTimerRef.current);
        memberDescriptionsSaveTimerRef.current = null;
      }
    };
  }, [activeTab, hasMe, memberDescriptionsInput, saveMemberDescriptionsNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !avatarFile) return;
    if (avatarSaveTimerRef.current) clearTimeout(avatarSaveTimerRef.current);
    avatarSaveTimerRef.current = setTimeout(saveAvatarNow, 1200);
    return () => {
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
    };
  }, [activeTab, avatarFile, saveAvatarNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !botAvatarFile || !isLeader) return;
    if (botAvatarSaveTimerRef.current) clearTimeout(botAvatarSaveTimerRef.current);
    botAvatarSaveTimerRef.current = setTimeout(saveBotAvatarNow, 1200);
    return () => {
      if (botAvatarSaveTimerRef.current) {
        clearTimeout(botAvatarSaveTimerRef.current);
        botAvatarSaveTimerRef.current = null;
      }
    };
  }, [activeTab, botAvatarFile, isLeader, saveBotAvatarNow]);

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
    },
    [],
  );
}
