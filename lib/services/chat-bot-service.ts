import { prisma } from '@/lib/db';
import { BOT_RUNTIME_CONFIG } from '@/lib/config/bot-runtime';
import { StreamAbortError, UpstreamServiceError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import type { SessionUser } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';
import { getDormToolPermissionMap, listAllowedTools } from '@/lib/tools';
import { ensureDormBotUser, isBotEmail } from './bot-service';
import { buildDormBotPrompt } from './chat-bot-prompt';
import { fetchRecentMessagesForBotMemory } from './chat-bot-memory';
import {
  BOT_MEMORY_WINDOW_DEFAULT,
  BOT_MEMORY_WINDOW_KEY,
  BOT_OTHER_CONTENT_KEY,
  listDormBotSettingsSafe,
  normalizeBotMemoryWindow,
} from './bot-settings-service';
import { runBotReplyWithToolCall } from './chat-bot-tool-call';
import { pushDormNotification } from './notification-service';
import { listDormUserDescriptions } from './user-description-service';

type BotIdentity = { id: number; name: string };
type RecentMessage = { userId: number; userName: string; content: string };
type DormMember = { id: number; name: string; email: string; isLeader: boolean; status: { state: string } | null };

type ReplyOptions = {
  force?: boolean;
  emitStart?: boolean;
  streamId?: number;
  streamOrder?: number;
  botIdentity?: BotIdentity;
  explicitContextMessageIds?: number[];
  abortSignal?: AbortSignal;
};

const PERSIST_INTERVAL_MS = BOT_RUNTIME_CONFIG.streamPersistIntervalMs;
const PERSIST_MIN_GROWTH = BOT_RUNTIME_CONFIG.streamPersistMinGrowth;

function shouldReplyToMention(content: string, botName: string, force?: boolean) {
  if (force) return true;
  return content.includes(`@${botName}`);
}

async function loadDormMembers(dormId: number) {
  const dorm = await prisma.dorm.findFirst({
    where: { id: dormId },
    include: {
      users: {
        orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
        select: { id: true, name: true, email: true, isLeader: true, status: { select: { state: true } } },
      },
    },
  });
  if (!dorm) return null;
  return { dormName: dorm.name, users: dorm.users as DormMember[] };
}

async function loadBotConfig(dormId: number) {
  const allSettings = await listDormBotSettingsSafe(dormId);
  let botOtherContent = '';
  let botMemoryWindow = BOT_MEMORY_WINDOW_DEFAULT;
  const botSettings = allSettings.filter((item) => {
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
  const toolPermissions = await getDormToolPermissionMap(dormId);
  return { botOtherContent, botMemoryWindow, botSettings, toolPermissions };
}

function normalizeExplicitContextIds(explicitIds: number[] | undefined, max: number) {
  if (!Array.isArray(explicitIds)) return [];
  const unique = [...new Set(explicitIds.filter((id) => Number.isInteger(id) && id > 0))];
  return unique.slice(0, max);
}

async function loadRecentMessages(input: {
  dormId: number;
  anchorMessageId?: number;
  botMemoryWindow: number;
  explicitContextMessageIds: number[];
}): Promise<RecentMessage[]> {
  if (input.explicitContextMessageIds.length > 0) {
    const rows = await prisma.chatMessage.findMany({
      where: {
        dormId: input.dormId,
        isPrivateForBot: false,
        excludeFromBotMemory: false,
        id: {
          in: input.explicitContextMessageIds,
          lt: Number.isFinite(input.anchorMessageId) ? Number(input.anchorMessageId) : Number.MAX_SAFE_INTEGER,
        },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { id: 'asc' },
    });
    return rows.map((item) => ({ userId: item.user.id, userName: item.user.name, content: item.content }));
  }

  return fetchRecentMessagesForBotMemory({
    dormId: input.dormId,
    anchorMessageId: input.anchorMessageId,
    botMemoryWindow: input.botMemoryWindow,
  });
}

async function ensureStreamMessage(dormId: number, botId: number, streamId?: number, streamOrder?: number) {
  if (streamId && streamId > 0) {
    return { streamId, streamOrder: streamOrder ?? streamId, streamCreatedAt: new Date() };
  }

  const placeholder = await prisma.chatMessage.create({
    data: { dormId, userId: botId, content: '' },
    select: { id: true, createdAt: true },
  });

  return { streamId: placeholder.id, streamOrder: placeholder.id, streamCreatedAt: placeholder.createdAt };
}

function emitStreamStart(dormId: number, streamId: number, streamOrder: number, streamCreatedAt: Date, bot: BotIdentity, userId: number, emitStart?: boolean) {
  if (emitStart === false) return;
  emitToDorm(dormId, 'chat:stream:start', {
    streamId,
    message: {
      id: streamId,
      displayOrder: streamOrder,
      userId: bot.id,
      userName: bot.name,
      content: '',
      createdAt: streamCreatedAt.toISOString(),
      isStreaming: true,
      isPrivateForBot: false,
      abortableByUserId: userId,
      reasoningCount: 0,
      streamPhase: 'requesting',
    },
  });
}

async function streamAndPersistReply(input: {
  dormId: number;
  streamId: number;
  prompt: { systemPrompt: string; userPrompt: string };
  toolPermissions?: Record<string, 'allow' | 'deny'>;
  callerUserId: number;
  callerIsLeader: boolean;
  abortSignal?: AbortSignal;
}) {
  let streamedContent = '';
  let reasoningCount = 0;
  let lastPersistedLength = 0;
  let lastPersistAt = 0;
  let persistChain: Promise<void> = Promise.resolve();
  const queuePersist = () => {
    const queued = queueStreamPersistence(persistChain, input.streamId, streamedContent);
    persistChain = queued.chain;
    lastPersistAt = queued.persistedAt;
    lastPersistedLength = queued.persistedLength;
  };
  let botReply = '';
  let abortedByUser = false;
  try {
    botReply = await runBotReplyWithToolCall({
      systemPrompt: input.prompt.systemPrompt,
      userPrompt: input.prompt.userPrompt,
      toolPermissions: input.toolPermissions || {},
      caller: { callerUserId: input.callerUserId, callerIsLeader: input.callerIsLeader, dormId: input.dormId },
      abortSignal: input.abortSignal,
      onDelta: (delta) => {
        streamedContent += delta;
        emitToDorm(input.dormId, 'chat:stream:chunk', { streamId: input.streamId, delta });
        if (Date.now() - lastPersistAt >= PERSIST_INTERVAL_MS || streamedContent.length - lastPersistedLength >= PERSIST_MIN_GROWTH) {
          queuePersist();
        }
      },
      onPhase: (phase) => {
        emitToDorm(input.dormId, 'chat:stream:phase', { streamId: input.streamId, phase });
      },
      onProgressDelta: (step) => {
        const safeStep = Number.isFinite(step) ? Math.max(1, Math.floor(step)) : 1;
        reasoningCount += safeStep;
        emitToDorm(input.dormId, 'chat:stream:reasoning', { streamId: input.streamId, reasoningCount });
      },
    });
  } catch (error) {
    if (error instanceof StreamAbortError) {
      abortedByUser = true;
    } else if (error instanceof UpstreamServiceError && streamedContent.trim().length > 0) {
      // Keep partial streamed content instead of overriding it with a hard failure message.
      botReply = streamedContent;
    } else {
      throw error;
    }
  }
  await persistChain;
  if (abortedByUser) {
    return streamedContent.trim() || encodeMessageToken(NoticeMessageKey.BotReplyStoppedBeforeStart);
  }
  return botReply.trim() || 'Bot returned empty response.';
}

function queueStreamPersistence(chain: Promise<void>, streamId: number, content: string) {
  const nextChain = chain
    .then(async () => {
      await prisma.chatMessage.update({ where: { id: streamId }, data: { content } });
    })
    .catch(() => {});
  return {
    chain: nextChain,
    persistedAt: Date.now(),
    persistedLength: content.length,
  };
}

async function finalizeAndNotify(dormId: number, streamId: number, botName: string) {
  const botMessage = await prisma.chatMessage.findUniqueOrThrow({
    where: { id: streamId },
    include: { user: { select: { id: true, name: true } } },
  });

  emitToDorm(dormId, 'chat:stream:commit', {
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
    where: { dormId, NOT: { email: { endsWith: '@harmonious.bot' } } },
    select: { id: true },
  });

  await pushDormNotification({
    dormId,
    type: 'chat',
    title: encodeMessageToken(NoticeMessageKey.ChatFrom, { userName: botName }),
    content: encodeMessageToken(NoticeMessageKey.BotRepliedDormInfo),
    targetPath: '/chat',
    groupKey: 'chat',
    recipientUserIds: recipients.map((item) => item.id),
  });
}

export async function replyByDormBotIfMentioned(session: SessionUser, content: string, anchorMessageId?: number, options?: ReplyOptions): Promise<void> {
  const bot = options?.botIdentity || await ensureDormBotUser(session.dormId);
  if (!shouldReplyToMention(content, bot.name, options?.force)) return;

  const dorm = await loadDormMembers(session.dormId);
  if (!dorm) return;

  const descriptionMap = await listDormUserDescriptions(session.dormId);
  const { botOtherContent, botMemoryWindow, botSettings, toolPermissions } = await loadBotConfig(session.dormId);
  const explicitContextMessageIds = normalizeExplicitContextIds(options?.explicitContextMessageIds, botMemoryWindow);
  const recentMessages = await loadRecentMessages({ dormId: session.dormId, anchorMessageId, botMemoryWindow, explicitContextMessageIds });

  const sender = dorm.users.find((item) => item.id === session.userId);
  const memberRows = dorm.users.filter((item) => !isBotEmail(item.email)).map((item) => ({ id: item.id, name: item.name, isLeader: item.isLeader, state: item.status?.state || 'out' }));
  const allowedTools = listAllowedTools(toolPermissions);
  const prompt = buildDormBotPrompt({
    botName: bot.name,
    dormName: dorm.dormName,
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
    availableTools: allowedTools,
  });

  const stream = await ensureStreamMessage(session.dormId, bot.id, options?.streamId, options?.streamOrder);
  emitStreamStart(session.dormId, stream.streamId, stream.streamOrder, stream.streamCreatedAt, bot, session.userId, options?.emitStart);

  const finalContent = await streamAndPersistReply({
    dormId: session.dormId,
    streamId: stream.streamId,
    prompt,
    toolPermissions,
    callerUserId: session.userId,
    callerIsLeader: session.isLeader,
    abortSignal: options?.abortSignal,
  });

  await prisma.chatMessage.update({ where: { id: stream.streamId }, data: { content: finalContent, messageType: "bot_reply", excludeFromBotMemory: false } });
  await finalizeAndNotify(session.dormId, stream.streamId, bot.name);
}





