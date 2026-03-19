import type { MultiLangText } from './types';
import backendMessageMapData from './backend-message-map.data.json';

export const BACKEND_MESSAGE_MAP: Record<string, MultiLangText> =
  backendMessageMapData as Record<string, MultiLangText>;
