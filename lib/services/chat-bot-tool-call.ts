import { streamGlmMessages, streamGlmReply, requestGlmPayload } from '@/lib/services/glm-service';
import { executeTool, listAllowedTools, type ToolDescriptor, type ToolExecutionContext, type ToolName } from '@/lib/tools';
import { logInfo, logWarn } from '@/lib/logger';
import type { LlmMessage, LlmToolCall } from '@/lib/ai/chat-types';

export type BotStreamPhase = 'requesting' | 'thinking' | 'tool_calling' | 'tool_result_thinking' | 'responding';

export type ToolExecutionRecord = {
  tool: string;
  args: Record<string, unknown>;
  output?: unknown;
  error?: string;
  errorCode?: string;
};

type NativeToolCall = {
  id: string;
  name: ToolName;
  args: Record<string, unknown>;
};

function normalizeArgs(raw: string): Record<string, unknown> {
  const text = (raw || '').trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function buildNativeTools(allowedTools: ToolDescriptor[]) {
  return allowedTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.argumentSchema,
    },
  }));
}

function parseFirstAssistant(payload: unknown): { content: string; toolCalls: NativeToolCall[]; assistantToolCalls: LlmToolCall[] } {
  if (!payload || typeof payload !== 'object') {
    return { content: '', toolCalls: [], assistantToolCalls: [] };
  }

  const root = payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
        tool_calls?: Array<{
          id?: unknown;
          type?: unknown;
          function?: { name?: unknown; arguments?: unknown };
        }>;
      };
    }>;
    echoPreview?: unknown;
  };

  if (typeof root.echoPreview === 'string') {
    return { content: root.echoPreview, toolCalls: [], assistantToolCalls: [] };
  }

  const message = root.choices?.[0]?.message;
  const content = typeof message?.content === 'string' ? message.content : '';
  const rawCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];

  const assistantToolCalls: LlmToolCall[] = [];
  const toolCalls: NativeToolCall[] = [];

  for (let i = 0; i < rawCalls.length; i += 1) {
    const item = rawCalls[i];
    const functionName = String(item?.function?.name || '').trim();
    if (!functionName) continue;
    const id = String(item?.id || `tool_call_${i + 1}`);
    const argumentsRaw = String(item?.function?.arguments || '');
    assistantToolCalls.push({
      id,
      type: 'function',
      function: {
        name: functionName,
        arguments: argumentsRaw,
      },
    });
    toolCalls.push({
      id,
      name: functionName as ToolName,
      args: normalizeArgs(argumentsRaw),
    });
  }

  return { content, toolCalls, assistantToolCalls };
}

function executeNativeToolCalls(
  calls: NativeToolCall[],
  caller: ToolExecutionContext,
  toolTraceId: string,
): { executions: ToolExecutionRecord[]; toolMessages: LlmMessage[] } {
  const executions: ToolExecutionRecord[] = [];
  const toolMessages: LlmMessage[] = [];

  for (let i = 0; i < calls.length; i += 1) {
    const call = calls[i];
    logInfo('bot_tool_invoking', {
      toolTraceId,
      index: i,
      total: calls.length,
      tool: call.name,
      args: call.args,
      callerUserId: caller.callerUserId,
      callerIsLeader: caller.callerIsLeader,
    });

    const result = executeTool(call.name, call.args, caller);

    if (result.ok) {
      logInfo('bot_tool_invoked', {
        toolTraceId,
        index: i,
        total: calls.length,
        tool: call.name,
        args: call.args,
        output: result.output,
      });
      executions.push({ tool: call.name, args: call.args, output: result.output });
      toolMessages.push({
        role: 'tool',
        tool_call_id: call.id,
        name: call.name,
        content: JSON.stringify({ ok: true, output: result.output }),
      });
      continue;
    }

    logWarn('bot_tool_failed', {
      toolTraceId,
      index: i,
      total: calls.length,
      tool: call.name,
      args: call.args,
      errorCode: result.errorCode,
      error: result.error,
    });
    executions.push({ tool: call.name, args: call.args, error: result.error, errorCode: result.errorCode });
    toolMessages.push({
      role: 'tool',
      tool_call_id: call.id,
      name: call.name,
      content: JSON.stringify({ ok: false, errorCode: result.errorCode, error: result.error }),
    });
  }

  return { executions, toolMessages };
}

export async function runBotReplyWithToolCall(input: {
  systemPrompt: string;
  userPrompt: string;
  toolPermissions: Record<string, 'allow' | 'deny'>;
  caller: ToolExecutionContext;
  onDelta: (delta: string) => void;
  onReasoningDelta?: (delta: string) => void;
  onProgressDelta?: (step: number) => void;
  onPhase?: (phase: BotStreamPhase) => void;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const toolTraceId = `tool-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const allowedTools = listAllowedTools(input.toolPermissions);
  let emittedResponding = false;

  const emitRespondingIfNeeded = () => {
    if (emittedResponding) return;
    emittedResponding = true;
    input.onPhase?.('responding');
  };

  const onDelta = (delta: string) => {
    emitRespondingIfNeeded();
    input.onDelta(delta);
  };

  input.onPhase?.('requesting');
  logInfo('bot_tool_pipeline_started', {
    toolTraceId,
    callerUserId: input.caller.callerUserId,
    callerIsLeader: input.caller.callerIsLeader,
    allowedTools: allowedTools.map((item) => item.name),
  });

  if (allowedTools.length === 0) {
    input.onPhase?.('thinking');
    return streamGlmReply({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      onDelta,
      onReasoningDelta: input.onReasoningDelta,
      onProgressDelta: input.onProgressDelta,
      abortSignal: input.abortSignal,
    });
  }

  const baseMessages: LlmMessage[] = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ];

  input.onPhase?.('thinking');
  const firstPayload = await requestGlmPayload({
    messages: baseMessages,
    extraBody: {
      tools: buildNativeTools(allowedTools),
      tool_choice: 'auto',
    },
  });

  const first = parseFirstAssistant(firstPayload);
  logInfo('bot_tool_planner_result', {
    toolTraceId,
    parsedTools: first.toolCalls.map((item) => item.name),
    toolCallCount: first.toolCalls.length,
  });

  if (first.toolCalls.length === 0) {
    if (first.content) {
      onDelta(first.content);
      return first.content.trim();
    }
    input.onPhase?.('thinking');
    return streamGlmReply({
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      onDelta,
      onReasoningDelta: input.onReasoningDelta,
      onProgressDelta: input.onProgressDelta,
      abortSignal: input.abortSignal,
    });
  }

  input.onPhase?.('tool_calling');
  const { executions, toolMessages } = executeNativeToolCalls(first.toolCalls, input.caller, toolTraceId);
  logInfo('bot_tool_execution_batch_completed', { toolTraceId, executionCount: executions.length });

  input.onPhase?.('tool_result_thinking');
  return streamGlmMessages({
    messages: [
      ...baseMessages,
      {
        role: 'assistant',
        content: first.content || '',
        tool_calls: first.assistantToolCalls,
      },
      ...toolMessages,
    ],
    onDelta,
    onReasoningDelta: input.onReasoningDelta,
    onProgressDelta: input.onProgressDelta,
    abortSignal: input.abortSignal,
  });
}

