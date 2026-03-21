import { ApiError, UpstreamServiceError } from '@/lib/errors';
import { logInfo, logWarn } from '@/lib/logger';
import { estimateTokens } from '@/lib/ai/chat-parse';
import type { BaseChatInput, ChatClientConfig } from '@/lib/ai/chat-types';

export function buildTraceId(provider: string): string {
  return `${provider}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function buildRequestBody(config: ChatClientConfig, input: BaseChatInput, stream: boolean): Record<string, unknown> {
  return {
    model: config.model,
    stream,
    max_tokens: config.maxOutputTokens,
    messages: input.messages,
    ...(input.extraBody || {}),
  };
}

export function ensureConfig(config: ChatClientConfig) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new ApiError(500, 'AI chat config missing');
  }
}

export function buildRequestHeaders(config: ChatClientConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
}

export async function requestUpstream(
  config: ChatClientConfig,
  body: Record<string, unknown>,
  controller: AbortController,
): Promise<Response> {
  return fetch(config.baseUrl, {
    method: 'POST',
    headers: buildRequestHeaders(config),
    body: JSON.stringify(body),
    signal: controller.signal,
  });
}

function parseUpstreamErrorPayload(detail: string): { code?: string; message?: string } {
  if (!detail) return {};
  try {
    const parsed = JSON.parse(detail) as { error?: { code?: string; message?: string } };
    return { code: parsed?.error?.code, message: parsed?.error?.message };
  } catch {
    return {};
  }
}

export async function assertSuccessfulResponse(
  resp: Response,
  config: ChatClientConfig,
  traceId: string,
  startedAt: number,
): Promise<void> {
  if (resp.ok && resp.body) return;
  const detail = await resp.text().catch(() => '');
  const upstream = parseUpstreamErrorPayload(detail);
  const upstreamRequestId = resp.headers.get('x-request-id') || resp.headers.get('request-id') || undefined;
  const isRateLimit = resp.status === 429 || upstream.code === '1302';
  logWarn('llm_request_rejected', {
    traceId,
    provider: config.provider,
    model: config.model,
    costMs: Date.now() - startedAt,
    upstreamStatus: resp.status,
    upstreamCode: upstream.code,
    upstreamRequestId,
  });
  throw new UpstreamServiceError({
    status: 502,
    message: isRateLimit ? 'AI service rate limited' : 'AI service request failed',
    upstreamService: config.provider,
    upstreamStatus: resp.status,
    upstreamCode: upstream.code,
    retryable: isRateLimit,
    report: { upstreamMessage: upstream.message || detail || '', upstreamRequestId },
  });
}

export function logRequestStarted(
  config: ChatClientConfig,
  traceId: string,
  input: BaseChatInput,
  stream: boolean,
) {
  logInfo('llm_request_started', {
    traceId,
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    maxOutputTokens: config.maxOutputTokens,
    stream,
    estimatedInputTokens: estimateTokens(input.messages.map((item) => item.content).join('\n')),
  });
}

export function normalizeUnknownFailure(config: ChatClientConfig, error: unknown): never {
  if (error instanceof ApiError) throw error;
  if (error instanceof Error && error.name === 'AbortError') {
    throw new UpstreamServiceError({
      status: 504,
      message: 'AI service timeout',
      upstreamService: config.provider,
      upstreamStatus: 504,
      retryable: true,
    });
  }
  throw new UpstreamServiceError({
    status: 502,
    message: 'AI service request failed',
    upstreamService: config.provider,
    retryable: true,
  });
}
