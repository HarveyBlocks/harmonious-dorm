import { StreamAbortError } from '@/lib/errors';
import { logInfo } from '@/lib/logger';
import {
  assertSuccessfulResponse,
  buildRequestBody,
  buildTraceId,
  ensureConfig,
  logRequestStarted,
  normalizeUnknownFailure,
  requestUpstream,
} from '@/lib/ai/chat-http';
import { buildEchoPreviewBody, buildHttpRequestPreview, logEchoHandled, splitEchoByToken } from '@/lib/ai/chat-echo';
import { estimateTokens, extractNonStreamContent, parseDeltaLine, parseSsePayloadLines, type DeltaStatus } from '@/lib/ai/chat-parse';
import type { ChatClientConfig, NonStreamChatInput, StreamChatInput } from '@/lib/ai/chat-types';

export type { ChatClientConfig, LlmMessage, NonStreamChatInput, StreamChatInput } from '@/lib/ai/chat-types';
export { estimateTokens } from '@/lib/ai/chat-parse';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setupAbort(input: StreamChatInput, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  input.abortSignal?.addEventListener('abort', onExternalAbort);
  return {
    controller,
    clear: () => {
      clearTimeout(timer);
      input.abortSignal?.removeEventListener('abort', onExternalAbort);
    },
  };
}

async function streamEcho(config: ChatClientConfig, input: StreamChatInput, traceId: string, body: Record<string, unknown>) {
  logEchoHandled(config, traceId, true, body);
  const echoText = buildHttpRequestPreview(config, buildEchoPreviewBody(body));
  const echoDelay = Math.max(1, Math.floor(config.echoStreamDelayMs ?? 40));
  for (const chunk of splitEchoByToken(echoText)) {
    if (input.abortSignal?.aborted) throw new StreamAbortError('Stream aborted by user');
    input.onDelta(chunk);
    // eslint-disable-next-line no-await-in-loop
    await sleep(echoDelay);
  }
  return echoText;
}

async function runStreamingRequest(
  config: ChatClientConfig,
  input: StreamChatInput,
  traceId: string,
  startedAt: number,
  body: Record<string, unknown>,
  controller: AbortController,
): Promise<string> {
  const resp = await requestUpstream(config, body, controller);
  await assertSuccessfulResponse(resp, config, traceId, startedAt);
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';
  let done = false;
  let preStatus: DeltaStatus = 'content';
  let firstChunkAt: number | null = null;

  while (!done) {
    // eslint-disable-next-line no-await-in-loop
    const step = await reader.read();
    if (step.done) break;
    buffer += decoder.decode(step.value, { stream: true });
    const parsed = parseSsePayloadLines(buffer);
    buffer = parsed.rest;
    for (const line of parsed.lines) {
      const delta = parseDeltaLine({ line, env: config.env, preStatus });
      preStatus = delta.status;
      if (delta.status === 'done') {
        done = true;
        break;
      }
      if (delta.status === 'reasoning') {
        const stepSize = Math.max(1, delta.content.length || line.length);
        input.onProgressDelta?.(stepSize);
        if (delta.content) input.onReasoningDelta?.(delta.content);
        continue;
      }
      if (!delta.content) continue;
      fullText += delta.content;
      if (firstChunkAt === null) {
        firstChunkAt = Date.now();
        logInfo('llm_first_stream_chunk', { traceId, provider: config.provider, model: config.model, firstChunkLatencyMs: firstChunkAt - startedAt });
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
}

export async function streamChatCompletion(config: ChatClientConfig, input: StreamChatInput): Promise<string> {
  ensureConfig(config);
  const traceId = buildTraceId(config.provider);
  const startedAt = Date.now();
  const abort = setupAbort(input, config.timeoutMs);
  const requestBody = buildRequestBody(config, input, true);
  if (config.env === 'echo') {
    try {
      return await streamEcho(config, input, traceId, requestBody);
    } finally {
      abort.clear();
    }
  }

  logRequestStarted(config, traceId, input, true);
  try {
    return await runStreamingRequest(config, input, traceId, startedAt, requestBody, abort.controller);
  } catch (error) {
    if (input.abortSignal?.aborted) throw new StreamAbortError('Stream aborted by user');
    return normalizeUnknownFailure(config, error);
  } finally {
    abort.clear();
  }
}

export async function requestChatCompletion(config: ChatClientConfig, input: NonStreamChatInput): Promise<string> {
  ensureConfig(config);
  const traceId = buildTraceId(config.provider);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const requestBody = buildRequestBody(config, input, false);

  if (config.env === 'echo') {
    logEchoHandled(config, traceId, false, requestBody);
    clearTimeout(timer);
    return buildHttpRequestPreview(config, buildEchoPreviewBody(requestBody));
  }

  logRequestStarted(config, traceId, input, false);
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
