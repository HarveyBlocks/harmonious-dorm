import { ApiError, UpstreamServiceError } from '@/lib/errors';
import { logInfo, logWarn } from '@/lib/logger';

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type DeltaHandler = (delta: string) => void;
type DeltaLineResult = { content: string; done: boolean };

type BaseChatInput = {
  messages: LlmMessage[];
  extraBody?: Record<string, unknown>;
};

export type ChatClientConfig = {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  maxOutputTokens: number;
  env?: string;
};

export type StreamChatInput = BaseChatInput & {
  onDelta: DeltaHandler;
};

export type NonStreamChatInput = BaseChatInput;

// Correlates all log lines for a single upstream request.
function buildTraceId(provider: string): string {
  return `${provider}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Shared lightweight estimator used only for observability logs.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(/[\u3400-\u9FFF]/g) || []).length;
  const otherCount = Math.max(0, text.length - cjkCount);
  return cjkCount + Math.ceil(otherCount / 4);
}

// Streaming parser helper: keeps incomplete tail in `rest`.
function parseSsePayloadLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts, rest };
}

// Normalizes provider stream payload into unified delta shape.
function parseDeltaLine(line: string, env?: string): DeltaLineResult {
  if (env === 'test') {
    const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
    return { content: json.message?.content || '', done: Boolean(json.done) };
  }
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return { content: '', done: true };
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return { content: '', done: true };
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || '';
    return { content, done: false };
  } catch {
    return { content: '', done: true };
  }
}

// Extract provider error code/message from non-2xx response body.
function parseUpstreamErrorPayload(detail: string): { code?: string; message?: string } {
  if (!detail) return {};
  try {
    const parsed = JSON.parse(detail) as { error?: { code?: string; message?: string } };
    return { code: parsed?.error?.code, message: parsed?.error?.message };
  } catch {
    return {};
  }
}

// Non-stream parser for common OpenAI-compatible response bodies.
function extractNonStreamContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as {
    message?: { content?: string };
    choices?: Array<{ message?: { content?: string } }>;
    content?: string;
  };
  return data.message?.content || data.choices?.[0]?.message?.content || data.content || '';
}

// Shared request body builder for stream and non-stream calls.
function buildRequestBody(config: ChatClientConfig, input: BaseChatInput, stream: boolean): Record<string, unknown> {
  return {
    model: config.model,
    stream,
    max_tokens: config.maxOutputTokens,
    messages: input.messages,
    ...(input.extraBody || {}),
  };
}

// Shared required-config guard.
function ensureConfig(config: ChatClientConfig) {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new ApiError(500, 'AI chat config missing');
  }
}

// Shared HTTP call for all chat-completion variants.
async function requestUpstream(
  config: ChatClientConfig,
  body: Record<string, unknown>,
  controller: AbortController,
): Promise<Response> {
  const headers = buildRequestHeaders(config);
  return fetch(config.baseUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: controller.signal,
  });
}

// Shared non-2xx handling and standardized upstream exception mapping.
async function assertSuccessfulResponse(
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
    report: {
      upstreamMessage: upstream.message || detail || '',
      upstreamRequestId,
    },
  });
}

function logRequestStarted(
  config: ChatClientConfig,
  traceId: string,
  input: BaseChatInput,
  stream: boolean,
  body: Record<string, unknown>,
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
  if (config.env === 'echo') {
    logInfo('llm_request_http_preview', {
      traceId,
      provider: config.provider,
      model: config.model,
      httpRequest: buildHttpRequestPreview(config, body),
    });
  }
}

// Shared terminal error normalizer used by both entry points.
function normalizeUnknownFailure(config: ChatClientConfig, error: unknown): never {
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

// Stream=true entry point. Emits delta via callback and returns full text.
export async function streamChatCompletion(config: ChatClientConfig, input: StreamChatInput): Promise<string> {
  ensureConfig(config);

  const traceId = buildTraceId(config.provider);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let firstChunkAt: number | null = null;
  const requestBody = buildRequestBody(config, input, true);

  logRequestStarted(config, traceId, input, true, requestBody);
  if (config.env === 'echo') {
    const echoText = buildHttpRequestPreview(config, requestBody);
    const chunks = chunkText(echoText, 96);
    for (const chunk of chunks) {
      if (firstChunkAt === null) {
        firstChunkAt = Date.now();
        logInfo('llm_first_stream_chunk', {
          traceId,
          provider: config.provider,
          model: config.model,
          firstChunkLatencyMs: firstChunkAt - startedAt,
        });
      }
      input.onDelta(chunk);
    }
    logInfo('llm_stream_completed', {
      traceId,
      provider: config.provider,
      model: config.model,
      totalCostMs: Date.now() - startedAt,
      firstChunkLatencyMs: firstChunkAt === null ? null : firstChunkAt - startedAt,
      estimatedOutputTokens: estimateTokens(echoText),
      outputChars: echoText.length,
      mode: 'echo',
    });
    clearTimeout(timer);
    return echoText;
  }

  try {
    const resp = await requestUpstream(config, requestBody, controller);
    await assertSuccessfulResponse(resp, config, traceId, startedAt);

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let done = false;

    while (!done) {
      // eslint-disable-next-line no-await-in-loop
      const step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });
      const parsed = parseSsePayloadLines(buffer);
      buffer = parsed.rest;

      for (const line of parsed.lines) {
        const delta = parseDeltaLine(line, config.env);
        if (!delta.content) {
          if (delta.done) {
            done = true;
            break;
          }
          continue;
        }
        fullText += delta.content;
        if (firstChunkAt === null) {
          firstChunkAt = Date.now();
          logInfo('llm_first_stream_chunk', {
            traceId,
            provider: config.provider,
            model: config.model,
            firstChunkLatencyMs: firstChunkAt - startedAt,
          });
        }
        input.onDelta(delta.content);
      }
    }

    logInfo('llm_stream_completed', {
      traceId,
      provider: config.provider,
      model: config.model,
      totalCostMs: Date.now() - startedAt,
      firstChunkLatencyMs: firstChunkAt === null ? null : firstChunkAt - startedAt,
      estimatedOutputTokens: estimateTokens(fullText),
      outputChars: fullText.length,
    });
    return fullText.trim();
  } catch (error) {
    return normalizeUnknownFailure(config, error);
  } finally {
    clearTimeout(timer);
  }
}

// Stream=false entry point. Returns one final text response.
export async function requestChatCompletion(config: ChatClientConfig, input: NonStreamChatInput): Promise<string> {
  ensureConfig(config);

  const traceId = buildTraceId(config.provider);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const requestBody = buildRequestBody(config, input, false);

  logRequestStarted(config, traceId, input, false, requestBody);
  if (config.env === 'echo') {
    const echoText = buildHttpRequestPreview(config, requestBody);
    logInfo('llm_response_received', {
      traceId,
      provider: config.provider,
      model: config.model,
      totalCostMs: Date.now() - startedAt,
      estimatedOutputTokens: estimateTokens(echoText),
      outputChars: echoText.length,
      mode: 'echo',
    });
    clearTimeout(timer);
    return echoText;
  }

  try {
    const resp = await requestUpstream(config, requestBody, controller);
    await assertSuccessfulResponse(resp, config, traceId, startedAt);

    const payload = (await resp.json()) as unknown;
    const text = extractNonStreamContent(payload).trim();

    logInfo('llm_response_received', {
      traceId,
      provider: config.provider,
      model: config.model,
      totalCostMs: Date.now() - startedAt,
      estimatedOutputTokens: estimateTokens(text),
      outputChars: text.length,
    });
    return text;
  } catch (error) {
    return normalizeUnknownFailure(config, error);
  } finally {
    clearTimeout(timer);
  }
}

function buildRequestHeaders(config: ChatClientConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  };
}

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers };
  if (masked.Authorization) {
    masked.Authorization = 'Bearer ***';
  }
  return masked;
}

function buildHttpRequestPreview(config: ChatClientConfig, body: Record<string, unknown>): string {
  const headers = maskSensitiveHeaders(buildRequestHeaders(config));
  return [
    `POST ${config.baseUrl}`,
    'headers',
    JSON.stringify(headers, null, 2),
    'body - json',
    JSON.stringify(body, null, 2),
  ].join('\n');
}

function chunkText(text: string, size: number): string[] {
  if (!text) return [];
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
