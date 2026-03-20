
import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import type { MutableRefObject } from 'react';

import { apiRequest, markAppNavigating } from '@/lib/client-api';
import type { NotificationFilter } from '@/components/dorm-hub/ui-types';

type NoticeType = 'chat' | 'bill' | 'duty' | 'settings' | 'dorm' | 'leader';

function preferredLangHeader(): string {
  if (typeof window === 'undefined') return 'zh-CN';
  return window.localStorage.getItem('app_lang') || 'zh-CN';
}

function disconnectSocketQuietly(socketRef: MutableRefObject<Socket | null>) {
  try {
    socketRef.current?.disconnect();
  } catch {
    // ignore intentional disconnect errors
  }
  socketRef.current = null;
}

export function useNoticeAuthMutations(options: {
  queryClient: QueryClient;
  notificationFilter: NotificationFilter;
  socketRef: MutableRefObject<Socket | null>;
}) {
  const { queryClient, notificationFilter, socketRef } = options;

  const readNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const readSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const autoReadByTypeMutation = useMutation({
    mutationFn: (type: NoticeType) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: 'unread',
          selectAll: true,
          ids: [],
          types: [type],
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (typeof window === 'undefined') return;
      markAppNavigating(true);
      disconnectSocketQuietly(socketRef);
      queryClient.clear();
      void fetch('/api/logout', {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'x-app-lang': preferredLangHeader(),
        },
        body: JSON.stringify({}),
      }).catch(() => {
        // ignore: user is leaving this page intentionally
      });
      window.location.replace('/login');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest<{ success: true }>('/api/users/me', { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      markAppNavigating(true);
      disconnectSocketQuietly(socketRef);
      queryClient.clear();
      if (typeof window !== 'undefined') window.location.replace('/login');
    },
  });

  return {
    readNoticeMutation,
    readSelectedNoticeMutation,
    deleteSelectedNoticeMutation,
    autoReadByTypeMutation,
    deleteNoticeMutation,
    logoutMutation,
    deleteAccountMutation,
  };
}
