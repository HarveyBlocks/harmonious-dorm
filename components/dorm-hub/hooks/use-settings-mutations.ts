
import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { MutableRefObject } from 'react';

import { apiRequest } from '@/lib/client-api';
import type { LanguageCode } from '@/lib/i18n';

type ErrorText = {
  dormNameRequired: string;
  transferTargetRequired: string;
  avatarUploadFailed: string;
};

export function useSettingsMutations(options: {
  queryClient: QueryClient;
  eText: ErrorText;
  targetLeaderId: number | null;
  setAvatarFile: (value: File | null) => void;
  setBotAvatarFile: (value: File | null) => void;
  lastSyncedProfileRef: MutableRefObject<{ name: string; language: LanguageCode } | null>;
  lastSyncedDormNameRef: MutableRefObject<string>;
  lastSyncedBotNameRef: MutableRefObject<string>;
  lastSyncedBotMemoryWindowRef: MutableRefObject<number>;
  lastSyncedBotOtherContentRef: MutableRefObject<string>;
  lastSyncedBotSettingsRef: MutableRefObject<Array<{ key: string; value: string }>>;
  lastSyncedMemberDescriptionsRef: MutableRefObject<Record<number, string>>;
}) {
  const {
    queryClient,
    eText,
    targetLeaderId,
    setAvatarFile,
    setBotAvatarFile,
    lastSyncedProfileRef,
    lastSyncedDormNameRef,
    lastSyncedBotNameRef,
    lastSyncedBotMemoryWindowRef,
    lastSyncedBotOtherContentRef,
    lastSyncedBotSettingsRef,
    lastSyncedMemberDescriptionsRef,
  } = options;

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { name: string; language: LanguageCode }) =>
      apiRequest('/api/users/me', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: (_, payload) => {
      if (typeof window !== 'undefined') window.localStorage.setItem('app_lang', payload.language);
      lastSyncedProfileRef.current = { name: payload.name.trim(), language: payload.language };
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateDormMutation = useMutation({
    mutationFn: (dormName: string) => {
      if (!dormName.trim()) throw new Error(eText.dormNameRequired);
      return apiRequest('/api/dorm', { method: 'PUT', body: JSON.stringify({ name: dormName }) });
    },
    onSuccess: (_, dormName) => {
      lastSyncedDormNameRef.current = dormName.trim();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateBotMutation = useMutation({
    mutationFn: (botName: string) =>
      apiRequest<{ name: string; avatarPath: string | null }>('/api/dorm/bot', {
        method: 'PUT',
        body: JSON.stringify({ name: botName }),
      }),
    onSuccess: (_, botName) => {
      lastSyncedBotNameRef.current = botName.trim();
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateBotSettingsMutation = useMutation({
    mutationFn: (payload: { settings: Array<{ key: string; value: string }>; otherContent: string; memoryWindow: number }) =>
      apiRequest<{ settings: Array<{ key: string; value: string }>; otherContent: string; memoryWindow: number }>('/api/dorm/bot/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      lastSyncedBotSettingsRef.current = payload.settings
        .map((item) => ({ key: item.key.trim(), value: item.value }))
        .filter((item) => item.key.length > 0);
      lastSyncedBotOtherContentRef.current = payload.otherContent.trim();
      lastSyncedBotMemoryWindowRef.current = payload.memoryWindow;
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateDescriptionsMutation = useMutation({
    mutationFn: (items: Array<{ userId: number; description: string }>) =>
      apiRequest<{ success: true }>('/api/users/descriptions', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }),
    onSuccess: (_, items) => {
      const next = { ...lastSyncedMemberDescriptionsRef.current };
      for (const item of items) next[item.userId] = item.description;
      lastSyncedMemberDescriptionsRef.current = next;
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!targetLeaderId) throw new Error(eText.transferTargetRequired);
      return apiRequest('/api/dorm/transfer-leader', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetLeaderId }),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/users/avatar', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || eText.avatarUploadFailed);
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      setAvatarFile(null);
    },
  });

  const uploadBotAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/dorm/bot/avatar', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || eText.avatarUploadFailed);
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      setBotAvatarFile(null);
    },
  });

  return {
    updateProfileMutation,
    updateDormMutation,
    updateBotMutation,
    updateBotSettingsMutation,
    updateDescriptionsMutation,
    transferMutation,
    uploadAvatarMutation,
    uploadBotAvatarMutation,
  };
}
