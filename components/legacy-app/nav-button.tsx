
import React from 'react';
import { motion } from 'motion/react';

export function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge = 0,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}) {
  return (
    <button onClick={onClick} className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full relative group ${active ? 'accent-bg shadow-lg' : 'text-muted hover:bg-slate-100/10'}`}>
      <Icon className={`nav-icon transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-muted'}`} />
      {badge > 0 ? <span className="absolute top-1 right-2 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-5 font-black text-center">{badge > 99 ? '99+' : badge}</span> : null}
      <span className="text-[10px] md:text-sm font-black md:block hidden uppercase tracking-widest">{label}</span>
      {active ? <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full hidden md:block" /> : null}
    </button>
  );
}
