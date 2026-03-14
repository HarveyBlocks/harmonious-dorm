/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Calendar, Wallet, Settings, Bell, Moon, BookOpen, Coffee, Music,
  CheckCircle2, Circle, Plus, ChevronRight, Users, MessageSquare, X, Trash2, LogOut, Save,
  UserPlus, Send, CreditCard, ArrowUpRight, ArrowDownLeft, LogIn, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Duty, Expense, DormMode, ChatMessage, Notification } from './types';

// Initial Data
const INITIAL_USERS: User[] = [
  { id: '1', name: '张伟', avatar: 'https://picsum.photos/seed/user1/100/100', status: 'online', role: 'leader' },
  { id: '2', name: '李华', avatar: 'https://picsum.photos/seed/user2/100/100', status: 'busy', role: 'member' },
  { id: '3', name: '王强', avatar: 'https://picsum.photos/seed/user3/100/100', status: 'sleeping', role: 'member' },
];

export default function App() {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // App State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'duty' | 'wallet' | 'chat'>('dashboard');
  const [dormMode, setDormMode] = useState<DormMode>('normal');
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [duties, setDuties] = useState<Duty[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNotifyOpen, setIsNotifyOpen] = useState(false);
  
  // Form States
  const [dormInfo, setDormInfo] = useState({ name: '302寝室', room: '302' });
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Theme Class
  const themeClass = useMemo(() => {
    let classes = dormMode === 'sleep' ? 'dark-mode' : '';
    if (dormMode === 'study') classes += ' study-mode';
    if (dormMode === 'party') classes += ' party-mode';
    return classes;
  }, [dormMode]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handlers
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users[0]; // Mock login as first user
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !currentUser) return;
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([...messages, newMessage]);
    setChatInput('');
  };

  const addMember = (name: string) => {
    const newUser: User = {
      id: Date.now().toString(),
      name,
      avatar: `https://picsum.photos/seed/${name}/100/100`,
      status: 'online',
      role: 'member'
    };
    setUsers([...users, newUser]);
  };

  const removeMember = (id: string) => {
    if (users.length <= 1) return;
    setUsers(users.filter(u => u.id !== id));
  };

  const addNotification = (title: string, content: string, type: Notification['type'] = 'info') => {
    const newNotify: Notification = {
      id: Date.now().toString(),
      title,
      content,
      type,
      timestamp: '刚刚',
      read: false
    };
    setNotifications([newNotify, ...notifications]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-card p-8 rounded-2xl shadow-xl bg-white">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Users className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold">和睦寝室</h1>
            <p className="text-slate-500 mt-2">校园宿舍生活可视化协调平台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">学号 / 用户名</label>
              <input type="text" required className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="请输入您的账号" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input type="password" required className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              {authMode === 'login' ? '立即登录' : '注册账号'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="text-indigo-600 font-medium text-sm">
              {authMode === 'login' ? '没有账号？立即注册' : '已有账号？返回登录'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeClass}`}>
      {/* Sidebar / Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-0 md:left-0 md:w-20 lg:w-64 glass-card flex md:flex-col items-center justify-around md:justify-start py-4 md:py-8">
        <div className="hidden md:flex items-center gap-3 px-6 mb-12">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Users className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl lg:block hidden">和睦寝室</span>
        </div>

        <div className="flex md:flex-col gap-2 w-full px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={LayoutDashboard} label="首页" />
          <NavButton active={activeTab === 'duty'} onClick={() => setActiveTab('duty')} icon={Calendar} label="值日" />
          <NavButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Wallet} label="账单" />
          <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={MessageSquare} label="交流" />
        </div>

        <div className="hidden md:mt-auto md:flex flex-col items-center gap-4 w-full px-4">
          <button onClick={() => setIsNotifyOpen(true)} className="p-3 rounded-xl hover:bg-slate-100/10 transition-colors relative">
            <Bell className="nav-icon text-muted" />
            {notifications.some(n => !n.read) && <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 rounded-xl hover:bg-slate-100/10 transition-colors">
            <Settings className="nav-icon text-muted" />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/30">
            <img src={currentUser?.avatar} alt="Profile" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="pb-24 md:pb-8 md:pl-24 lg:pl-72 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">{dormInfo.name}</h1>
            <p className="text-muted mt-1 font-medium">欢迎回来，{currentUser?.name}</p>
          </div>
          
          <div className="flex items-center gap-2 glass-card p-1.5 rounded-2xl">
            {(['normal', 'study', 'sleep', 'party'] as DormMode[]).map((mode) => (
              <button key={mode} onClick={() => setDormMode(mode)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${dormMode === mode ? 'accent-bg shadow-lg' : 'hover:bg-slate-100/20 text-muted'}`}>
                {mode === 'normal' && <Coffee className="w-4 h-4" />}
                {mode === 'study' && <BookOpen className="w-4 h-4" />}
                {mode === 'sleep' && <Moon className="w-4 h-4" />}
                {mode === 'party' && <Music className="w-4 h-4" />}
                <span className="hidden lg:inline">{mode === 'normal' ? '常规' : mode === 'study' ? '学习' : mode === 'sleep' ? '睡眠' : '聚会'}</span>
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-8 rounded-2xl accent-bg relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">
                    {dormMode === 'normal' ? '享受轻松的宿舍时光' : dormMode === 'study' ? '专注当下，静心学习' : dormMode === 'sleep' ? '晚安，祝你有个好梦' : '释放压力，尽情狂欢'}
                  </h2>
                  <p className="text-lg opacity-90 max-w-md font-medium">当前模式：{dormMode === 'normal' ? '常规模式' : dormMode === 'study' ? '学习模式' : dormMode === 'sleep' ? '睡眠模式' : '聚会模式'}</p>
                </div>
                <div className="absolute right-[-40px] bottom-[-40px] opacity-20">
                  {dormMode === 'normal' ? <Coffee size={320} /> : dormMode === 'study' ? <BookOpen size={320} /> : dormMode === 'sleep' ? <Moon size={320} /> : <Music size={320} />}
                </div>
              </div>

              <div className="glass-card p-6 rounded-xl">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Users className="w-5 h-5 accent-text" /> 成员动态</h3>
                <div className="space-y-4">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200/20" alt="" />
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${user.status === 'online' ? 'bg-emerald-500' : user.status === 'busy' ? 'bg-amber-500' : user.status === 'sleeping' ? 'bg-indigo-500' : 'bg-slate-400'}`} />
                        </div>
                        <div>
                          <p className="font-bold">{user.name} {user.role === 'leader' && <span className="text-[10px] accent-bg px-1.5 py-0.5 rounded-md ml-1">舍长</span>}</p>
                          <p className="text-xs text-muted font-medium">{user.status === 'online' ? '在线' : user.status === 'busy' ? '学习中' : user.status === 'sleeping' ? '休息中' : '离线'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-2xl">
              <div className="p-6 border-b border-slate-200/20 flex items-center justify-between bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-3">
                    {users.map(u => <img key={u.id} src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" alt="" />)}
                  </div>
                  <div>
                    <h2 className="font-black text-lg">{dormInfo.name} 交流群</h2>
                    <p className="text-xs text-muted font-bold uppercase tracking-widest">{users.length} 位成员在线</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                {messages.length === 0 && <div className="h-full flex items-center justify-center text-muted italic">暂无消息，开始聊天吧...</div>}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.senderId === currentUser?.id ? 'justify-end' : ''}`}>
                    {msg.senderId !== currentUser?.id && <img src={users.find(u => u.id === msg.senderId)?.avatar} className="w-10 h-10 rounded-full shadow-md" alt="" />}
                    <div className={`max-w-[70%] p-4 rounded-3xl shadow-sm ${msg.senderId === currentUser?.id ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] mt-1 font-bold ${msg.senderId === currentUser?.id ? 'opacity-70' : 'text-muted'}`}>{msg.timestamp}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white/20 border-t border-slate-200/20">
                <div className="flex gap-3">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 p-4 rounded-2xl glass-card outline-none focus:accent-border font-medium" placeholder="输入消息..." />
                  <button onClick={handleSendMessage} className="p-4 accent-bg rounded-2xl shadow-lg hover:scale-105 transition-transform">
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-12">
                      <CreditCard className="w-10 h-10 opacity-80" />
                      <span className="text-sm font-bold tracking-widest uppercase opacity-80">Dorm Wallet</span>
                    </div>
                    <p className="text-sm font-bold opacity-70 uppercase tracking-widest mb-1">寝室总余额</p>
                    <h2 className="text-5xl font-black mb-8">¥ 1,240.50</h2>
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[10px] font-bold uppercase opacity-70 mb-1">本月收入</p>
                        <p className="text-xl font-bold flex items-center gap-1"><ArrowDownLeft className="w-4 h-4 text-emerald-400" /> ¥ 450</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase opacity-70 mb-1">本月支出</p>
                        <p className="text-xl font-bold flex items-center gap-1"><ArrowUpRight className="w-4 h-4 text-rose-400" /> ¥ 120</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                </div>
                
                <div className="glass-card p-8 rounded-2xl">
                  <h3 className="text-xl font-black mb-6">收支明细</h3>
                  <div className="space-y-4">
                    <BillItem title="电费充值" amount={-120} date="2024-03-10" category="生活" />
                    <BillItem title="寝室基金存入" amount={450} date="2024-03-05" category="存入" />
                  </div>
                </div>
              </div>

              <div className="glass-card p-8 rounded-2xl h-fit">
                <h3 className="text-xl font-black mb-6">快速记账</h3>
                <div className="space-y-4">
                  <input type="text" className="w-full p-4 rounded-2xl glass-card outline-none focus:accent-border font-bold" placeholder="支出项名称" />
                  <input type="number" className="w-full p-4 rounded-2xl glass-card outline-none focus:accent-border font-bold" placeholder="金额 ¥" />
                  <button className="w-full py-4 accent-bg rounded-2xl font-black shadow-xl hover:translate-y-[-2px] transition-all">确认发布</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl glass-card p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">寝室管理</h2>
                <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-slate-100/10 rounded-full transition-colors"><X className="w-8 h-8" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="font-black text-lg accent-text uppercase tracking-widest">基本信息</h3>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">寝室昵称</label>
                    <input type="text" value={dormInfo.name} onChange={e => setDormInfo({...dormInfo, name: e.target.value})} className="w-full p-4 rounded-2xl glass-card font-bold outline-none focus:accent-border" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted mb-2 uppercase tracking-widest">房间号</label>
                    <input type="text" value={dormInfo.room} onChange={e => setDormInfo({...dormInfo, room: e.target.value})} className="w-full p-4 rounded-2xl glass-card font-bold outline-none focus:accent-border" />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="font-black text-lg accent-text uppercase tracking-widest">成员管理</h3>
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 glass-card rounded-2xl">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar} className="w-10 h-10 rounded-full" alt="" />
                          <span className="font-bold">{u.name}</span>
                        </div>
                        {currentUser?.role === 'leader' && u.id !== currentUser.id && (
                          <button onClick={() => removeMember(u.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => addMember('新室友')} className="w-full py-3 border-2 border-dashed border-slate-300/50 rounded-2xl text-muted font-bold flex items-center justify-center gap-2 hover:border-indigo-500 hover:text-indigo-500 transition-all">
                      <UserPlus className="w-5 h-5" /> 添加成员
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setIsSettingsOpen(false)} className="flex-1 py-4 accent-bg rounded-2xl font-black shadow-xl flex items-center justify-center gap-2"><Save className="w-5 h-5" /> 保存配置</button>
                <button onClick={() => setIsAuthenticated(false)} className="px-8 py-4 glass-card text-rose-500 rounded-2xl font-black flex items-center justify-center gap-2"><LogOut className="w-5 h-5" /> 退出</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {isNotifyOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsNotifyOpen(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" />
            <motion.div initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} className="relative w-full max-w-md glass-card p-8 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black">通知中心</h2>
                <button onClick={() => setIsNotifyOpen(false)} className="p-2 hover:bg-slate-100/10 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                {notifications.length === 0 && <div className="text-center py-12 text-muted font-bold italic">暂无新通知</div>}
                {notifications.map(n => (
                  <div key={n.id} className="p-4 glass-card rounded-2xl border-l-4 accent-border">
                    <h4 className="font-bold">{n.title}</h4>
                    <p className="text-sm text-muted mt-1 font-medium">{n.content}</p>
                    <span className="text-[10px] text-muted font-bold mt-2 block uppercase tracking-widest">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button onClick={onClick} className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full relative group ${active ? 'accent-bg shadow-lg' : 'text-muted hover:bg-slate-100/10'}`}>
      <Icon className={`nav-icon transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-muted'}`} />
      <span className="text-[10px] md:text-sm font-black md:block hidden uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full hidden md:block" />}
    </button>
  );
}

function BillItem({ title, amount, date, category }: { title: string, amount: number, date: string, category: string }) {
  const isIncome = amount > 0;
  return (
    <div className="flex items-center justify-between p-4 glass-card rounded-2xl hover:scale-[1.02] transition-transform cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isIncome ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-black">{title}</p>
          <p className="text-xs text-muted font-bold uppercase tracking-widest">{date} · {category}</p>
        </div>
      </div>
      <p className={`text-lg font-black ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>{isIncome ? '+' : '-'} ¥{Math.abs(amount)}</p>
    </div>
  );
}
