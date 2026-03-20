function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeBaseUrl(raw: string | undefined): string {
  const value = (raw || '').trim();
  if (!value) return '';
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export const AI_CHAT_CONFIG = {
  env: process.env.CHAT_ENV || '',
  baseUrl: normalizeBaseUrl(process.env.GLM_BASE_URL),
  apiKey: process.env.GLM_API_KEY?.trim(),
  model: process.env.GLM_MODEL?.trim(),
  maxInputTokens: readPositiveInt(process.env.BOT_INPUT_MAX_TOKENS, 1500),
  maxOutputTokens: readPositiveInt(process.env.BOT_OUTPUT_MAX_TOKENS, 800),
  timeoutMs: readPositiveInt(process.env.BOT_API_TIMEOUT_MS, 45000),
  echoStreamDelayMs: readPositiveInt(process.env.BOT_ECHO_STREAM_DELAY_MS, 40),
} as const;

export function isAiChatConfigured(): boolean {
  return Boolean(AI_CHAT_CONFIG.baseUrl && AI_CHAT_CONFIG.apiKey && AI_CHAT_CONFIG.model);
}
