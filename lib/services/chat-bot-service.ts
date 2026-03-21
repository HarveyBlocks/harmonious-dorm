import { prisma } from '@/lib/db';
import { StreamAbortError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import type { SessionUser } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';
import { ensureDormBotUser, isBotEmail } from './bot-service';
import { buildDormBotPrompt } from './chat-bot-prompt';
import {
  BOT_MEMORY_WINDOW_DEFAULT,
  BOT_MEMORY_WINDOW_KEY,
  BOT_OTHER_CONTENT_KEY,
  listDormBotSettingsSafe,
  normalizeBotMemoryWindow,
} from './bot-settings-service';
import { streamGlmReply } from './glm-service';
import { pushDormNotification } from './notification-service';
import { listDormUserDescriptions } from './user-description-service';

type BotIdentity = { id: number; name: string };
const STATUS_CHAT_TOKEN_PREFIX = `__i18n__:{"key":"${NoticeMessageKey.ChatStatusChanged}"`;
const ABORTED_BEFORE_START_TOKEN_PREFIX = `__i18n__:{"key":"${NoticeMessageKey.BotReplyStoppedBeforeStart}"`;
const RECENT_FETCH_BATCH_SIZE = 80;

async function fetchRecentMessagesForBotMemory(input: {
  dormId: number;
  anchorMessageId?: number;
  botMemoryWindow: number;
}) {
  const result: Array<{
    id: number;
    content: string;
    user: { id: number; name: string };
  }> = [];
  let cursorId = Number.isFinite(input.anchorMessageId) ? Number(input.anchorMessageId) : Number.MAX_SAFE_INTEGER;

  while (result.length < input.botMemoryWindow) {
    const rows = await prisma.chatMessage.findMany({
      where: {
        dormId: input.dormId,
        isPrivateForBot: false,
        id: { lt: cursorId },
        NOT: [
          { content: { startsWith: STATUS_CHAT_TOKEN_PREFIX } },
          { content: { startsWith: ABORTED_BEFORE_START_TOKEN_PREFIX } },
        ],
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { id: 'desc' },
      take: RECENT_FETCH_BATCH_SIZE,
    });
    if (!rows.length) break;
    result.push(...rows);
    cursorId = rows[rows.length - 1].id;
  }

  return result
    .slice(0, input.botMemoryWindow)
    .sort((a, b) => a.id - b.id)
    .map((item) => ({ userId: item.user.id, userName: item.user.name, content: item.content }));
}

export async function replyByDormBotIfMentioned(
  session: SessionUser,
  content: string,
  anchorMessageId?: number,
  options?: {
    force?: boolean;
    emitStart?: boolean;
    streamId?: number;
    streamOrder?: number;
    botIdentity?: BotIdentity;
    explicitContextMessageIds?: number[];
    abortSignal?: AbortSignal;
  },
): Promise<void> {
  const bot = options?.botIdentity || await ensureDormBotUser(session.dormId);
  const mentionToken = `@${bot.name}`;
  if (!options?.force && !content.includes(mentionToken)) return;

  const dorm = await prisma.dorm.findFirst({
    where: { id: session.dormId },
    include: {
      users: {
        orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          name: true,
          email: true,
          isLeader: true,
          status: {
            select: {
              state: true,
            },
          },
        },
      },
    },
  });
  if (!dorm) return;
  const allBotSettings = await listDormBotSettingsSafe(session.dormId);
  const descriptionMap = await listDormUserDescriptions(session.dormId);

  const memberRows = dorm.users
    .filter((item) => !isBotEmail(item.email))
    .map((item) => ({
      id: item.id,
      name: item.name,
      isLeader: item.isLeader,
      state: item.status?.state || 'out',
    }));
  let botOtherContent = '';
  let botMemoryWindow = BOT_MEMORY_WINDOW_DEFAULT;
  const botSettings = allBotSettings.filter((item) => {
    if (item.key === BOT_OTHER_CONTENT_KEY) {
      botOtherContent = item.value || '';
      return false;
    }
    if (item.key === BOT_MEMORY_WINDOW_KEY) {
      botMemoryWindow = normalizeBotMemoryWindow(item.value);
      return false;
    }
    return true;
  });
  const explicitContextMessageIds = Array.isArray(options?.explicitContextMessageIds)
    ? [...new Set(options!.explicitContextMessageIds!.filter((id) => Number.isInteger(id) && id > 0))]
    : [];
  const cappedContextMessageIds = explicitContextMessageIds.slice(0, botMemoryWindow);
  const useExplicitContext = cappedContextMessageIds.length > 0;

  const recentMessages = useExplicitContext
    ? (
      await prisma.chatMessage.findMany({
        where: {
          dormId: session.dormId,
          isPrivateForBot: false,
          NOT: [
            { content: { startsWith: STATUS_CHAT_TOKEN_PREFIX } },
            { content: { startsWith: ABORTED_BEFORE_START_TOKEN_PREFIX } },
          ],
          id: {
            in: cappedContextMessageIds,
            lt: Number.isFinite(anchorMessageId) ? Number(anchorMessageId) : Number.MAX_SAFE_INTEGER,
          },
        },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: 'asc' },
      })
    ).map((item) => ({ userId: item.user.id, userName: item.user.name, content: item.content }))
    : await fetchRecentMessagesForBotMemory({
      dormId: session.dormId,
      anchorMessageId,
      botMemoryWindow,
    });

  const sender = dorm.users.find((item) => item.id === session.userId);
  const prompt = buildDormBotPrompt({
    botName: bot.name,
    dormName: dorm.name,
    memberRows,
    descriptionMap,
    settings: botSettings,
    memoryWindow: botMemoryWindow,
    recentMessages,
    otherContent: botOtherContent,
    userContent: content,
    senderUserId: session.userId,
    senderUserName: sender?.name || 'unknown-user',
    botUserId: bot.id,
  });

  let streamId = options?.streamId;
  let streamOrder = options?.streamOrder;
  let streamCreatedAt = new Date();
  if (!streamId || streamId <= 0) {
    const placeholder = await prisma.chatMessage.create({
      data: {
        dormId: session.dormId,
        userId: bot.id,
        content: '',
      },
      select: { id: true, createdAt: true },
    });
    streamId = placeholder.id;
    streamOrder = placeholder.id;
    streamCreatedAt = placeholder.createdAt;
  }
  const finalStreamOrder = streamOrder ?? streamId;
  if (options?.emitStart !== false) {
    emitToDorm(session.dormId, 'chat:stream:start', {
      streamId,
      message: {
        id: streamId,
        displayOrder: finalStreamOrder,
        userId: bot.id,
        userName: bot.name,
        content: '',
        createdAt: streamCreatedAt.toISOString(),
        isStreaming: true,
        isPrivateForBot: false,
        abortableByUserId: session.userId,
        reasoningCount: 0,
      },
    });
  }

  let streamedContent = '';
  let reasoningCount = 0;
  let lastPersistedLength = 0;
  let lastPersistAt = 0;
  let persistChain: Promise<void> = Promise.resolve();
  const PERSIST_INTERVAL_MS = 600;
  const PERSIST_MIN_GROWTH = 120;

  const queuePersist = () => {
    const snapshot = streamedContent;
    persistChain = persistChain
      .then(async () => {
        await prisma.chatMessage.update({
          where: { id: streamId },
          data: { content: snapshot },
        });
      })
      .catch(() => {
        // Keep streaming even if an intermediate persistence attempt fails.
      });
    lastPersistAt = Date.now();
    lastPersistedLength = snapshot.length;
  };

  let botReply = '';
  let abortedByUser = false;
  try {
    botReply = await streamGlmReply({
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      abortSignal: options?.abortSignal,
      onDelta: (delta) => {
        streamedContent += delta;
        emitToDorm(session.dormId, 'chat:stream:chunk', {
          streamId,
          delta,
        });
        const shouldPersistByTime = Date.now() - lastPersistAt >= PERSIST_INTERVAL_MS;
        const shouldPersistByGrowth = streamedContent.length - lastPersistedLength >= PERSIST_MIN_GROWTH;
        if (shouldPersistByTime || shouldPersistByGrowth) {
          queuePersist();
        }
      },
      onProgressDelta: (step) => {
        const safeStep = Number.isFinite(step) ? Math.max(1, Math.floor(step)) : 1;
        reasoningCount += safeStep;
        emitToDorm(session.dormId, 'chat:stream:reasoning', {
          streamId,
          reasoningCount,
        });
      },
    });
  } catch (error) {
    if (error instanceof StreamAbortError) {
      abortedByUser = true;
    } else {
      throw error;
    }
  }
  await persistChain;

  const finalContent = abortedByUser
    ? (streamedContent.trim() || encodeMessageToken(NoticeMessageKey.BotReplyStoppedBeforeStart))
    : (botReply.trim() || 'Bot returned empty response.');
  const botMessage = await prisma.chatMessage.update({
    where: { id: streamId },
    data: { content: finalContent },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  emitToDorm(session.dormId, 'chat:stream:commit', {
    streamId,
    message: {
      id: botMessage.id,
      displayOrder: botMessage.id,
      userId: botMessage.userId,
      userName: botMessage.user.name,
      content: botMessage.content,
      createdAt: botMessage.createdAt.toISOString(),
      isPrivateForBot: false,
    },
  });

  const recipients = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
      NOT: { email: { endsWith: '@harmonious.bot' } },
    },
    select: { id: true },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'chat',
    title: encodeMessageToken(NoticeMessageKey.ChatFrom, { userName: bot.name }),
    content: encodeMessageToken(NoticeMessageKey.BotRepliedDormInfo),
    targetPath: '/chat',
    groupKey: 'chat',
    recipientUserIds: recipients.map((item) => item.id),
  });
}
