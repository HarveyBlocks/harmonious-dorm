import path from 'node:path';

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import { LIMITS } from '@/lib/limits';
import type { SessionUser } from '@/lib/types';

import { ensureSessionUser, normalizeName } from './helpers';
import {
  BOT_MEMORY_WINDOW_DEFAULT,
  BOT_MEMORY_WINDOW_KEY,
  BOT_OTHER_CONTENT_KEY,
  BOT_MEMORY_WINDOW_MIN,
  BOT_MEMORY_WINDOW_MAX,
  normalizeBotMemoryWindow,
  normalizeToolPermission,
  replaceDormBotSettingsSafe,
} from './bot-settings-service';
import { saveImageToPublic } from './media-service';
import { pushDormNotification } from './notification-service';
import { emitToDorm } from '@/lib/socket-server';
import { setDormToolPermissions } from '@/lib/tools';

export const BOT_EMAIL_DOMAIN = process.env.BOT_EMAIL_DOMAIN || 'harmonious.bot';

export function isBotEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${BOT_EMAIL_DOMAIN}`);
}

function botEmailForDorm(dormId: number): string {
  return `dorm-bot-${dormId}@${BOT_EMAIL_DOMAIN}`;
}

export async function ensureDormBotUser(dormId: number) {
  const email = botEmailForDorm(dormId);
  const existed = await prisma.user.findUnique({ where: { email } });
  if (existed) return existed;
  return prisma.user.create({
    data: {
      email,
      name: '宿舍机器人',
      dormId,
      isLeader: false,
      language: 'zh-CN',
      avatarPath: null,
    },
  });
}

export async function updateDormBotName(session: SessionUser, name: string): Promise<{ name: string; avatarPath: string | null }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, 'Leader permission required', { code: 'bot.settings.leader_required' });
  }
  const nextName = normalizeName(name);
  if (nextName.length > LIMITS.BOT_NAME) {
    throw new ApiError(400, 'Bot name too long', { code: 'bot.name.too_long', report: { max: LIMITS.BOT_NAME } });
  }
  const bot = await ensureDormBotUser(session.dormId);
  const updated = await prisma.user.update({
    where: { id: bot.id },
    data: { name: nextName },
    select: { name: true, avatarPath: true },
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
    type: 'settings',
    title: encodeMessageToken(NoticeMessageKey.BotNameUpdated),
    content: encodeMessageToken(NoticeMessageKey.BotNameChanged, { name: updated.name }),
    targetPath: '/settings',
    groupKey: 'bot-name',
    recipientUserIds: recipients.map((item) => item.id),
  });
  emitToDorm(session.dormId, 'settings:changed', { scope: 'bot-name' });

  return updated;
}

export async function updateDormBotAvatar(session: SessionUser, file: File): Promise<{ avatarPath: string }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, 'Leader permission required', { code: 'bot.settings.leader_required' });
  }
  const bot = await ensureDormBotUser(session.dormId);
  const relativePath = await saveImageToPublic({
    file,
    prefix: `bot-${bot.id}`,
    relativeDir: path.join('uploads', 'bots'),
  });
  await prisma.user.update({
    where: { id: bot.id },
    data: { avatarPath: relativePath },
  });
  emitToDorm(session.dormId, 'settings:changed', { scope: 'bot-avatar' });
  return { avatarPath: relativePath };
}

export async function updateDormBotSettings(
  session: SessionUser,
  settings: Array<{ key: string; value: string }>,
  otherContent?: string,
  memoryWindow?: number,
  toolPermissions?: Record<string, 'allow' | 'deny'>,
): Promise<{ settings: Array<{ key: string; value: string }>; otherContent: string; memoryWindow: number; toolPermissions: Array<{ tool: string; permission: 'allow' | 'deny' }> }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, 'Leader permission required', { code: 'bot.settings.leader_required' });
  }
  const normalizedOtherContent = (otherContent || '').trim();
  if (normalizedOtherContent.length > LIMITS.BOT_OTHER_CONTENT) {
    throw new ApiError(400, 'Bot other content too long', { code: 'bot.other_content.too_long', report: { max: LIMITS.BOT_OTHER_CONTENT } });
  }
  const rawMemoryWindow = memoryWindow ?? BOT_MEMORY_WINDOW_DEFAULT;
  const normalizedMemoryWindow = normalizeBotMemoryWindow(rawMemoryWindow);
  if (!Number.isInteger(Number(rawMemoryWindow)) || Number(rawMemoryWindow) < BOT_MEMORY_WINDOW_MIN || Number(rawMemoryWindow) > BOT_MEMORY_WINDOW_MAX) {
    throw new ApiError(400, 'Bot memory window out of range', {
      code: 'bot.memory_window.range',
      report: { min: BOT_MEMORY_WINDOW_MIN, max: BOT_MEMORY_WINDOW_MAX },
    });
  }

  const normalized = settings
    .map((item) => ({
      key: normalizeName(item.key || ''),
      value: (item.value || '').trim(),
    }))
    .filter((item) => item.key.length > 0);

  if (normalized.length > LIMITS.BOT_SETTINGS_ITEMS) {
    throw new ApiError(400, 'Bot settings too many items', { code: 'bot.settings.items.too_many', report: { max: LIMITS.BOT_SETTINGS_ITEMS } });
  }

  for (const item of normalized) {
    if (item.key.length > LIMITS.BOT_SETTING_KEY) {
      throw new ApiError(400, 'Bot setting key too long', { code: 'bot.settings.key.too_long', report: { max: LIMITS.BOT_SETTING_KEY } });
    }
    if (item.value.length > LIMITS.BOT_SETTING_VALUE) {
      throw new ApiError(400, 'Bot setting value too long', { code: 'bot.settings.value.too_long', report: { max: LIMITS.BOT_SETTING_VALUE } });
    }
  }

  const uniqueKeys = new Set<string>();
  const finalSettings: Array<{ key: string; value: string }> = [];
  for (const item of normalized) {
    if (uniqueKeys.has(item.key)) continue;
    uniqueKeys.add(item.key);
    finalSettings.push(item);
  }

  const normalizedToolPermissions = Object.entries(toolPermissions || {})
    .filter(([tool]) => Boolean(tool && tool.trim()))
    .map(([tool, permission]) => ({ tool: tool.trim(), permission: normalizeToolPermission(permission) }));

  const toSave = [...finalSettings];
  toSave.push({ key: BOT_MEMORY_WINDOW_KEY, value: String(normalizedMemoryWindow) });
  if (normalizedOtherContent.length > 0) {
    toSave.push({ key: BOT_OTHER_CONTENT_KEY, value: normalizedOtherContent });
  }

  await replaceDormBotSettingsSafe(session.dormId, toSave);
  const persistedToolPermissions = await setDormToolPermissions(session.dormId, Object.fromEntries(normalizedToolPermissions.map((item) => [item.tool, item.permission] as const)));
  emitToDorm(session.dormId, 'settings:changed', { scope: 'bot-settings' });

  return {
    settings: finalSettings,
    otherContent: normalizedOtherContent,
    memoryWindow: normalizedMemoryWindow,
    toolPermissions: persistedToolPermissions,
  };
}

export async function updateDormBotToolPermissionsBatch(
  session: SessionUser,
  toolPermissions: Record<string, 'allow' | 'deny'>,
): Promise<{ toolPermissions: Array<{ tool: string; permission: 'allow' | 'deny' }> }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, 'Leader permission required', { code: 'bot.settings.leader_required' });
  }

  const normalizedToolPermissions = Object.entries(toolPermissions || {})
    .filter(([tool]) => Boolean(tool && tool.trim()))
    .map(([tool, permission]) => ({ tool: tool.trim(), permission: normalizeToolPermission(permission) }));

  const persistedToolPermissions = await setDormToolPermissions(
    session.dormId,
    Object.fromEntries(normalizedToolPermissions.map((item) => [item.tool, item.permission] as const)),
  );

  emitToDorm(session.dormId, 'settings:changed', { scope: 'bot-tools' });
  return { toolPermissions: persistedToolPermissions };
}
