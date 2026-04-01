﻿import { AI_CHAT_CONFIG, isAiChatConfigured } from '@/lib/config/ai';
import { ApiError } from '@/lib/errors';
import { requestChatCompletion, requestChatCompletionPayload, streamChatCompletion, type ChatClientConfig, type LlmMessage } from '@/lib/ai/stream-chat-client';

type DeltaHandler = (delta: string) => void;

function buildGlmClientConfig(): ChatClientConfig {
  return {
    provider: 'glm',
    model: AI_CHAT_CONFIG.model || '',
    baseUrl: AI_CHAT_CONFIG.baseUrl,
    apiKey: AI_CHAT_CONFIG.apiKey || '',
    timeoutMs: AI_CHAT_CONFIG.timeoutMs,
    maxOutputTokens: AI_CHAT_CONFIG.maxOutputTokens,
    echoStreamDelayMs: AI_CHAT_CONFIG.echoStreamDelayMs,
    env: AI_CHAT_CONFIG.env,
  };
}

function ensureGlmConfigured() {
  if (!isAiChatConfigured()) {
    throw new ApiError(500, 'AI chat config missing', { code: 'ai.config.missing' });
  }
}

export async function streamGlmReply(input: {
  systemPrompt: string;
  userPrompt: string;
  onDelta: DeltaHandler;
  onReasoningDelta?: DeltaHandler;
  onProgressDelta?: (step: number) => void;
  abortSignal?: AbortSignal;
}): Promise<string> {
  ensureGlmConfigured();
  return streamChatCompletion(
    buildGlmClientConfig(),
    {
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
      onDelta: input.onDelta,
      onReasoningDelta: input.onReasoningDelta,
      onProgressDelta: input.onProgressDelta,
      abortSignal: input.abortSignal,
    },
  );
}

export async function streamGlmMessages(input: {
  messages: LlmMessage[];
  extraBody?: Record<string, unknown>;
  onDelta: DeltaHandler;
  onReasoningDelta?: DeltaHandler;
  onProgressDelta?: (step: number) => void;
  abortSignal?: AbortSignal;
}): Promise<string> {
  ensureGlmConfigured();
  return streamChatCompletion(buildGlmClientConfig(), {
    messages: input.messages,
    extraBody: input.extraBody,
    onDelta: input.onDelta,
    onReasoningDelta: input.onReasoningDelta,
    onProgressDelta: input.onProgressDelta,
    abortSignal: input.abortSignal,
  });
}

export async function requestGlmReply(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  ensureGlmConfigured();
  return requestChatCompletion(buildGlmClientConfig(), {
    messages: [
      { role: 'system', content: input.systemPrompt },
      { role: 'user', content: input.userPrompt },
    ],
  });
}

export async function requestGlmMessages(input: {
  messages: LlmMessage[];
  extraBody?: Record<string, unknown>;
}): Promise<string> {
  ensureGlmConfigured();
  return requestChatCompletion(buildGlmClientConfig(), {
    messages: input.messages,
    extraBody: input.extraBody,
  });
}

export async function requestGlmPayload(input: {
  messages: LlmMessage[];
  extraBody?: Record<string, unknown>;
}): Promise<unknown> {
  ensureGlmConfigured();
  return requestChatCompletionPayload(buildGlmClientConfig(), {
    messages: input.messages,
    extraBody: input.extraBody,
  });
}
