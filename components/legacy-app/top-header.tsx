
import { BookOpen, Coffee, Moon, Music } from 'lucide-react';

import { STATUS_OPTIONS } from './constants';
import { stateLabel } from './helpers';
import type { DormState } from '@/lib/types';
import type { LanguageCode } from '@/lib/i18n';

export function TopHeader(props: {
  t: any;
  dormName: string;
  meName: string | null | undefined;
  language: LanguageCode;
  selectedState: DormState;
  onChangeState: (state: DormState) => void;
}) {
  const p = props;

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl md:text-4xl font-black tracking-tight">{p.dormName}</h1>
        <p className="text-muted mt-1 font-medium">{p.t.welcomeBack}，{p.meName || '-'}</p>
      </div>

      <div className="flex items-center gap-2 glass-card p-1.5 rounded-2xl">
        {STATUS_OPTIONS.map((state) => (
          <button
            key={state}
            title={stateLabel(p.language, state)}
            onClick={() => p.onChangeState(state)}
            className={`relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              p.selectedState === state ? 'accent-bg shadow-lg' : 'hover:bg-slate-100/20 text-muted'
            }`}
          >
            {state === 'out' && <Coffee className="w-4 h-4" />}
            {state === 'study' && <BookOpen className="w-4 h-4" />}
            {state === 'sleep' && <Moon className="w-4 h-4" />}
            {state === 'game' && <Music className="w-4 h-4" />}
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {stateLabel(p.language, state)}
            </span>
          </button>
        ))}
      </div>
    </header>
  );
}
