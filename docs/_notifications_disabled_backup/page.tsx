'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiRequest } from '@/lib/client-api';
import type { NotificationPayload } from '@/lib/types';

type Filter = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');

  const listQuery = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => apiRequest<NotificationPayload[]>(`/api/notifications?status=${filter}`),
    refetchInterval: 15_000,
  });

  const readMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  return (
    <main className="max-w-4xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">通知中心</h1>
        <Link href="/" className="glass-card px-4 py-2 rounded-xl font-bold">返回首页</Link>
      </div>

      <div className="glass-card p-2 rounded-2xl mb-6 flex gap-2">
        {(['all', 'unread', 'read'] as Filter[]).map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`px-4 py-2 rounded-xl font-bold ${item === filter ? 'accent-bg' : 'glass-card'}`}>
            {item === 'all' ? '全部' : item === 'unread' ? '未读' : '已读'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(listQuery.data || []).map((notice) => (
          <article key={notice.id} className="glass-card p-4 rounded-2xl flex items-start justify-between gap-4">
            <div>
              <p className="font-black">{notice.title} {notice.unreadCount > 1 ? `(${notice.unreadCount})` : ''}</p>
              <p className="text-sm text-muted">{notice.content}</p>
              <p className="text-xs text-muted mt-1">{new Date(notice.updatedAt).toLocaleString()}</p>
            </div>

            <div className="flex gap-2">
              {notice.targetPath ? <Link href={notice.targetPath} className="glass-card px-3 py-2 rounded-lg text-sm font-bold">前往</Link> : null}
              {!notice.isRead ? <button onClick={() => readMutation.mutate(notice.id)} className="glass-card px-3 py-2 rounded-lg text-sm font-bold">标记已读</button> : null}
              <button onClick={() => deleteMutation.mutate(notice.id)} className="glass-card px-3 py-2 rounded-lg text-sm font-bold text-rose-500">删除</button>
            </div>
          </article>
        ))}
        {listQuery.data?.length === 0 ? <p className="text-muted">暂无通知</p> : null}
      </div>
    </main>
  );
}