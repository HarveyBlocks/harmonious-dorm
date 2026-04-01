import { AI_CHAT_CONFIG } from '@/lib/config/ai';
import { prisma } from '@/lib/db';
import { ApiError, UpstreamServiceError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import { logError } from '@/lib/logger';
import type { SessionUser } from '@/lib/types';

import { ensureDormBotUser, isBotEmail } from './bot-service';
import { BOT_OTHER_CONTENT_KEY, listDormBotSettingsSafe } from './bot-settings-service';
import { buildDormChatSummaryPrompt } from './chat-summary-prompt';
import { requestGlmMessages } from './glm-service';
import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';
import { listDormUserDescriptions } from './user-description-service';

const SUMMARY_MESSAGE_COUNT_MIN = 0;
const SUMMARY_MESSAGE_COUNT_MAX = 100;
const SUMMARY_MESSAGE_COUNT_STEP = 10;
const runningSummaryJobs = new Set<string>();
type SummaryFailReason = 'network' | 'timeout' | 'rate_limit' | 'quota' | 'llm_rejected' | 'llm_interrupted' | 'unknown';

function summaryJobKey(session: SessionUser): string {
  return `${session.dormId}:${session.userId}`;
}

function runInBackground(task: () => Promise<void>, errorMessage: string, meta?: Record<string, unknown>) {
  setTimeout(() => {
    void task().catch((error) => {
      logError(errorMessage, error, meta);
    });
  }, 0);
}

function normalizeSummaryMessageCount(value: number): number {
  if (!Number.isFinite(value)) {
    throw new ApiError(400, 'Invalid summary message count', { code: 'summary.message_count.invalid' });
  }
  const normalized = Math.floor(value);
  if (normalized < SUMMARY_MESSAGE_COUNT_MIN || normalized > SUMMARY_MESSAGE_COUNT_MAX) {
    throw new ApiError(400, 'Summary message count out of range', {
      code: 'summary.message_count.range',
      report: { min: SUMMARY_MESSAGE_COUNT_MIN, max: SUMMARY_MESSAGE_COUNT_MAX },
    });
  }
  if (normalized % SUMMARY_MESSAGE_COUNT_STEP !== 0) {
    throw new ApiError(400, 'Summary message count step invalid', {
      code: 'summary.message_count.step',
      report: { step: SUMMARY_MESSAGE_COUNT_STEP },
    });
  }
  return normalized;
}

function sanitizeDetail(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 220);
}

function resolveSummaryFailReason(error: unknown): { reason: SummaryFailReason; detail: string } {
  if (error instanceof UpstreamServiceError) {
    const upstreamMessage = sanitizeDetail(String(error.report?.upstreamMessage || ''));
    const lowerMessage = upstreamMessage.toLowerCase();
    const hasRateLimitCode = error.upstreamStatus === 429 || String(error.upstreamCode || '').trim() === '1302' || error.message === 'AI service rate limited';
    if (hasRateLimitCode) {
      return {
        reason: 'rate_limit',
        detail: sanitizeDetail(`status=${error.upstreamStatus || '-'} code=${error.upstreamCode || '-'} ${upstreamMessage}`),
      };
    }
    const quotaMatched = /(quota|insufficient|余额|額度|额度|credit|billing|exceeded)/i.test(lowerMessage);
    if (quotaMatched) {
      return {
        reason: 'quota',
        detail: sanitizeDetail(`status=${error.upstreamStatus || '-'} code=${error.upstreamCode || '-'} ${upstreamMessage}`),
      };
    }
    if (error.message === 'AI service timeout' || error.status === 504) {
      return { reason: 'timeout', detail: sanitizeDetail(upstreamMessage || 'timeout') };
    }
    const interruptedMatched = /(cancel|abort|interrupted|stopped|reset)/i.test(lowerMessage);
    if (interruptedMatched) {
      return {
        reason: 'llm_interrupted',
        detail: sanitizeDetail(`status=${error.upstreamStatus || '-'} code=${error.upstreamCode || '-'} ${upstreamMessage}`),
      };
    }
    if (error.upstreamStatus) {
      return {
        reason: 'llm_rejected',
        detail: sanitizeDetail(`status=${error.upstreamStatus} code=${error.upstreamCode || '-'} ${upstreamMessage}`),
      };
    }
    return { reason: 'network', detail: sanitizeDetail(upstreamMessage || error.message) };
  }
  if (error instanceof ApiError) {
    return { reason: 'unknown', detail: sanitizeDetail(error.message) };
  }
  if (error instanceof Error) {
    return { reason: 'unknown', detail: sanitizeDetail(error.message) };
  }
  return { reason: 'unknown', detail: '' };
}

