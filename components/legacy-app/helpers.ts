import type { LanguageCode } from '@/lib/i18n';
import type { DormState } from '@/lib/types';

import type { ActiveTab, ChatMessage } from './types';

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

export function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
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
  if (lang === 'en') return folded ? 'Expand' : 'Collapse';
  if (lang === 'fr') return folded ? 'Developper' : 'Reduire';
  if (lang === 'zh-TW') return folded ? '展開' : '收合';
  return folded ? '展开' : '收起';
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

export function isThisMonth(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function formatPaidInfo(lang: LanguageCode, paid: number, total: number): string {
  if (lang === 'en') return `Paid ${paid}/${total}`;
  if (lang === 'fr') return `Payé ${paid}/${total}`;
  if (lang === 'zh-TW') return `已付 ${paid}/${total}`;
  return `已付 ${paid}/${total}`;
}

export function unnamedBill(lang: LanguageCode): string {
  if (lang === 'en') return 'Untitled bill';
  if (lang === 'fr') return 'Facture sans titre';
  if (lang === 'zh-TW') return '未命名帳單';
  return '未命名账单';
}

export function stateLabel(lang: LanguageCode, state: DormState): string {
  if (lang === 'en') return state === 'study' ? 'Studying' : state === 'sleep' ? 'Sleeping' : state === 'game' ? 'Gaming' : 'Out';
  if (lang === 'fr') return state === 'study' ? 'Etude' : state === 'sleep' ? 'Sommeil' : state === 'game' ? 'Jeu' : 'Sorti';
  if (lang === 'zh-TW') return state === 'study' ? '學習' : state === 'sleep' ? '睡覺' : state === 'game' ? '遊戲' : '外出';
  return state === 'study' ? '学习' : state === 'sleep' ? '睡觉' : state === 'game' ? '游戏' : '外出';
}

export function parseStatusSystemMessage(text: string): { userName: string; state: DormState } | null {
  const hit = text.match(/^__status_change__:(.+?):(out|study|sleep|game)$/);
  if (!hit) return null;
  return { userName: hit[1], state: hit[2] as DormState };
}

export function mergeChatMessages(base: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<number, ChatMessage>();
  base.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return [...map.values()].sort((a, b) => a.id - b.id);
}