import path from 'node:path';

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { LIMITS } from '@/lib/limits';
import type { SessionUser } from '@/lib/types';

import { ensureSessionUser, normalizeName } from './helpers';
import { BOT_OTHER_CONTENT_KEY, replaceDormBotSettingsSafe } from './bot-settings-service';
import { saveImageToPublic } from './media-service';
import { pushDormNotification } from './notification-service';

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
    throw new ApiError(403, '只有舍长可以设置机器人');
  }
  const nextName = normalizeName(name);
  if (nextName.length > LIMITS.BOT_NAME) {
    throw new ApiError(400, `机器人名称不能超过 ${LIMITS.BOT_NAME} 字`);
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
    title: '宿舍机器人名称已更新',
    content: `机器人名称已改为 ${updated.name}`,
    targetPath: '/settings',
    groupKey: 'bot-name',
    recipientUserIds: recipients.map((item) => item.id),
  });

  return updated;
}

export async function updateDormBotAvatar(session: SessionUser, file: File): Promise<{ avatarPath: string }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, '只有舍长可以设置机器人');
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
  return { avatarPath: relativePath };
}

export async function updateDormBotSettings(
  session: SessionUser,
  settings: Array<{ key: string; value: string }>,
  otherContent?: string,
): Promise<{ settings: Array<{ key: string; value: string }>; otherContent: string }> {
  const me = await ensureSessionUser(session);
  if (!me.isLeader) {
    throw new ApiError(403, '只有舍长可以设置机器人');
  }
  const normalizedOtherContent = (otherContent || '').trim();
  if (normalizedOtherContent.length > LIMITS.BOT_OTHER_CONTENT) {
    throw new ApiError(400, `机器人其他内容不能超过 ${LIMITS.BOT_OTHER_CONTENT} 字`);
  }

  const normalized = settings
    .map((item) => ({
      key: normalizeName(item.key || ''),
      value: (item.value || '').trim(),
    }))
    .filter((item) => item.key.length > 0);

  if (normalized.length > LIMITS.BOT_SETTINGS_ITEMS) {
    throw new ApiError(400, `机器人设定不能超过 ${LIMITS.BOT_SETTINGS_ITEMS} 条`);
  }

  for (const item of normalized) {
    if (item.key.length > LIMITS.BOT_SETTING_KEY) {
      throw new ApiError(400, `机器人设定键不能超过 ${LIMITS.BOT_SETTING_KEY} 字`);
    }
    if (item.value.length > LIMITS.BOT_SETTING_VALUE) {
      throw new ApiError(400, `机器人设定值不能超过 ${LIMITS.BOT_SETTING_VALUE} 字`);
    }
  }

  const dedup = new Set<string>();
  const finalSettings: Array<{ key: string; value: string }> = [];
  for (const item of normalized) {
    if (dedup.has(item.key)) continue;
    dedup.add(item.key);
    finalSettings.push(item);
  }

  const toSave = [...finalSettings];
  if (normalizedOtherContent.length > 0) {
    toSave.push({ key: BOT_OTHER_CONTENT_KEY, value: normalizedOtherContent });
  }

  await replaceDormBotSettingsSafe(session.dormId, toSave);

  return { settings: finalSettings, otherContent: normalizedOtherContent };
}
