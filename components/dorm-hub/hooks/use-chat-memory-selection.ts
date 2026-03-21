import { useCallback, useEffect, useMemo } from 'react';

import { dispatchToast } from '@/components/dorm-hub/ui-helpers';
import type { ChatMessage } from '@/components/dorm-hub/ui-types';

type TogglePrivacyMutation = {
  mutate: (input: { messageId: number; isPrivateForBot: boolean }) => void;
};

type Input = {
  meId: number | null | undefined;
  dormId: number | null | undefined;
  botMemoryWindow: number | null | undefined;
  t: any;
  liveMessages: ChatMessage[];
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  togglePrivacyMutation: TogglePrivacyMutation;
};

export function useChatMemorySelection(input: Input) {
  const { meId, dormId, botMemoryWindow, t, liveMessages, selectedIds, setSelectedIds, togglePrivacyMutation } = input;

  const storageKey = useMemo(() => {
    if (!meId || !dormId) return null;
    return `chat-robot-memory-selection:${dormId}:${meId}`;
  }, [dormId, meId]);

  const privateIdSet = useMemo(() => {
    return new Set(liveMessages.filter((item) => item.isPrivateForBot).map((item) => item.id));
  }, [liveMessages]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as number[];
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.filter((id) => Number.isInteger(id) && id > 0);
      setSelectedIds(normalized);
    } catch {
      setSelectedIds([]);
    }
  }, [setSelectedIds, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(selectedIds));
  }, [selectedIds, storageKey]);

  useEffect(() => {
    if (!selectedIds.length) return;
    const filtered = selectedIds.filter((id) => !privateIdSet.has(id));
    if (filtered.length === selectedIds.length) return;
    setSelectedIds(filtered);
  }, [privateIdSet, selectedIds, setSelectedIds]);

  const toggleMessage = useCallback((messageId: number) => {
    if (privateIdSet.has(messageId)) {
      dispatchToast('error', t.privateMessageCannotJoinRobotMemory);
      return;
    }
    const maxContext = Math.max(1, botMemoryWindow || 10);
    const exists = selectedIds.includes(messageId);
    if (exists) {
      setSelectedIds(selectedIds.filter((id) => id !== messageId));
      return;
    }
    if (selectedIds.length >= maxContext) {
      dispatchToast('error', t.robotMemorySelectionLimitReached);
      return;
    }
    setSelectedIds([...selectedIds, messageId]);
  }, [botMemoryWindow, privateIdSet, selectedIds, setSelectedIds, t.privateMessageCannotJoinRobotMemory, t.robotMemorySelectionLimitReached]);

  const isSelected = useCallback((messageId: number) => selectedIds.includes(messageId), [selectedIds]);
  const isPrivate = useCallback((messageId: number) => privateIdSet.has(messageId), [privateIdSet]);

  const togglePrivacy = useCallback((messageId: number) => {
    const nextPrivate = !privateIdSet.has(messageId);
    if (nextPrivate && selectedIds.includes(messageId)) {
      setSelectedIds(selectedIds.filter((id) => id !== messageId));
    }
    togglePrivacyMutation.mutate({ messageId, isPrivateForBot: nextPrivate });
  }, [privateIdSet, selectedIds, setSelectedIds, togglePrivacyMutation]);

  return { toggleMessage, isSelected, isPrivate, togglePrivacy };
}
