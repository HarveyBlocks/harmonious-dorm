import type { LanguageCode, MultiLangText } from './types';
import uiTextsData from './ui-texts.data.json';

export const UI_TEXTS: Record<string, MultiLangText> = uiTextsData as Record<string, MultiLangText>;

export type UiTextKey = keyof typeof UI_TEXTS;

export function getUiText(lang: LanguageCode): Record<UiTextKey, string> {
  const entries = Object.entries(UI_TEXTS).map(([key, value]) => [key, value[lang] || value['zh-CN']]);
  return Object.fromEntries(entries) as Record<UiTextKey, string>;
}
