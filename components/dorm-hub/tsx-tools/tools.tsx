'use client';

import { useMemo, useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getUiText, type LanguageCode } from '@/lib/i18n';

export type ToolPermissionRow = {
  tool: string;
  displayName?: string;
  description?: string;
  permission: 'allow' | 'deny';
  operationScope?: string;
};

type ToolGroupKey = 'query' | 'member' | 'selfOrLeader' | 'leader';
type GroupPermissionState = 'allow' | 'mixed' | 'deny';

const GROUP_ORDER: ToolGroupKey[] = ['query', 'member', 'selfOrLeader', 'leader'];

type ToolMetaKeyMap = { nameKey: string; descKey: string };

const TOOL_TEXT_KEYS: Record<string, ToolMetaKeyMap> = {
  multiply: { nameKey: 'toolMultiplyName', descKey: 'toolMultiplyDesc' },
  bill_create: { nameKey: 'toolBillCreateName', descKey: 'toolBillCreateDesc' },
  bill_delete: { nameKey: 'toolBillDeleteName', descKey: 'toolBillDeleteDesc' },
  bill_list: { nameKey: 'toolBillListName', descKey: 'toolBillListDesc' },
  bill_mark_paid: { nameKey: 'toolBillMarkPaidName', descKey: 'toolBillMarkPaidDesc' },
  bill_mark_unpaid: { nameKey: 'toolBillMarkUnpaidName', descKey: 'toolBillMarkUnpaidDesc' },
  duty_create: { nameKey: 'toolDutyCreateName', descKey: 'toolDutyCreateDesc' },
  duty_delete: { nameKey: 'toolDutyDeleteName', descKey: 'toolDutyDeleteDesc' },
  duty_list: { nameKey: 'toolDutyListName', descKey: 'toolDutyListDesc' },
  duty_mark_completed: { nameKey: 'toolDutyMarkCompletedName', descKey: 'toolDutyMarkCompletedDesc' },
  duty_mark_uncompleted: { nameKey: 'toolDutyMarkUncompletedName', descKey: 'toolDutyMarkUncompletedDesc' },
  bot_settings_read: { nameKey: 'toolBotSettingsReadName', descKey: 'toolBotSettingsReadDesc' },
  bot_settings_update_memory_window: { nameKey: 'toolBotSettingsUpdateMemoryWindowName', descKey: 'toolBotSettingsUpdateMemoryWindowDesc' },
  bot_settings_update_name: { nameKey: 'toolBotSettingsUpdateNameName', descKey: 'toolBotSettingsUpdateNameDesc' },
  bot_settings_add_field: { nameKey: 'toolBotSettingsAddFieldName', descKey: 'toolBotSettingsAddFieldDesc' },
  bot_settings_remove_field: { nameKey: 'toolBotSettingsRemoveFieldName', descKey: 'toolBotSettingsRemoveFieldDesc' },
  user_set_nickname: { nameKey: 'toolUserSetNicknameName', descKey: 'toolUserSetNicknameDesc' },
  user_set_language: { nameKey: 'toolUserSetLanguageName', descKey: 'toolUserSetLanguageDesc' },
  user_set_description: { nameKey: 'toolUserSetDescriptionName', descKey: 'toolUserSetDescriptionDesc' },
  leader_transfer: { nameKey: 'toolLeaderTransferName', descKey: 'toolLeaderTransferDesc' },
  leader_update_dorm_name: { nameKey: 'toolLeaderUpdateDormNameName', descKey: 'toolLeaderUpdateDormNameDesc' },
};

function pickText(t: Record<string, string>, key: string, fallback: string): string {
  const value = t[key];
  return value && value.trim().length > 0 ? value : fallback;
}

function resolveToolMeta(row: ToolPermissionRow, t: Record<string, string>): { name: string; desc: string } {
  const keyMap = TOOL_TEXT_KEYS[row.tool];
  if (!keyMap) {
    return {
      name: row.displayName || row.tool,
      desc: row.description || '',
    };
  }
  return {
    name: pickText(t, keyMap.nameKey, row.displayName || row.tool),
    desc: pickText(t, keyMap.descKey, row.description || ''),
  };
}

