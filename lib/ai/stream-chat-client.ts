import { ApiError, StreamAbortError, UpstreamServiceError } from '@/lib/errors';
import { logInfo, logWarn } from '@/lib/logger';

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };
type DeltaHandler = (delta: string) => void;
type DeltaStatus = 'content' | 'done' | 'reasoning';
type DeltaLineResult = { status: DeltaStatus; content: string };

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
  echoStreamDelayMs?: number;
  env?: string;
};

export type StreamChatInput = BaseChatInput & {
  onDelta: DeltaHandler;
  onReasoningDelta?: DeltaHandler;
  onProgressDelta?: (step: number) => void;
  abortSignal?: AbortSignal;
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
function toTextChunk(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toTextChunk(item)).join('');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if (typeof record.content === 'string') return record.content;
  }
  return '';
}

function parseDeltaLine({line, env, preStatus}: { line: string, env?: string, preStatus: DeltaStatus }): DeltaLineResult {
  if (env === 'test') {
    const json = JSON.parse(line) as { message?: { content?: unknown }; done?: boolean };
    if (json.done) return { status: 'done', content: '' };
    return { status: 'content', content: toTextChunk(json.message?.content) };
  }
  const trimmed = line.trim();
  if (trimmed === '') return { status: preStatus, content: '' };
  if (!trimmed.startsWith('data:')) return { status: preStatus, content: '' };
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return { status: 'done', content: '' };
  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: unknown; reasoning_content?: unknown };
        message?: { content?: unknown; reasoning_content?: unknown };
      }
      >;
    };
    const content = toTextChunk(json.choices?.[0]?.delta?.content) || toTextChunk(json.choices?.[0]?.message?.content);
    if (content) return { status: 'content', content };
    const reasoning =
      toTextChunk(json.choices?.[0]?.delta?.reasoning_content) ||
      toTextChunk(json.choices?.[0]?.message?.reasoning_content);
    if (reasoning) return { status: 'reasoning', content: reasoning };
    return { status: preStatus, content: '' };
  } catch {
    return { status: preStatus, content: '' };
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
}

