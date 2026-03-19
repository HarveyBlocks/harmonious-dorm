import type { LanguageCode } from '@/lib/i18n';
import type { DormState } from '@/lib/types';

import type { ActiveTab, ChatMessage } from './ui-types';

const STATE_LABEL_MAP: Record<LanguageCode, Record<DormState, string>> = {
  en: { study: 'Studying', sleep: 'Sleeping', game: 'Gaming', out: 'Out' },
  fr: { study: 'Etude', sleep: 'Sommeil', game: 'Jeu', out: 'Sorti' },
  'zh-TW': { study: '學習', sleep: '睡覺', game: '遊戲', out: '外出' },
  'zh-CN': { study: '学习', sleep: '睡觉', game: '游戏', out: '外出' },
};

const SETTINGS_FOLD_LABEL_MAP: Record<LanguageCode, { folded: string; expanded: string }> = {
  en: { folded: 'Expand', expanded: 'Collapse' },
  fr: { folded: 'D\u00e9velopper', expanded: 'R\u00e9duire' },
  'zh-TW': { folded: '展開', expanded: '收合' },
  'zh-CN': { folded: '展开', expanded: '收起' },
};

const PAID_INFO_PREFIX_MAP: Record<LanguageCode, string> = {
  en: 'Paid',
  fr: 'Payé',
  'zh-TW': '已付',
  'zh-CN': '已付',
};

function fakeAvatar(id: number): string {
  return `https://picsum.photos/seed/user-${id}/100/100`;
}

export function resolveAvatar(path: string | null | undefined, id: number): string {
  if (!path) return fakeAvatar(id);
  return path.startsWith('/') ? path : `/${path}`;
}

export function todayText(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthHeader(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${`${d.getMonth() + 1}`.padStart(2, '0')}月`;
}

export function weekStartLabel(isoDate: string): string {
  const base = new Date(`${isoDate}T00:00:00`);
  const day = base.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - diff);
  return `周起始 ${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, '0')}-${`${start.getDate()}`.padStart(2, '0')}`;
}

export function settingsFoldLabel(lang: LanguageCode, folded: boolean): string {
  const labels = SETTINGS_FOLD_LABEL_MAP[lang] || SETTINGS_FOLD_LABEL_MAP['zh-CN'];
  return folded ? labels.folded : labels.expanded;
}

export function mapPathToTab(path: string): ActiveTab {
  if (path.includes('settings')) return 'settings';
  if (path.includes('notifications')) return 'notifications';
  if (path.includes('chat')) return 'chat';
  if (path.includes('duty')) return 'duty';
  if (path.includes('bill')) return 'wallet';
  if (path.includes('profile')) return 'settings';
  return 'dashboard';
}

export function mapTabToPath(tab: ActiveTab): string {
  if (tab === 'settings') return '/settings';
  if (tab === 'notifications') return '/notifications';
  if (tab === 'chat') return '/chat';
  if (tab === 'duty') return '/duty';
  if (tab === 'wallet') return '/bills';
  return '/';
}

export function dispatchToast(type: 'error' | 'success' | 'info', message: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { type, message } }));
}

export function tabForNotificationType(type?: string): ActiveTab | null {
  if (type === 'chat') return 'chat';
  if (type === 'bill') return 'wallet';
  if (type === 'duty') return 'duty';
  if (type === 'settings' || type === 'dorm' || type === 'leader') return 'settings';
  return null;
}

export function autoResizeTextarea(el: HTMLTextAreaElement): void {
  el.style.height = 'auto';
  el.style.height = `${Math.max(112, el.scrollHeight)}px`;
}

export function resetTextareaHeight(el: HTMLTextAreaElement): void {
  el.style.height = '';
}

export function isChatNearBottom(container: HTMLDivElement): boolean {
  return container.scrollHeight - (container.scrollTop + container.clientHeight) <= 80;
}

export function formatPaidInfo(lang: LanguageCode, paid: number, total: number): string {
  const prefix = PAID_INFO_PREFIX_MAP[lang] || PAID_INFO_PREFIX_MAP['zh-CN'];
  return `${prefix} ${paid}/${total}`;
}

export function stateLabel(lang: LanguageCode, state: DormState): string {
  const labels = STATE_LABEL_MAP[lang] || STATE_LABEL_MAP['zh-CN'];
  return labels[state] || STATE_LABEL_MAP['zh-CN'][state];
}

export function mergeChatMessages(base: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<number, ChatMessage>();
  base.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => a.id - b.id);
}
