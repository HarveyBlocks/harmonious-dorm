
import { LIMITS } from '@/lib/limits';

import { autoResizeTextarea, resetTextareaHeight, resolveAvatar } from '../helpers';
import { SettingsSection } from '../settings-section';
import React from "react";

export function MemberSettingsSection(props: {
  t: any;
  me: any;
  folded: boolean;
  title: string;
  toggleLabel: string;
  onToggle: () => void;
  memberDescriptionsInput: Record<number, string>;
  setMemberDescriptionsInput: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  memberDescPlaceholder: string;
  tryApplyLimitedInput: (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => boolean;
  eText: any;
}) {
  const { t, me, folded, title, toggleLabel, onToggle, memberDescriptionsInput, setMemberDescriptionsInput, memberDescPlaceholder, tryApplyLimitedInput, eText } = props;

  const renderEditor = (memberId: number, value: string) => (
    <textarea
      className="w-[96%] md:w-[92%] mx-auto block p-4 min-h-[72px] rounded-xl glass-card custom-field resize-none overflow-hidden text-[15px] placeholder:text-[14px] leading-7"
      value={value}
      placeholder={memberDescPlaceholder}
      onChange={(event) => {
        const nextValue = event.target.value;
        const accepted = tryApplyLimitedInput(`member_desc_${memberId}`, nextValue, LIMITS.MEMBER_DESCRIPTION, eText.memberDescriptionTooLong, (safeValue) => setMemberDescriptionsInput((prev) => ({ ...prev, [memberId]: safeValue })));
        if (!accepted) return;
        autoResizeTextarea(event.target);
      }}
      onInput={(event) => autoResizeTextarea(event.currentTarget)}
      onFocus={(event) => autoResizeTextarea(event.currentTarget)}
      onBlur={(event) => resetTextareaHeight(event.currentTarget)}
    />
  );

  return (
    <SettingsSection title={title} folded={folded} onToggle={onToggle} toggleLabel={toggleLabel} className={`glass-card sleep-depth-mid rounded-3xl ${folded ? 'px-7 py-4 md:px-8 md:py-4' : 'p-7 md:p-8'}`}>
      <div className="space-y-6 mt-6">
        {me?.isLeader ? (
          <div className="space-y-6">
            {(me?.members || []).map((member: any) => (
              <div key={`desc-${member.id}`} className="py-4 border-b border-slate-200/20 last:border-b-0">
                <div className="flex items-center gap-4 mb-4">
                  <img src={resolveAvatar(member.avatarPath, member.id)} className="w-8 h-8 rounded-full" alt={member.name} />
                  <p className="font-bold text-sm">{member.name}{member.isLeader ? <span className="ml-2 text-[10px] font-black accent-bg px-1.5 py-0.5 rounded-md">{t.leaderTag}</span> : null}</p>
                </div>
                {renderEditor(member.id, memberDescriptionsInput[member.id] || '')}
              </div>
            ))}
          </div>
        ) : renderEditor(me?.id || 0, memberDescriptionsInput[me?.id || 0] || '')}
      </div>
    </SettingsSection>
  );
}
