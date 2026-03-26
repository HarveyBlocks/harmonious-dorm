'use client';

import * as Switch from '@radix-ui/react-switch';
import type { LanguageCode } from '@/lib/i18n';

export const AVAILABLE_BOT_TOOLS = [
  { name: 'multiply' },
] as const;

export type ToolPermissionRow = {
  tool: string;
  permission: 'allow' | 'deny';
};

const TOOL_LABELS: Record<string, Record<LanguageCode, string>> = {
  multiply: {
    'zh-CN': '乘法计算',
    'zh-TW': '乘法計算',
    en: 'Multiplication',
    fr: 'Multiplication',
  },
};

function toolDisplayName(tool: string, language: LanguageCode): string {
  return TOOL_LABELS[tool]?.[language] || TOOL_LABELS[tool]?.en || tool;
}

function permissionTitle(language: LanguageCode): string {
  if (language === 'zh-CN') return '机器人工具权限';
  if (language === 'zh-TW') return '機器人工具權限';
  if (language === 'fr') return 'Autorisations des outils du robot';
  return 'Bot Tool Permissions';
}

export function ToolPermissionList(props: {
  rows: ToolPermissionRow[];
  title: string;
  allowLabel: string;
  denyLabel: string;
  canEdit: boolean;
  language: LanguageCode;
  onChange: (tool: string, permission: 'allow' | 'deny') => void;
}) {
  const p = props;
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted font-bold">{p.title || permissionTitle(p.language)}</p>
      <div className="space-y-2">
        {p.rows.map((row) => {
          const checked = row.permission === 'allow';
          return (
            <div key={row.tool} className="flex items-center justify-between rounded-xl custom-field px-4 py-3">
              <div className="flex flex-col">
                <p className="text-sm font-bold">{toolDisplayName(row.tool, p.language)}</p>
                <p className="text-xs text-muted">{checked ? p.allowLabel : p.denyLabel}</p>
              </div>
              <Switch.Root
                checked={checked}
                disabled={!p.canEdit}
                onCheckedChange={(next) => p.onChange(row.tool, next ? 'allow' : 'deny')}
                className="relative h-7 w-12 cursor-pointer rounded-full border border-white/30 bg-slate-400/40 data-[state=checked]:bg-[var(--accent)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Switch.Thumb className="block h-5 w-5 translate-x-1 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-6" />
              </Switch.Root>
            </div>
          );
        })}
      </div>
    </div>
  );
}