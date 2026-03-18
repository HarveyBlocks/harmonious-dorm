'use client';

import { LIMITS } from '@/lib/limits';

import { SettingsSection } from '../settings-section';

export function DormSettingsSection(props: {
  t: any;
  me: any;
  folded: boolean;
  toggleLabel: string;
  onToggle: () => void;
  copyInviteCode: () => void;
  dormNameInput: string;
  setDormNameInput: (v: string) => void;
  tryApplyLimitedInput: (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => boolean;
  eText: any;
  targetLeaderId: number | null;
  setTargetLeaderId: (v: number) => void;
  transferMutation: { mutate: () => void };
}) {
  const { t, me, folded, toggleLabel, onToggle, copyInviteCode, dormNameInput, setDormNameInput, tryApplyLimitedInput, eText, targetLeaderId, setTargetLeaderId, transferMutation } = props;

  return (
    <SettingsSection title={t.dormInfo} folded={folded} onToggle={onToggle} toggleLabel={toggleLabel} className={`glass-card sleep-depth-deep rounded-3xl ${folded ? 'px-7 py-4 md:px-8 md:py-4' : 'p-7 md:p-8'}`}>
      <div className="space-y-6 mt-6">
        <div className="glass-card rounded-2xl px-5 py-5 md:py-6 w-[96%] md:w-[92%] mx-auto">
          <p className="text-xs text-muted mb-2">{t.inviteCodeLabel}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="font-black tracking-[0.2em] text-base">{me?.inviteCode || '-'}</span>
            <button onClick={copyInviteCode} className="glass-card px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">{t.copy}</button>
          </div>
        </div>

        {me?.isLeader ? (
          <input className="w-[96%] md:w-[92%] mx-auto block p-4 min-h-[56px] rounded-xl glass-card custom-field text-[15px] placeholder:text-[14px]" value={dormNameInput} onChange={(e) => tryApplyLimitedInput('dorm_name', e.target.value, LIMITS.DORM_NAME, eText.dormNameTooLong, setDormNameInput)} placeholder={t.dormName} />
        ) : (
          <div className="glass-card rounded-xl px-5 py-5 md:py-6 w-[96%] md:w-[92%] mx-auto">
            <p className="text-[11px] text-muted font-bold mb-1">{t.dormName}</p>
            <p className="font-black break-all">{dormNameInput || '-'}</p>
          </div>
        )}

        {me?.isLeader ? (
          <div className="pt-3 border-t border-slate-200/20 space-y-4">
            <select className="w-[96%] md:w-[92%] mx-auto block p-4 min-h-[56px] rounded-xl glass-card custom-field text-[15px]" value={targetLeaderId || ''} onChange={(e) => setTargetLeaderId(Number(e.target.value))}>
              {(me?.members || []).filter((item: any) => !item.isLeader).map((item: any) => (<option key={item.id} value={item.id}>{item.name}</option>))}
            </select>
            <button onClick={() => transferMutation.mutate()} className="glass-card px-4 py-4 min-h-[56px] rounded-xl font-bold w-[96%] md:w-[92%] mx-auto block text-rose-500 text-[15px]">{t.transferLeader}</button>
          </div>
        ) : null}
      </div>
    </SettingsSection>
  );
}