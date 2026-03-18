'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { apiRequest } from '@/lib/client-api';
import { getUiText, LANG_OPTIONS, type LanguageCode } from '@/lib/i18n';
import type { MePayload } from '@/lib/types';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<MePayload>('/api/users/me'),
  });

  const me = meQuery.data;
  const t = getUiText(me?.language || 'zh-CN');

  const [name, setName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('zh-CN');
  const [dormName, setDormName] = useState('');
  const [targetLeaderId, setTargetLeaderId] = useState<number | null>(null);

  useMemo(() => {
    if (me) {
      setName(me.name);
      setLanguage(me.language);
      setDormName(me.dormName);
      if (!targetLeaderId) {
        const candidate = me.members.find((item) => !item.isLeader);
        setTargetLeaderId(candidate?.id || null);
      }
    }
  }, [me, targetLeaderId]);

  const profileMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ name, language }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const dormMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/dorm', {
        method: 'PUT',
        body: JSON.stringify({ name: dormName }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/dorm/transfer-leader', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetLeaderId }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  return (
    <main className="max-w-5xl mx-auto p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black">{t.settings}</h1>
        <Link href="/" className="glass-card px-4 py-2 rounded-xl font-bold">返回首页</Link>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-black">用户信息</h2>
          <label className="block text-sm font-bold">昵称</label>
          <input className="w-full p-3 rounded-xl glass-card" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="block text-sm font-bold">语言</label>
          <select className="w-full p-3 rounded-xl glass-card" value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
            {LANG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button onClick={() => profileMutation.mutate()} className="accent-bg px-4 py-3 rounded-xl font-bold w-full">保存用户配置</button>
          {profileMutation.error ? <p className="text-rose-500 text-sm">{(profileMutation.error as Error).message}</p> : null}
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-black">宿舍配置</h2>
          <label className="block text-sm font-bold">宿舍名称</label>
          <input className="w-full p-3 rounded-xl glass-card" value={dormName} onChange={(e) => setDormName(e.target.value)} />

          <button onClick={() => dormMutation.mutate()} className="accent-bg px-4 py-3 rounded-xl font-bold w-full">保存宿舍名称</button>
          {dormMutation.error ? <p className="text-rose-500 text-sm">{(dormMutation.error as Error).message}</p> : null}

          {me?.isLeader ? (
            <>
              <label className="block text-sm font-bold">移交舍长权限</label>
              <select className="w-full p-3 rounded-xl glass-card" value={targetLeaderId || ''} onChange={(e) => setTargetLeaderId(Number(e.target.value))}>
                {(me?.members || []).filter((item) => !item.isLeader).map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <button onClick={() => transferMutation.mutate()} className="glass-card px-4 py-3 rounded-xl font-bold w-full text-rose-500">移交舍长</button>
            </>
          ) : (
            <p className="text-sm text-muted">你不是舍长，无法移交权限</p>
          )}

          {transferMutation.error ? <p className="text-rose-500 text-sm">{(transferMutation.error as Error).message}</p> : null}
        </div>
      </section>
    </main>
  );
}
