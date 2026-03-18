import type { DormState } from '@/lib/types';

export const CHAT_PAGE_LIMIT = 20;
export const BILL_PAGE_LIMIT = 8;
export const BILL_AUTO_FILL_UNPAID = 10;
export const BILL_AUTO_FILL_TOTAL_GROUPS = 4;

export const BILL_CATEGORY_CUSTOM = '__custom__';
export const BILL_CATEGORIES = ['electricity', 'water', 'internet', 'supplies', 'other', BILL_CATEGORY_CUSTOM] as const;
export const STATUS_OPTIONS: DormState[] = ['out', 'study', 'sleep', 'game'];

const CHART_PALETTE = ['#2563eb', '#06b6d4', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#10b981', '#e11d48'];

export function randomColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
