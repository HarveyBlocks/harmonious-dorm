export type MessageTokenParams = Record<string, string | number | boolean | null | undefined>;

export type MessageToken = {
  key: string;
  params?: MessageTokenParams;
};

const PREFIX = '__i18n__:';

export function encodeMessageToken(key: string, params?: MessageTokenParams): string {
  const payload: MessageToken = params && Object.keys(params).length > 0 ? { key, params } : { key };
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function decodeMessageToken(text: string): MessageToken | null {
  if (!text.startsWith(PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(PREFIX.length)) as MessageToken;
    if (!parsed || parsed.key.trim().length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
