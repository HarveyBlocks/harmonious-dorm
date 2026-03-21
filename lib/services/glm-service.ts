import { AI_CHAT_CONFIG, isAiChatConfigured } from '@/lib/config/ai';
import { ApiError } from '@/lib/errors';
import { requestChatCompletion, streamChatCompletion } from '@/lib/ai/stream-chat-client';

type DeltaHandler = (delta: string) => void;

// GLM streaming adapter built on top of shared AI chat client.
export async function streamGlmReply(input: {
  systemPrompt: string;
  userPrompt: string;
  onDelta: DeltaHandler;
  onReasoningDelta?: DeltaHandler;
  onProgressDelta?: (step: number) => void;
  abortSignal?: AbortSignal;
}): Promise<string> {
  if (!isAiChatConfigured()) {
    throw new ApiError(500, 'AI chat config missing');
  }

  return streamChatCompletion(
    {
      provider: 'glm',
      model: AI_CHAT_CONFIG.model || '',
      baseUrl: AI_CHAT_CONFIG.baseUrl,
      apiKey: AI_CHAT_CONFIG.apiKey || '',
      timeoutMs: AI_CHAT_CONFIG.timeoutMs,
      maxOutputTokens: AI_CHAT_CONFIG.maxOutputTokens,
      echoStreamDelayMs: AI_CHAT_CONFIG.echoStreamDelayMs,
      env: AI_CHAT_CONFIG.env,
    },
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

// GLM non-stream adapter for future reuse in non-chat scenarios.
export async function requestGlmReply(input: {
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  if (!isAiChatConfigured()) {
    throw new ApiError(500, 'AI chat config missing');
  }

  return requestChatCompletion(
    {
      provider: 'glm',
      model: AI_CHAT_CONFIG.model || '',
      baseUrl: AI_CHAT_CONFIG.baseUrl,
      apiKey: AI_CHAT_CONFIG.apiKey || '',
      timeoutMs: AI_CHAT_CONFIG.timeoutMs,
      maxOutputTokens: AI_CHAT_CONFIG.maxOutputTokens,
      echoStreamDelayMs: AI_CHAT_CONFIG.echoStreamDelayMs,
      env: AI_CHAT_CONFIG.env,
    },
    {
      messages: [
        { role: 'system', content: input.systemPrompt },
        { role: 'user', content: input.userPrompt },
      ],
    },
  );
}
