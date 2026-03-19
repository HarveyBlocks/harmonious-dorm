
import { BookOpen, Coffee, Moon, Music, Users } from 'lucide-react';
import { motion } from 'motion/react';

import { STATE_DOT, STATUS_COLOR } from '@/lib/theme/status-colors';

import { stateLabel } from '../ui-helpers';

export function DashboardTab(props: {
  t: any;
  me: any;
  displayUsers: any[];
}) {
  const p = props;

  return (
    <motion.div key="dash" animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-card sleep-depth-near p-8 rounded-2xl accent-bg relative overflow-hidden shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <Coffee className="absolute right-8 top-8 w-10 h-10 rotate-12" />
          <Moon className="absolute right-24 bottom-12 w-12 h-12 -rotate-12" />
          <Music className="absolute left-10 bottom-8 w-8 h-8 rotate-6" />
          <BookOpen className="absolute left-24 top-10 w-9 h-9 -rotate-6" />
        </div>
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">{p.t.dormTitle}</h2>
          <p className="text-lg opacity-90 max-w-md font-medium">{p.t.notifyRealtimeDesc}</p>
        </div>
      </div>

      <div className="glass-card sleep-depth-mid p-6 rounded-xl">
        <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Users className="w-5 h-5 accent-text" /> {p.t.memberActivity}</h3>
        <div className="space-y-4">
          {p.displayUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/10 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200/20" alt="" />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${STATE_DOT[user.state] || STATUS_COLOR[user.status as keyof typeof STATUS_COLOR]}`} />
                </div>
                <div>
                  <p className="font-bold">{user.name} {user.role === 'leader' && <span className="text-[10px] accent-bg px-1.5 py-0.5 rounded-md ml-1">{p.t.leaderTag}</span>}</p>
                  <p className="text-xs text-muted">{stateLabel(p.me?.language || 'zh-CN', user.state)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
