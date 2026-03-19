export type DormStateCode = 'out' | 'study' | 'sleep' | 'game';
export type BillCategoryCode = 'electricity' | 'water' | 'internet' | 'supplies' | 'other';

const DORM_STATE_CODES = new Set<DormStateCode>(['out', 'study', 'sleep', 'game']);
const DORM_STATE_ALIASES: Array<{ code: DormStateCode; aliases: string[] }> = [
  { code: 'out', aliases: ['外出'] },
  { code: 'study', aliases: ['学习'] },
  { code: 'sleep', aliases: ['睡觉'] },
  { code: 'game', aliases: ['游戏'] },
];

const BILL_CATEGORY_CODES = new Set<BillCategoryCode>(['electricity', 'water', 'internet', 'supplies', 'other']);
const BILL_CATEGORY_ALIASES: Array<{ code: BillCategoryCode; aliases: string[] }> = [
  { code: 'electricity', aliases: ['电费'] },
  { code: 'water', aliases: ['水费'] },
  { code: 'internet', aliases: ['网费'] },
  { code: 'supplies', aliases: ['日用品'] },
  { code: 'other', aliases: ['其他', '自定义'] },
];

export function normalizeDormState(value: string | null | undefined): DormStateCode {
  if (!value) return 'out';
  const normalized = value.trim();
  if (DORM_STATE_CODES.has(normalized as DormStateCode)) return normalized as DormStateCode;
  return DORM_STATE_ALIASES.find((item) => item.aliases.includes(normalized))?.code || 'out';
}

export function normalizeBillCategory(value: string | null | undefined): BillCategoryCode {
  if (!value) return 'other';
  const normalized = value.trim();
  if (BILL_CATEGORY_CODES.has(normalized as BillCategoryCode)) return normalized as BillCategoryCode;
  return BILL_CATEGORY_ALIASES.find((item) => item.aliases.includes(normalized))?.code || 'other';
}
