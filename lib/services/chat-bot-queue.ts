import type { SessionUser } from '@/lib/types';
import { emitToDorm } from '@/lib/socket-server';
import { prisma } from '@/lib/db';
import { UpstreamServiceError } from '@/lib/errors';
import { logError, logWarn } from '@/lib/logger';

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(12000, 1000 * 2 ** Math.max(0, attempt - 1));
}

async function runDormQueue(dormId: number): Promise<void> {
  const state = queueStateOf(dormId);
  if (state.running) return;
  state.running = true;
  try {
    while (true) {
      const task = state.items.shift();
      if (!task) break;
      try {
        await replyByDormBotIfMentioned(task.session, task.content, task.anchorMessageId, {
          force: true,
          emitStart: false,
          streamId: task.streamId,
          streamOrder: task.streamOrder,
          botIdentity: { id: task.botId, name: task.botName },
          explicitContextMessageIds: task.contextMessageIds,
        });
      } catch (error) {
        const isRetryable = error instanceof UpstreamServiceError && error.retryable;
        if (isRetryable && task.attempts < task.maxAttempts) {
          task.attempts += 1;
          const delayMs = backoffMs(task.attempts);
          logWarn('dorm_bot_task_retry', {
            dormId: task.dormId,
            taskId: task.id,
            attempt: task.attempts,
            maxAttempts: task.maxAttempts,
            delayMs,
            reason: error.message,
            upstreamStatus: error.upstreamStatus,
            upstreamCode: error.upstreamCode,
            report: error.report,
          });
          await sleep(delayMs);
          state.items.unshift(task);
          continue;
        }

        logError('dorm_bot_task_failed', error, {
          dormId: task.dormId,
          taskId: task.id,
          anchorMessageId: task.anchorMessageId,
          attempts: task.attempts,
        });
        await prisma.chatMessage.update({
          where: { id: task.placeholderMessageId },
          data: { content: 'Bot request failed. Please try again.' },
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
          },
        });
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
    maxAttempts: 3,
  };

  const state = queueStateOf(input.dormId);
  state.items.push(task);
  void runDormQueue(input.dormId);
  return task;
}