async function notifySummaryFailed(session: SessionUser, error: unknown) {
  const failReason = resolveSummaryFailReason(error);
  await pushDormNotification({
    dormId: session.dormId,
    type: 'bot_summary',
    title: encodeMessageToken(NoticeMessageKey.BotChatSummaryFailed),
    content: encodeMessageToken(NoticeMessageKey.BotChatSummaryFailedContent, {
      reason: failReason.reason,
      detail: failReason.detail,
    }),
    targetPath: '/notifications',
    recipientUserIds: [session.userId],
  });
}

async function buildSummaryContent(session: SessionUser, messageCount: number): Promise<string> {
  const [bot, dorm, descriptionMap, botSettingRows] = await Promise.all([
    ensureDormBotUser(session.dormId),
    prisma.dorm.findFirst({
      where: { id: session.dormId },
      include: {
        users: {
          orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            email: true,
            isLeader: true,
            status: { select: { state: true } },
          },
        },
      },
    }),
    listDormUserDescriptions(session.dormId),
    listDormBotSettingsSafe(session.dormId),
  ]);

  if (!dorm) {
    throw new ApiError(404, 'Dorm not found', { code: 'dorm.not_found' });
  }

  let botOtherContent = '';
  const botSettings = botSettingRows.filter((item) => {
    if (item.key === BOT_OTHER_CONTENT_KEY) {
      botOtherContent = item.value || '';
      return false;
    }
    return true;
  });

  const recentRows = messageCount > 0
    ? await prisma.chatMessage.findMany({
        where: {
          dormId: session.dormId,
          isPrivateForBot: false,
          excludeFromBotMemory: false,
        },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { id: 'desc' },
        take: messageCount,
      })
    : [];
  const recentMessages = [...recentRows].reverse().map((item) => ({
    id: item.id,
    userId: item.user.id,
    userName: item.user.name,
    createdAt: item.createdAt.toISOString(),
    content: item.content,
  }));

  const summaryOutputTokenLimit = Math.max(AI_CHAT_CONFIG.maxOutputTokens * 2, AI_CHAT_CONFIG.maxOutputTokens + 600);
  const memberRows = dorm.users
    .filter((item) => !isBotEmail(item.email))
    .map((item) => ({
      id: item.id,
      name: item.name,
      isLeader: item.isLeader,
      state: item.status?.state || 'out',
      description: descriptionMap.get(item.id) || '',
    }));

  const prompt = buildDormChatSummaryPrompt({
    botName: bot.name,
    dormName: dorm.name,
    memberRows,
    settings: botSettings,
    otherContent: botOtherContent,
    recentMessages,
    requestMessageCount: messageCount,
    outputTokenLimit: summaryOutputTokenLimit,
  });

  const summaryText = (await requestGlmMessages({
    messages: [
      { role: 'system', content: prompt.systemPrompt },
      { role: 'user', content: prompt.userPrompt },
    ],
    extraBody: { max_tokens: summaryOutputTokenLimit },
  })).trim();

  if (summaryText.length > 0) {
    return summaryText;
  }
  return '暂无可用总结内容';
}

async function runSummaryJob(session: SessionUser, messageCount: number) {
  const summary = await buildSummaryContent(session, messageCount);
  await pushDormNotification({
    dormId: session.dormId,
    type: 'bot_summary',
    title: encodeMessageToken(NoticeMessageKey.BotChatSummaryReady),
    content: summary,
    targetPath: '/notifications',
    recipientUserIds: [session.userId],
  });
}

export async function requestDormChatSummary(session: SessionUser, messageCount: number): Promise<{ accepted: true; messageCount: number }> {
  await ensureSessionUser(session);
  const safeCount = normalizeSummaryMessageCount(messageCount);
  const jobKey = summaryJobKey(session);
  if (runningSummaryJobs.has(jobKey)) {
    throw new ApiError(409, 'Summary task already running', { code: 'summary.task.running' });
  }
  runningSummaryJobs.add(jobKey);

  runInBackground(
    async () => {
      try {
        await runSummaryJob(session, safeCount);
      } catch (error) {
        await notifySummaryFailed(session, error);
        throw error;
      } finally {
        runningSummaryJobs.delete(jobKey);
      }
    },
    'chat_summary_job_failed',
    { dormId: session.dormId, userId: session.userId, messageCount: safeCount },
  );

  return { accepted: true, messageCount: safeCount };
}
