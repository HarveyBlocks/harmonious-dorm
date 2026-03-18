export type DormStateCode = 'out' | 'study' | 'sleep' | 'game';
export type BillCategoryCode = 'electricity' | 'water' | 'internet' | 'supplies' | 'other';

const DORM_STATE_MAP: Record<string, DormStateCode> = {
  out: 'out',
  study: 'study',
  sleep: 'sleep',
  game: 'game',
  外出: 'out',
  学习: 'study',
  睡觉: 'sleep',
  游戏: 'game',
};

const BILL_CATEGORY_MAP: Record<string, BillCategoryCode> = {
  electricity: 'electricity',
  water: 'water',
  internet: 'internet',
  supplies: 'supplies',
  other: 'other',
  电费: 'electricity',
  水费: 'water',
  网费: 'internet',
  日用品: 'supplies',
  其他: 'other',
  自定义: 'other',
};

export function normalizeDormState(value: string | null | undefined): DormStateCode {
  if (!value) return 'out';
  return DORM_STATE_MAP[value] || 'out';
}

export function normalizeBillCategory(value: string | null | undefined): BillCategoryCode {
  if (!value) return 'other';
  return BILL_CATEGORY_MAP[value] || 'other';
}
