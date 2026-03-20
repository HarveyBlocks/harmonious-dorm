import type { MutableRefObject } from 'react';
import { useMutation, type QueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/client-api';
import { LIMITS } from '@/lib/limits';
import { allocateAmounts } from '@/lib/share-allocation';
import type { DormState } from '@/lib/types';
import { BILL_CATEGORY_CUSTOM } from '@/components/dorm-hub/ui-constants';
import { dispatchToast } from '@/components/dorm-hub/ui-helpers';

type ErrorText = {
  chooseMember: string;
  invalidDate: string;
  dutyTaskRequired: string;
  dutyTaskTooLong: string;
  amountRequired: string;
  amountNotNumber: string;
  amountGtZero: string;
  amountMax: string;
  amountDecimal: string;
  participantsRequired: string;
  customCategoryRequired: string;
  weightInvalid: string;
  weightTooLarge: string;
  weightAllZero: string;
  messageRequired: string;
  messageTooLong: string;
};

export function useDormMutations(options: {
  queryClient: QueryClient;
  eText: ErrorText;
  assignUserId: number | null;
  assignDate: string;
  dutyTask: string;
  setDutyTask: (value: string) => void;
  billTotal: string;
  billCategory: string;
  customCategory: string;
  participants: number[];
  participantWeights: Record<number, string>;
  billUseWeights: boolean;
  setBillTotal: (value: string) => void;
  setCustomCategory: (value: string) => void;
  setBillUseWeights: (value: boolean) => void;
  setParticipantWeights: (value: Record<number, string>) => void;
  chatInput: string;
  setChatInput: (value: string) => void;
  chatForceBottomOnNextLayoutRef: MutableRefObject<boolean>;
}) {
  const {
    queryClient,
    eText,
    assignUserId,
    assignDate,
    dutyTask,
    setDutyTask,
    billTotal,
    billCategory,
    customCategory,
    participants,
    participantWeights,
    billUseWeights,
    setBillTotal,
    setCustomCategory,
    setBillUseWeights,
    setParticipantWeights,
    chatInput,
    setChatInput,
    chatForceBottomOnNextLayoutRef,
  } = options;

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assignUserId) throw new Error(eText.chooseMember);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) throw new Error(eText.invalidDate);
      const task = dutyTask.trim();
      if (!task) throw new Error(eText.dutyTaskRequired);
      if (task.length > LIMITS.DUTY_TASK) throw new Error(eText.dutyTaskTooLong);
      return apiRequest('/api/duty/assign', {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, date: assignDate, task }),
      });
    },
    onSuccess: () => {
      setDutyTask('');
      void queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const toggleDutyMutation = useMutation({
    mutationFn: (payload: { dutyId: number; completed: boolean }) =>
      apiRequest('/api/duty/complete', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['duty', 'all'] }),
  });

  const deleteDutyMutation = useMutation({
    mutationFn: (dutyId: number) => apiRequest(`/api/duty/${dutyId}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['duty', 'all'] }),
  });

  const createBillMutation = useMutation({
    mutationFn: () => {
      const total = Number(billTotal);
      if (!billTotal.trim()) throw new Error(eText.amountRequired);
      if (Number.isNaN(total)) throw new Error(eText.amountNotNumber);
      if (total <= 0) throw new Error(eText.amountGtZero);
      if (total > 1_000_000) throw new Error(eText.amountMax);
      if (!Number.isInteger(total * 100)) throw new Error(eText.amountDecimal);
      if (!participants.length) throw new Error(eText.participantsRequired);
      if (billCategory === BILL_CATEGORY_CUSTOM && !customCategory.trim()) throw new Error(eText.customCategoryRequired);

      const weightedRows = participants.map((userId) => {
        const raw = participantWeights[userId];
        const parsed = raw == null || raw === '' ? 1 : Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0) throw new Error(eText.weightInvalid);
        if (parsed > LIMITS.BILL_WEIGHT) throw new Error(eText.weightTooLarge);
        return { userId, weight: parsed };
      });
      const amountMap = allocateAmounts(total, participants, weightedRows);
      if (amountMap.size === 0) throw new Error(eText.weightAllZero);

      return apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          total,
          description: billCategory === BILL_CATEGORY_CUSTOM ? customCategory.trim() : null,
          category: billCategory === BILL_CATEGORY_CUSTOM ? 'other' : billCategory,
          customCategory: billCategory === BILL_CATEGORY_CUSTOM ? customCategory.trim() : null,
          participants,
          participantWeights: billUseWeights ? weightedRows : undefined,
        }),
      });
    },
    onSuccess: () => {
      setBillTotal('');
      setCustomCategory('');
      setBillUseWeights(false);
      setParticipantWeights({});
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: (payload: { billId: number; paid: boolean }) =>
      apiRequest(`/api/bills/${payload.billId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paid: payload.paid }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (state: DormState) =>
      apiRequest('/api/status', {
        method: 'PUT',
        body: JSON.stringify({ state }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['status'] }),
  });

  const sendChatMutation = useMutation({
    mutationFn: (content: string) => {
      return apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
    },
  });

  const sendChat = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      dispatchToast('error', eText.messageRequired);
      return;
    }
    if (trimmed.length > LIMITS.CHAT_USER_CONTENT) {
      dispatchToast('error', eText.messageTooLong);
      return;
    }
    chatForceBottomOnNextLayoutRef.current = true;
    setChatInput('');
    sendChatMutation.mutate(trimmed);
  };

  return {
    assignMutation,
    toggleDutyMutation,
    deleteDutyMutation,
    createBillMutation,
    togglePaidMutation,
    updateStatusMutation,
    sendChatMutation,
    sendChat,
  };
}
