export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };

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

export type BaseChatInput = {
  messages: LlmMessage[];
  extraBody?: Record<string, unknown>;
};

export type StreamChatInput = BaseChatInput & {
  onDelta: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onProgressDelta?: (step: number) => void;
  abortSignal?: AbortSignal;
};

export type NonStreamChatInput = BaseChatInput;
