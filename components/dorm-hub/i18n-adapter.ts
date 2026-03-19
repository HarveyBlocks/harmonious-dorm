import { normalizeBillCategory } from '@/lib/domain-codes';
import type { LanguageCode } from '@/lib/i18n';
import { decodeMessageToken } from '@/lib/i18n/message-token';
import { localizeNoticeToken, NoticeMessageKey } from '@/lib/i18n/notice-messages';

import { BILL_CATEGORY_CUSTOM } from './ui-constants';

const CATEGORY_LABEL_MAP: Record<LanguageCode, Record<string, string>> = {
  en: { electricity: 'Electricity', water: 'Water', internet: 'Internet', supplies: 'Daily Supplies', other: 'Other', [BILL_CATEGORY_CUSTOM]: 'Custom' },
  fr: { electricity: 'Électricité', water: 'Eau', internet: 'Internet', supplies: 'Articles courants', other: 'Autre', [BILL_CATEGORY_CUSTOM]: 'Personnalisée' },
  'zh-TW': { electricity: '電費', water: '水費', internet: '網費', supplies: '日用品', other: '其他', [BILL_CATEGORY_CUSTOM]: '自訂' },
  'zh-CN': { electricity: '电费', water: '水费', internet: '网费', supplies: '日用品', other: '其他', [BILL_CATEGORY_CUSTOM]: '自定义' },
};

function localizeTokenText(lang: LanguageCode, text: string): string | null {
  const token = decodeMessageToken(text);
  if (!token) return null;
  return localizeNoticeToken(lang, token) || text;
}

export function isStatusSystemMessage(text: string): boolean {
  const token = decodeMessageToken(text);
  return token?.key === NoticeMessageKey.ChatStatusChanged;
}

export function categoryLabel(lang: LanguageCode, category: string): string {
  const c = (category || '').trim();
  const code = c === BILL_CATEGORY_CUSTOM ? BILL_CATEGORY_CUSTOM : normalizeBillCategory(c);
  const map = CATEGORY_LABEL_MAP[lang] || CATEGORY_LABEL_MAP['zh-CN'];
  return map[code] || category;
}

export function localizeServerText(lang: LanguageCode, text: string): string {
  const tokenText = localizeTokenText(lang, text);
  if (tokenText !== null) return tokenText;
  return text;
}
