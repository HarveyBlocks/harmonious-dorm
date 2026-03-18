'use client';

import { Bell, Calendar, LayoutDashboard, MessageSquare, Settings, Users, Wallet } from 'lucide-react';

import { NavButton } from './nav-button';
import { resolveAvatar } from './helpers';
import type { ActiveTab } from './types';

export function SideNav(props: {
  t: any;
  activeTab: ActiveTab;
  unreadNoticeCount: number;
  avatarPath: string | null | undefined;
  meId: number;
  onNavigate: (tab: ActiveTab) => void;
}) {
  const p = props;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-0 md:left-0 md:w-20 lg:w-64 glass-card flex md:flex-col items-center justify-around md:justify-start py-4 md:py-8">
      <div className="hidden md:flex items-center gap-3 px-6 mb-12">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
          <Users className="text-white w-6 h-6" />
        </div>
        <span className="font-bold text-xl lg:block hidden">{p.t.dormTitle}</span>
      </div>

      <div className="flex md:flex-col gap-2 w-full px-2">
        <NavButton active={p.activeTab === 'dashboard'} onClick={() => p.onNavigate('dashboard')} icon={LayoutDashboard} label={p.t.home} />
        <NavButton active={p.activeTab === 'duty'} onClick={() => p.onNavigate('duty')} icon={Calendar} label={p.t.duty} />
        <NavButton active={p.activeTab === 'wallet'} onClick={() => p.onNavigate('wallet')} icon={Wallet} label={p.t.bills} />
        <NavButton active={p.activeTab === 'chat'} onClick={() => p.onNavigate('chat')} icon={MessageSquare} label={p.t.chat} />
        <NavButton active={p.activeTab === 'notifications'} onClick={() => p.onNavigate('notifications')} icon={Bell} label={p.t.notifications} badge={p.unreadNoticeCount} />
        <NavButton active={p.activeTab === 'settings'} onClick={() => p.onNavigate('settings')} icon={Settings} label={p.t.settings} />
      </div>

      <div className="hidden md:mt-auto md:flex flex-col items-center gap-4 w-full px-4">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/30">
          <img src={resolveAvatar(p.avatarPath, p.meId)} alt={p.t.userInfo} className="w-full h-full object-cover" />
        </div>
      </div>
    </nav>
  );
}
