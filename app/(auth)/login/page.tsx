'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { LogIn, Users } from 'lucide-react';

import { apiRequest, markAppNavigating } from '@/lib/client-api';
import { getUiText, type LanguageCode } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const initialLang =
    typeof window !== 'undefined'
      ? ((window.localStorage.getItem('app_lang') as LanguageCode) || 'zh-CN')
      : 'zh-CN';
  const [lang] = useState<LanguageCode>(initialLang);
  const t = useMemo(() => getUiText(lang), [lang]);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    markAppNavigating(false);
    (window as Window & { __APP_LOGIN_REDIRECTING__?: boolean }).__APP_LOGIN_REDIRECTING__ = false;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          name: mode === 'register' ? name : undefined,
          email,
          mode,
          inviteCode: mode === 'register' ? inviteCode || undefined : undefined,
        }),
      });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-card p-8 rounded-2xl shadow-xl bg-white">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Users className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold">{t.loginTitle}</h1>
          <p className="text-slate-500 mt-2">{t.loginSubTitle}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`py-2 rounded-xl font-bold ${mode === 'login' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              {t.loginMode}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`py-2 rounded-xl font-bold ${mode === 'register' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              {t.registerMode}
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t.schoolEmail}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="name@example.com" />
          </div>
          {mode === 'register' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.nickname}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder={t.inputNickname} />
            </div>
          ) : null}
          {mode === 'register' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t.inviteCodeForRegister}</label>
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                type="text"
                className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder={t.createDormHint}
              />
            </div>
          ) : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button disabled={loading} type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            <LogIn className="w-5 h-5" />
            {loading ? t.entering : mode === 'login' ? t.loginMode : t.registerMode}
          </button>
          <button
            type="button"
            className="w-full py-2 text-sm font-bold text-indigo-600"
            onClick={() => {
              setMode((prev) => (prev === 'login' ? 'register' : 'login'));
              setError('');
            }}
          >
            {mode === 'login' ? t.switchToRegister : t.switchToLogin}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
