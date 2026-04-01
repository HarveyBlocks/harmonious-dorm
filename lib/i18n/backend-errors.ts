import { BackendErrorCodeMissingError } from '@/lib/errors';
import type { LanguageCode, MultiLangText } from './types';
import backendErrorMapData from './backend-error-map.data.json';

const BACKEND_ERROR_MAP: Record<string, MultiLangText> = backendErrorMapData as Record<string, MultiLangText>;

function fillTemplate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    if (!(key in params)) return `{${key}}`;
    const value = params[key];
    if (value == null) return '';
    return String(value);
  });
}

export function translateBackendErrorByCode(
  lang: LanguageCode,
  code: string,
  params?: Record<string, unknown>,
): string {
  const row = BACKEND_ERROR_MAP[code];
  if (!row) {
    throw new BackendErrorCodeMissingError(code);
  }
  const template = row[lang] || row['zh-CN'];
  if (!template) {
    throw new BackendErrorCodeMissingError(code);
  }
  return fillTemplate(template, params);
}

export { BACKEND_ERROR_MAP };
