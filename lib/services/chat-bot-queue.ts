import type { SessionUser } from '@/lib/types';
import { emitToDorm } from '@/lib/socket-server';
import { prisma } from '@/lib/db';
import { ApiError, StreamAbortError, UpstreamServiceError } from '@/lib/errors';
import { logError, logWarn } from '@/lib/logger';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';

import { ensureDormBotUser } from './bot-service';
import { replyByDormBotIfMentioned } from './chat-bot-service';

export interface DormBotTask {
  id: string;
  dormId: number;
  createdAt: number;
  anchorMessageId: number;
  streamId: number;
  streamOrder: number;
  botId: number;
  botName: string;
  placeholderMessageId: number;
  content: string;
  contextMessageIds?: number[];
  session: SessionUser;
  meta: {
    source: 'chat';
    actorUserId: number;
  };
  attempts: number;
  maxAttempts: number;
}

type DormQueueState = {
  running: boolean;
  items: DormBotTask[];
};

const dormQueueMap = new Map<number, DormQueueState>();
const runningStreamAbortMap = new Map<number, {
  dormId: number;
  actorUserId: number;
  abort: () => void;
}>();

function queueStateOf(dormId: number): DormQueueState {
  const existing = dormQueueMap.get(dormId);
  if (existing) return existing;
  const state: DormQueueState = { running: false, items: [] };
  dormQueueMap.set(dormId, state);
  return state;
}