function logEchoHandled(config: ChatClientConfig, traceId: string, stream: boolean, body: Record<string, unknown>) {
  logInfo('llm_echo_handled', {
    traceId,
    provider: config.provider,
    model: config.model,
    stream,
    action: 'skip_upstream_and_return_echo_preview',
    request: buildHttpRequestRaw(config, body),
  });
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
  const onExternalAbort = () => controller.abort();
  input.abortSignal?.addEventListener('abort', onExternalAbort);
  let firstChunkAt: number | null = null;
  const requestBody = buildRequestBody(config, input, true);

  if (config.env === 'echo') {
    logEchoHandled(config, traceId, true, requestBody);
    const echoBody = buildEchoPreviewBody(requestBody);
    const echoText = buildHttpRequestPreview(config, echoBody);
    const chunks = splitEchoByToken(echoText);
    const echoDelay = Math.max(1, Math.floor(config.echoStreamDelayMs ?? 40));
    for (const chunk of chunks) {
      if (input.abortSignal?.aborted) {
        throw new StreamAbortError('Stream aborted by user');
      }
      input.onDelta(chunk);
      // Simulate real token cadence in echo mode for front-end streaming tests.
      // eslint-disable-next-line no-await-in-loop
      await sleep(echoDelay);
    }
    clearTimeout(timer);
    input.abortSignal?.removeEventListener('abort', onExternalAbort);
    return echoText;
  }
  logRequestStarted(config, traceId, input, true, requestBody);

  try {
    const resp = await requestUpstream(config, requestBody, controller);
    await assertSuccessfulResponse(resp, config, traceId, startedAt);

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let done = false;
    let preStatus:DeltaStatus = 'content';
    while (!done) {
      // eslint-disable-next-line no-await-in-loop
      const step = await reader.read();
      if (step.done) break;
      buffer += decoder.decode(step.value, { stream: true });
      const parsed = parseSsePayloadLines(buffer);
      buffer = parsed.rest;

      for (const line of parsed.lines) {
        const delta = parseDeltaLine({line: line, env: config.env, preStatus: preStatus});
        preStatus = delta.status;
        if (delta.status === 'done') {
          done = true;
          break;
        }
        if (delta.status === 'reasoning') {
          const step = Math.max(1, delta.content.length || line.length);
          input.onProgressDelta?.(step);
          if (delta.content) input.onReasoningDelta?.(delta.content);
          continue;
        }
        if (!delta.content) continue;
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
    if (input.abortSignal?.aborted) {
      throw new StreamAbortError('Stream aborted by user');
    }
    return normalizeUnknownFailure(config, error);
  } finally {
    clearTimeout(timer);
    input.abortSignal?.removeEventListener('abort', onExternalAbort);
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

  if (config.env === 'echo') {
    logEchoHandled(config, traceId, false, requestBody);
    const echoBody = buildEchoPreviewBody(requestBody);
    const echoText = buildHttpRequestPreview(config, echoBody);
    clearTimeout(timer);
    return echoText;
  }
  logRequestStarted(config, traceId, input, false, requestBody);

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
  const headerLines = Object.entries(headers).map(([key, value]) => `- ${key}: ${value}`);
  return [
    '### Echo HTTP Request',
    '',
    `POST ${config.baseUrl}`,
    '',
    'headers',
    ...headerLines,
    '',
    'body - readable',
    ...buildReadableBodySection(body),
  ].join('\n');
}

function buildHttpRequestRaw(config: ChatClientConfig, body: Record<string, unknown>) {
  return {
    method: 'POST',
    url: config.baseUrl,
    headers: maskSensitiveHeaders(buildRequestHeaders(config)),
    bodyJson: JSON.stringify(body),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildReadableBodySection(body: Record<string, unknown>): string[] {
  const lines: string[] = [];
  collectReadableEntries(body, 'body', lines);
  return lines.length > 0 ? lines : ['- (empty)'];
}

function collectReadableEntries(value: unknown, path: string, lines: string[]) {
  if (value === null || value === undefined) {
    lines.push(`- ${path}: null`);
    return;
  }
  if (typeof value === 'string') {
    if (isMessageContentPath(path)) {
      const rendered = renderMessageContentForEcho(value);
      lines.push(`- ${path}:`);
      lines.push(`\`\`\`${rendered.kind}`);
      lines.push(rendered.text);
      lines.push('```');
      return;
    }
    lines.push(`- ${path}: ${renderEscapedString(value)}`);
    return;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    lines.push(`- ${path}: ${String(value)}`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push(`- ${path}: []`);
      return;
    }
    for (let index = 0; index < value.length; index += 1) {
      collectReadableEntries(value[index], `${path}[${index}]`, lines);
    }
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      lines.push(`- ${path}: {}`);
      return;
    }
    for (const [key, nested] of entries) {
      collectReadableEntries(nested, `${path}.${key}`, lines);
    }
    return;
  }
  lines.push(`- ${path}: ${String(value)}`);
}

function renderEscapedString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function isMessageContentPath(path: string): boolean {
  return /^body\.messages\[\d+\]\.content$/.test(path);
}

function renderMessageContentForEcho(value: string): { kind: 'markdown' | 'text'; text: string } {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const normalized = normalizeHistoryContentForEcho(parsed);
    return {
      kind: 'markdown',
      text: formatMessageContentReadable(normalized),
    };
  } catch {
    return {
      kind: 'text',
      text: value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n'),
    };
  }
}

function normalizeHistoryContentForEcho(input: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  const apply = (history: unknown) => {
    if (!Array.isArray(history)) return;
    history.forEach((row, index) => {
      if (!Array.isArray(row)) return;
      const contentIndex = row.length - 1;
      if (contentIndex >= 0 && typeof row[contentIndex] === 'string') {
        history[index][contentIndex] = (row[contentIndex] as string).replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
      }
    });
  };
  apply(cloned.history);
  if (cloned.userPayload && typeof cloned.userPayload === 'object') {
    apply((cloned.userPayload as Record<string, unknown>).history);
  }
  return cloned;
}

function formatMessageContentReadable(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const schemaVersion = payload.schemaVersion;
  const dormName = payload.dormName;
  const senderRef = payload.senderRef;
  const memoryWindow = payload.memoryWindow;
  const metadata = payload.metadata && typeof payload.metadata === 'object'
    ? (payload.metadata as Record<string, unknown>)
    : null;
  const settings = Array.isArray(payload.settings) ? payload.settings : [];
  const botExtraContent = payload.botExtraContent;

  const history = Array.isArray(payload.history)
    ? payload.history
    : (payload.userPayload && typeof payload.userPayload === 'object' && Array.isArray((payload.userPayload as Record<string, unknown>).history)
      ? ((payload.userPayload as Record<string, unknown>).history as unknown[])
      : []);
  const currentQuery = Array.isArray(payload.currentQuery)
    ? payload.currentQuery
    : (payload.userPayload && typeof payload.userPayload === 'object' && Array.isArray((payload.userPayload as Record<string, unknown>).currentQuery)
      ? ((payload.userPayload as Record<string, unknown>).currentQuery as unknown[])
      : []);

  lines.push('prompt payload');
  if (schemaVersion !== undefined) lines.push(`- schemaVersion: ${String(schemaVersion)}`);
  if (dormName !== undefined) lines.push(`- dormName: ${String(dormName)}`);
  if (senderRef !== undefined) lines.push(`- senderRef: ${String(senderRef)}`);
  if (memoryWindow !== undefined) lines.push(`- memoryWindow: ${String(memoryWindow)}`);
  if (metadata) {
    lines.push(`- metadata.currentTime: ${String(metadata.currentTime ?? '')}`);
    lines.push(`- metadata.currentTimestampSec: ${String(metadata.currentTimestampSec ?? '')}`);
    lines.push(`- metadata.outputTokenLimit: ${String(metadata.outputTokenLimit ?? '')}`);
  }
  lines.push(`- settingsCount: ${settings.length}`);
  if (botExtraContent !== undefined) {
    lines.push(`- botExtraContent: ${String(botExtraContent)}`);
  }
  lines.push('');
  lines.push(`history (${history.length})`);
  history.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    if (row.length >= 5) {
      lines.push(`- [${index}] userRef=${String(row[0])}; userId=${String(row[1])}; userName=${String(row[2])}; dormRole=${String(row[3])}`);
      lines.push(`  content: ${String(row[4])}`);
      return;
    }
    lines.push(`- [${index}] ${JSON.stringify(row)}`);
  });
  lines.push('');
  lines.push('currentQuery');
  if (currentQuery.length >= 2) {
    lines.push(`- senderRef: ${String(currentQuery[0])}`);
    lines.push(`- content: ${String(currentQuery[1])}`);
  } else {
    lines.push('- (empty)');
  }
  return lines.join('\n');
}

function splitEchoByToken(text: string): string[] {
  if (!text) return [];
  const parts = text.match(/(\s+|[^\s]+)/g);
  if (!parts || parts.length === 0) return [text];
  return parts;
}

const ECHO_HISTORY_ITEM_MAX_CHARS = 220;

function truncateEchoText(value: string): string {
  if (value.length <= ECHO_HISTORY_ITEM_MAX_CHARS) return value;
  return `${value.slice(0, ECHO_HISTORY_ITEM_MAX_CHARS)}...`;
}

function buildEchoPreviewBody(body: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  const messages = cloned.messages;
  if (!Array.isArray(messages)) return cloned;
  cloned.messages = messages.map((item) => sanitizeEchoMessage(item));
  return cloned;
}

function sanitizeEchoMessage(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const message = { ...(input as Record<string, unknown>) };
  if (message.role !== 'user' || typeof message.content !== 'string') return message;
  try {
    const parsed = JSON.parse(message.content) as {
      history?: Array<unknown[]>;
      userPayload?: {
        history?: Array<unknown[]>;
      };
    };

    const applyHistoryTrim = (rows: Array<unknown[]>) =>
      rows.map((row) => {
        if (!Array.isArray(row) || row.length === 0) return row;
        const contentIndex = row.length - 1;
        if (typeof row[contentIndex] !== 'string') return row;
        const next = [...row];
        next[contentIndex] = truncateEchoText(next[contentIndex] as string);
        return next;
      });

    let changed = false;
    if (Array.isArray(parsed.history)) {
      parsed.history = applyHistoryTrim(parsed.history);
      changed = true;
    }
    if (parsed.userPayload && Array.isArray(parsed.userPayload.history)) {
      parsed.userPayload.history = applyHistoryTrim(parsed.userPayload.history);
      changed = true;
    }
    if (!changed) return message;
    message.content = JSON.stringify(parsed);
    return message;
  } catch {
    return message;
  }
}
