import domainAliases from './domain-aliases.json';

export type DormStateCode = 'out' | 'study' | 'sleep' | 'game';
export type BillCategoryCode = 'electricity' | 'water' | 'internet' | 'supplies' | 'other';

type AliasRow<TCode extends string> = { code: TCode; aliases: string[] };

const DORM_STATE_ALIASES = domainAliases.dormStates as Array<AliasRow<DormStateCode>>;
const BILL_CATEGORY_ALIASES = domainAliases.billCategories as Array<AliasRow<BillCategoryCode>>;

function normalizeByAliases<TCode extends string>(
  value: string | null | undefined,
  fallback: TCode,
  aliasRows: Array<AliasRow<TCode>>,
): TCode {
  if (!value) return fallback;
  const normalized = value.trim();
  for (const row of aliasRows) {
    if (row.aliases.includes(normalized)) return row.code;
  }
  return fallback;
}

export function normalizeDormState(value: string | null | undefined): DormStateCode {
  return normalizeByAliases(value, 'out', DORM_STATE_ALIASES);
}

export function normalizeBillCategory(value: string | null | undefined): BillCategoryCode {
  return normalizeByAliases(value, 'other', BILL_CATEGORY_ALIASES);
}