function taskIdOf(dormId: number, anchorMessageId: number): string {
  return `${dormId}-${anchorMessageId}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}


async function runDormQueue(dormId: number): Promise<void> {
  const state = queueStateOf(dormId);
  if (state.running) return;
  state.running = true;
  try {
    while (true) {
      const task = state.items.shift();
      if (!task) break;
      const streamAbortController = new AbortController();
      runningStreamAbortMap.set(task.streamId, {
        dormId: task.dormId,
        actorUserId: task.meta.actorUserId,
        abort: () => streamAbortController.abort(),
      });
      try {
        await replyByDormBotIfMentioned(task.session, task.content, task.anchorMessageId, {
          force: true,
          emitStart: false,
          streamId: task.streamId,
          streamOrder: task.streamOrder,
          botIdentity: { id: task.botId, name: task.botName },
          explicitContextMessageIds: task.contextMessageIds,
          abortSignal: streamAbortController.signal,
        });
      } catch (error) {
        if (error instanceof StreamAbortError) {
          continue;
        }
        const isRetryable = error instanceof UpstreamServiceError && error.retryable;
        if (isRetryable) {
          logWarn('dorm_bot_task_retry_suppressed', {
            dormId: task.dormId,
            taskId: task.id,
            reason: error.message,
            upstreamStatus: error.upstreamStatus,
            upstreamCode: error.upstreamCode,
            policy: 'no_auto_retry',
          });
        }

        logError('dorm_bot_task_failed', error, {
          dormId: task.dormId,
          taskId: task.id,
          anchorMessageId: task.anchorMessageId,
          attempts: task.attempts,
        });
        await prisma.chatMessage.update({
          where: { id: task.placeholderMessageId },
          data: { content: 'Bot request failed. Please try again.', messageType: "bot_event", excludeFromBotMemory: true },
        });
        emitToDorm(task.dormId, 'chat:stream:commit', {
          streamId: task.streamId,
          message: {
            id: task.placeholderMessageId,
            displayOrder: task.streamOrder,
            userId: task.botId,
            userName: task.botName,
            content: 'Bot request failed. Please try again.',
            createdAt: new Date().toISOString(),
            isPrivateForBot: false,
          },
        });
      }
      finally {
        runningStreamAbortMap.delete(task.streamId);
      }
    }
  } finally {
    state.running = false;
  }
  if (state.items.length > 0) {
    void runDormQueue(dormId);
  }
}

export async function enqueueDormBotTaskIfMentioned(input: {
  dormId: number;
  session: SessionUser;
  content: string;
  anchorMessageId: number;
  contextMessageIds?: number[];
  source?: 'chat';
}): Promise<DormBotTask | null> {
  const bot = await ensureDormBotUser(input.dormId);
  const mentionToken = `@${bot.name}`;
  if (!input.content.includes(mentionToken)) return null;

  const placeholder = await prisma.chatMessage.create({
    data: {
      dormId: input.dormId,
      userId: bot.id,
      content: '',
      messageType: "bot_stream",
      excludeFromBotMemory: false,
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  const streamId = placeholder.id;
  const streamOrder = placeholder.id;
  emitToDorm(input.dormId, 'chat:stream:start', {
    streamId,
    message: {
      id: streamId,
      displayOrder: streamOrder,
      userId: bot.id,
      userName: bot.name,
      content: '',
      createdAt: placeholder.createdAt.toISOString(),
      isStreaming: true,
      isPrivateForBot: false,
      abortableByUserId: input.session.userId,
      reasoningCount: 0,
      streamPhase: 'requesting',
    },
  });

  const task: DormBotTask = {
    id: taskIdOf(input.dormId, input.anchorMessageId),
    dormId: input.dormId,
    createdAt: Date.now(),
    anchorMessageId: input.anchorMessageId,
    streamId,
    streamOrder,
    botId: bot.id,
    botName: bot.name,
    placeholderMessageId: placeholder.id,
    content: input.content,
    contextMessageIds: input.contextMessageIds,
    session: input.session,
    meta: {
      source: input.source || 'chat',
      actorUserId: input.session.userId,
    },
    attempts: 0,
    maxAttempts: 1,
  };

  const state = queueStateOf(input.dormId);
  state.items.push(task);
  void runDormQueue(input.dormId);
  return task;
}

export async function abortDormBotStream(input: {
  session: SessionUser;
  streamId: number;
}): Promise<{ aborted: boolean }> {
  const { session, streamId } = input;
  if (!Number.isInteger(streamId) || streamId <= 0) {
    throw new ApiError(400, 'Cannot stop this message', { code: 'chat.stream.stop_invalid_target' });
  }

  const running = runningStreamAbortMap.get(streamId);
  if (running && running.dormId === session.dormId) {
    if (running.actorUserId !== session.userId) {
      throw new ApiError(403, 'Only stream owner can abort', { code: 'chat.stream.abort_owner_required' });
    }
    emitToDorm(session.dormId, 'chat:stream:stop-requested', { streamId });
    running.abort();
    return { aborted: true };
  }

  const queueState = queueStateOf(session.dormId);
  const pendingIndex = queueState.items.findIndex((item) => item.streamId === streamId);
  if (pendingIndex >= 0) {
    const pending = queueState.items[pendingIndex];
    if (pending.meta.actorUserId !== session.userId) {
      throw new ApiError(403, 'Only stream owner can abort', { code: 'chat.stream.abort_owner_required' });
    }
    queueState.items.splice(pendingIndex, 1);
    const aborted = await prisma.chatMessage.update({
      where: { id: pending.placeholderMessageId },
      data: { content: encodeMessageToken(NoticeMessageKey.BotReplyStoppedBeforeStart), messageType: "bot_event", excludeFromBotMemory: true },
      select: { id: true, createdAt: true },
    });
    emitToDorm(session.dormId, 'chat:stream:commit', {
      streamId,
      message: {
        id: aborted.id,
        displayOrder: aborted.id,
        userId: pending.botId,
        userName: pending.botName,
        content: encodeMessageToken(NoticeMessageKey.BotReplyStoppedBeforeStart),
        createdAt: aborted.createdAt.toISOString(),
        isPrivateForBot: false,
      },
    });
    return { aborted: true };
  }

  throw new ApiError(404, 'Reply already finished', { code: 'chat.stream.reply_finished' });
}
