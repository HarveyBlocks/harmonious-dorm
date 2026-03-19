import type { LanguageCode } from './types';
import { BACKEND_MESSAGE_MAP } from './backend-message-map';

export const BACKEND_MESSAGES = BACKEND_MESSAGE_MAP;

export function translateBackendMessage(lang: LanguageCode, message: string): string {
  return BACKEND_MESSAGES[message]?.[lang] || message;
}
