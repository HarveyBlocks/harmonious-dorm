import type { DormState } from '@/lib/types';

function readPublicInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export const CHAT_PAGE_LIMIT = readPublicInt('NEXT_PUBLIC_CHAT_PAGE_LIMIT', 20);
export const BILL_PAGE_LIMIT = readPublicInt('NEXT_PUBLIC_BILL_PAGE_LIMIT', 8);
export const BILL_AUTO_FILL_UNPAID = readPublicInt('NEXT_PUBLIC_BILL_AUTO_FILL_UNPAID', 10);
export const BILL_AUTO_FILL_TOTAL_GROUPS = readPublicInt('NEXT_PUBLIC_BILL_AUTO_FILL_TOTAL_GROUPS', 4);

export const CHAT_CONTEXT_MENU_WIDTH = readPublicInt('NEXT_PUBLIC_CHAT_CONTEXT_MENU_WIDTH', 240);
export const CHAT_CONTEXT_MENU_HEIGHT = readPublicInt('NEXT_PUBLIC_CHAT_CONTEXT_MENU_HEIGHT', 104);
export const CHAT_CONTEXT_MENU_MARGIN = readPublicInt('NEXT_PUBLIC_CHAT_CONTEXT_MENU_MARGIN', 8);
export const CHAT_CONTEXT_MENU_OFFSET = readPublicInt('NEXT_PUBLIC_CHAT_CONTEXT_MENU_OFFSET', 6);
export const CHAT_CONTEXT_LONG_PRESS_MS = readPublicInt('NEXT_PUBLIC_CHAT_CONTEXT_LONG_PRESS_MS', 460);

export const SOCKET_INIT_MAX_ATTEMPTS = readPublicInt('NEXT_PUBLIC_SOCKET_INIT_MAX_ATTEMPTS', 3);
export const SOCKET_INIT_RETRY_BASE_MS = readPublicInt('NEXT_PUBLIC_SOCKET_INIT_RETRY_BASE_MS', 250);
export const SOCKET_INIT_COOLDOWN_MS = readPublicInt('NEXT_PUBLIC_SOCKET_INIT_COOLDOWN_MS', 5000);
export const NOTICE_POPUP_HIDE_MS = readPublicInt('NEXT_PUBLIC_NOTICE_POPUP_HIDE_MS', 5000);

export const BILL_CATEGORY_CUSTOM = '__custom__';
export const BILL_CATEGORIES = ['electricity', 'water', 'internet', 'supplies', 'other', BILL_CATEGORY_CUSTOM] as const;
export const STATUS_OPTIONS: DormState[] = ['out', 'study', 'sleep', 'game'];

const CHART_PALETTE = ['#2563eb', '#06b6d4', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#10b981', '#e11d48'];

export function randomColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