function groupMeta(key: ToolGroupKey, t: Record<string, string>): { title: string; desc: string } {
  if (key === 'query') {
    return {
      title: pickText(t, 'toolGroupQueryTitle', 'Read and query'),
      desc: pickText(t, 'toolGroupQueryDesc', 'Read-only actions without data changes.'),
    };
  }
  if (key === 'member') {
    return {
      title: pickText(t, 'toolGroupMemberTitle', 'Daily actions'),
      desc: pickText(t, 'toolGroupMemberDesc', 'Common permissions for members.'),
    };
  }
  if (key === 'selfOrLeader') {
    return {
      title: pickText(t, 'toolGroupSelfOrLeaderTitle', 'Self or leader actions'),
      desc: pickText(t, 'toolGroupSelfOrLeaderDesc', 'Personal or collaborative management actions.'),
    };
  }
  return {
    title: pickText(t, 'toolGroupLeaderTitle', 'Leader-only actions'),
    desc: pickText(t, 'toolGroupLeaderDesc', 'Sensitive actions. Enable carefully.'),
  };
}

function resolveGroup(row: ToolPermissionRow): ToolGroupKey {
  if (row.operationScope === 'leader') return 'leader';
  if (row.operationScope === 'self_or_leader') return 'selfOrLeader';
  if (row.operationScope === 'member') return 'member';
  return 'query';
}

function groupState(rows: ToolPermissionRow[]): GroupPermissionState {
  const allowCount = rows.filter((row) => row.permission === 'allow').length;
  if (allowCount === 0) return 'deny';
  if (allowCount === rows.length) return 'allow';
  return 'mixed';
}

/**
 * @deprecated Group-level batch toggle UI was removed from frontend.
 * Keep this function for preserving stable batch logic entry.
 */
function applyGroupPermission(
  rows: ToolPermissionRow[],
  permission: GroupPermissionState,
  canEdit: boolean,
  onBatchChange: (updates: Array<{ tool: string; permission: 'allow' | 'deny' }>) => void,
): void {
  if (!canEdit || permission === 'mixed') return;
  onBatchChange(rows.map((row) => ({ tool: row.tool, permission })));
}

export function ToolPermissionList(props: {
  rows: ToolPermissionRow[];
  title: string;
  allowLabel: string;
  denyLabel: string;
  canEdit: boolean;
  language: LanguageCode;
  onChange: (tool: string, permission: 'allow' | 'deny') => void;
  /** @deprecated Group-level batch toggle UI was removed from frontend. */
  onBatchChange: (updates: Array<{ tool: string; permission: 'allow' | 'deny' }>) => void;
}) {
  const { rows, title, allowLabel, denyLabel, canEdit, language, onChange, onBatchChange } = props;
  const [collapsed, setCollapsed] = useState<Record<ToolGroupKey, boolean>>({
    query: true,
    member: true,
    selfOrLeader: true,
    leader: true,
  });

  const t = useMemo(() => getUiText(language), [language]);

  const groups = useMemo(() => {
    const initial: Record<ToolGroupKey, ToolPermissionRow[]> = { query: [], member: [], selfOrLeader: [], leader: [] };
    for (const row of rows) initial[resolveGroup(row)].push(row);
    return initial;
  }, [rows]);

  void onBatchChange;
  void applyGroupPermission;
  void groupState;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted font-bold">{title}</p>
      <div className="space-y-3">
        {GROUP_ORDER.map((key) => {
          const groupRows = groups[key];
          if (!groupRows.length) return null;

          const isCollapsed = collapsed[key];
          const meta = groupMeta(key, t);

          return (
            <section key={key} className="rounded-2xl custom-field px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-muted mt-[1px]" /> : <ChevronDown className="w-4 h-4 text-muted mt-[1px]" />}
                    <p className="text-sm font-black tracking-[0.01em]">{meta.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted leading-5 pl-6">{meta.desc}</p>
                </button>
              </div>

              {!isCollapsed ? (
                <div className="mt-3 space-y-2 pl-6">
                  {groupRows.map((row) => {
                    const checked = row.permission === 'allow';
                    const toolMeta = resolveToolMeta(row, t);
                    return (
                      <div key={row.tool} className="flex items-center justify-between gap-3 rounded-xl border border-slate-300/25 bg-white/5 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{toolMeta.name}</p>
                          {toolMeta.desc ? <p className="text-xs text-muted leading-5 mt-0.5">{toolMeta.desc}</p> : null}
                          <p className="text-[11px] text-muted/80 mt-1">{checked ? allowLabel : denyLabel}</p>
                        </div>
                        <Switch.Root
                          checked={checked}
                          disabled={!canEdit}
                          onCheckedChange={(next) => onChange(row.tool, next ? 'allow' : 'deny')}
                          className="relative h-7 w-12 shrink-0 cursor-pointer rounded-full border border-white/30 bg-slate-400/40 data-[state=checked]:bg-[var(--accent)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
                        </Switch.Root>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

