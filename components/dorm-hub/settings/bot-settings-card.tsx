
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Camera, CircleAlert, Plus, X } from 'lucide-react';
import { LIMITS } from '@/lib/limits';
import type { Dispatch, RefObject, SetStateAction } from 'react';

import { autoResizeTextarea, resetTextareaHeight, resolveAvatar } from '../ui-helpers';
import { SettingsCard } from '../settings-card';

export function BotSettingsCard(props: {
  me: any;
  folded: boolean;
  title: string;
  toggleLabel: string;
  onToggle: () => void;
  botAvatarInputRef: RefObject<HTMLInputElement>;
  changeBotAvatarTitle: string;
  setBotAvatarFile: (file: File | null) => void;
  botNameInput: string;
  setBotNameInput: (v: string) => void;
  botNamePlaceholder: string;
  tryApplyLimitedInput: (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => boolean;
  eText: any;
  botSettingsLabel: string;
  noFieldsYetText: string;
  botSettingsInput: Array<{ key: string; value: string }>;
  setBotSettingsInput: Dispatch<SetStateAction<Array<{ key: string; value: string }>>>;
  addFieldLabel: string;
  removeFieldLabel: string;
  botSettingKeyLabel: string;
  botSettingValueLabel: string;
  botMemoryWindowLabel: string;
  botMemoryWindowInput: string;
  setBotMemoryWindowInput: (value: string) => void;
  botMemoryWindowHintSimple: string;
  botMemoryWindowHintHeavy: string;
  botMemoryWindowHintTech: string;
  botMemoryWindowHintHyper: string;
  botOtherContentLabel: string;
  botOtherEditing: boolean;
  setBotOtherEditing: (v: boolean) => void;
  botOtherTextareaRef: RefObject<HTMLTextAreaElement>;
  botOtherContent: string;
  setBotOtherContent: (v: string) => void;
  botOtherContentPlaceholder: string;
  dispatchToast: (type: 'error' | 'success' | 'info', message: string) => void;
}) {
  const p = props;
  return (
    <SettingsCard title={p.title} folded={p.folded} onToggle={p.onToggle} toggleLabel={p.toggleLabel} className={`glass-card sleep-depth-mid rounded-3xl ${p.folded ? 'px-7 py-4 md:px-8 md:py-4' : 'p-7 md:p-8'}`}>
      <div className="space-y-6 mt-6">
        <div className="grid grid-cols-[auto_1fr] gap-8 md:gap-10 items-center">
          <div className="relative w-20 h-20">
            <div className="w-full h-full rounded-full overflow-hidden ring-2 ring-white/40 shadow-lg"><img src={resolveAvatar(p.me?.botAvatarPath, -999)} className="w-full h-full object-cover" alt={p.title} /></div>
            {p.me?.isLeader ? <button type="button" title={p.changeBotAvatarTitle} onClick={() => p.botAvatarInputRef.current?.click()} className="absolute -right-0.5 -bottom-0.5 z-20 w-7 h-7 rounded-full accent-bg flex items-center justify-center border border-white/70 shadow-xl"><Camera className="w-4 h-4 text-white" /></button> : null}
          </div>
          <input className="w-full max-w-[560px] p-4 min-h-[56px] rounded-xl custom-field text-[15px] placeholder:text-[14px]" value={p.botNameInput} onChange={(e) => p.tryApplyLimitedInput('bot_name', e.target.value, LIMITS.BOT_NAME, p.eText.botNameTooLong, p.setBotNameInput)} placeholder={p.botNamePlaceholder} disabled={!p.me?.isLeader} />
        </div>

        <div className="pt-5 border-t border-slate-200/20 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted font-bold">{p.botSettingsLabel}</p>
            {p.me?.isLeader ? <button type="button" onClick={() => p.setBotSettingsInput((prev) => { if (prev.length >= LIMITS.BOT_SETTINGS_ITEMS) { p.dispatchToast('error', p.eText.botSettingsTooMany); return prev; } return [...prev, { key: '', value: '' }]; })} title={p.addFieldLabel} aria-label={p.addFieldLabel} className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-300/40 hover:bg-slate-100/10 custom-field bot-kv-btn"><Plus className="w-4 h-4" /></button> : null}
          </div>
          <div className="space-y-4">
            {p.botSettingsInput.map((row, index) => p.me?.isLeader ? (
              <div key={`bot-setting-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-center">
                <input className="w-[92%] justify-self-center min-w-0 p-3 min-h-[50px] rounded-lg glass-card custom-field bot-kv-field text-[15px] placeholder:text-[14px]" value={row.key} onChange={(e) => p.tryApplyLimitedInput(`bot_key_${index}`, e.target.value, LIMITS.BOT_SETTING_KEY, p.eText.botSettingKeyTooLong, (safeValue) => p.setBotSettingsInput((prev) => prev.map((item, i) => (i === index ? { ...item, key: safeValue } : item))))} placeholder={p.botSettingKeyLabel} disabled={!p.me?.isLeader} />
                <input className="w-[92%] justify-self-center min-w-0 p-3 min-h-[50px] rounded-lg glass-card custom-field bot-kv-field text-[15px] placeholder:text-[14px]" value={row.value} onChange={(e) => p.tryApplyLimitedInput(`bot_value_${index}`, e.target.value, LIMITS.BOT_SETTING_VALUE, p.eText.botSettingValueTooLong, (safeValue) => p.setBotSettingsInput((prev) => prev.map((item, i) => (i === index ? { ...item, value: safeValue } : item))))} placeholder={p.botSettingValueLabel} disabled={!p.me?.isLeader} />
                <button type="button" onClick={() => p.setBotSettingsInput((prev) => prev.filter((_, i) => i !== index))} title={p.removeFieldLabel} aria-label={p.removeFieldLabel} className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500 shrink-0 border border-rose-300/40 hover:bg-rose-500/10 custom-field bot-kv-btn"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div key={`bot-setting-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 items-center">
                <input className="w-[92%] justify-self-center min-w-0 p-3 min-h-[50px] rounded-lg glass-card custom-field bot-kv-field text-[15px] placeholder:text-[14px]" value={row.key} placeholder={p.botSettingKeyLabel} disabled />
                <input className="w-[92%] justify-self-center min-w-0 p-3 min-h-[50px] rounded-lg glass-card custom-field bot-kv-field text-[15px] placeholder:text-[14px]" value={row.value} placeholder={p.botSettingValueLabel} disabled />
              </div>
            ))}
            {p.botSettingsInput.length === 0 ? <p className="text-xs text-muted">{p.noFieldsYetText}</p> : null}
          </div>
        </div>

        <div className="pt-5 border-t border-slate-200/20 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted font-bold">{p.botMemoryWindowLabel}</p>
            <div className="relative group">
              <button
                type="button"
                className="w-5 h-5 rounded-full border border-slate-300/40 text-muted flex items-center justify-center hover:text-[var(--text-main)] hover:border-slate-300/70 transition-colors"
                aria-label="memory window hint"
              >
                <CircleAlert className="w-3.5 h-3.5" />
              </button>
              <div className="pointer-events-none absolute z-30 left-0 top-[calc(100%+8px)] w-[300px] rounded-xl border border-slate-200/40 bg-[color:var(--bg-main)] shadow-2xl p-3 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150">
                <p className="text-[11px] font-bold text-muted mb-2">{p.botMemoryWindowLabel}</p>
                <div className="space-y-1.5 text-xs leading-5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded-md bg-emerald-500/15 text-emerald-600 px-1.5 py-0.5 font-bold">5-10</span>
                    <span>{p.botMemoryWindowHintSimple}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded-md bg-sky-500/15 text-sky-600 px-1.5 py-0.5 font-bold">10-15</span>
                    <span>{p.botMemoryWindowHintHeavy}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded-md bg-amber-500/15 text-amber-700 px-1.5 py-0.5 font-bold">15-20</span>
                    <span>{p.botMemoryWindowHintTech}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 rounded-md bg-fuchsia-500/15 text-fuchsia-700 px-1.5 py-0.5 font-bold">20-30</span>
                    <span>{p.botMemoryWindowHintHyper}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full max-w-[360px] rounded-xl custom-field px-4 py-3">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={35}
                step={1}
                value={Number(p.botMemoryWindowInput || '10')}
                onChange={(e) => p.setBotMemoryWindowInput(e.target.value)}
                disabled={!p.me?.isLeader}
                className="flex-1 h-2 accent-[var(--accent)] cursor-pointer"
              />
              <span className="text-sm font-black px-2 py-0.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)]">
                {p.botMemoryWindowInput}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-200/20 space-y-3">
          <p className="text-[11px] text-muted font-bold">{p.botOtherContentLabel}</p>
          {p.me?.isLeader && p.botOtherEditing ? (
            <textarea ref={p.botOtherTextareaRef} className="w-full p-4 rounded-xl custom-field resize-none overflow-hidden text-[15px] placeholder:text-[14px] leading-7" value={p.botOtherContent} placeholder={p.botOtherContentPlaceholder} onChange={(event) => {
              const nextValue = event.target.value;
              if (nextValue.length > LIMITS.BOT_OTHER_CONTENT) {
                p.dispatchToast('error', p.eText.botOtherTooLong);
                return;
              }
              p.setBotOtherContent(nextValue);
              autoResizeTextarea(event.target);
            }} onInput={(event) => autoResizeTextarea(event.currentTarget)} onFocus={(event) => autoResizeTextarea(event.currentTarget)} onBlur={(event) => { resetTextareaHeight(event.currentTarget); p.setBotOtherEditing(false); }} />
          ) : (
            <div className={`w-full rounded-xl p-4 ${p.me?.isLeader ? 'cursor-text custom-field' : 'glass-card'} min-h-[112px]`} onClick={() => { if (!p.me?.isLeader) return; p.setBotOtherEditing(true); }}>
              {p.botOtherContent.trim() ? <div className="bot-markdown text-[15px] leading-7"><ReactMarkdown remarkPlugins={[remarkGfm]}>{p.botOtherContent}</ReactMarkdown></div> : <p className="text-muted text-[14px]">{p.botOtherContentPlaceholder}</p>}
            </div>
          )}
        </div>
      </div>
      <input ref={p.botAvatarInputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => p.setBotAvatarFile(e.target.files?.[0] || null)} />
    </SettingsCard>
  );
}
