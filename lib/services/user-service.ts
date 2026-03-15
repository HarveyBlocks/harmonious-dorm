import path from 'node:path';

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { LIMITS } from '@/lib/limits';
import type { MePayload, SessionUser } from '@/lib/types';

import { ensureDormBotUser, isBotEmail } from './bot-service';
import { BOT_OTHER_CONTENT_KEY, listDormBotSettingsSafe } from './bot-settings-service';
import { ensureSessionUser, normalizeName } from './helpers';
import { saveImageToPublic } from './media-service';
import { pushDormNotification } from './notification-service';
import { listDormUserDescriptions, upsertUserDescriptions } from './user-description-service';

export async function getMe(session: SessionUser): Promise<MePayload> {
  await ensureSessionUser(session);

  const me = await prisma.user.findFirst({
    where: {
      id: session.userId,
      dormId: session.dormId,
    },
    include: {
      dorm: {
        include: {
          users: {
            orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  });

  if (!me) {
    throw new ApiError(404, '用户不存在');
  }
  const bot = await ensureDormBotUser(me.dormId);
  const rawBotSettings = await listDormBotSettingsSafe(me.dormId);
  const members = me.dorm.users.filter((user) => !isBotEmail(user.email));
  const descriptionMap = await listDormUserDescriptions(me.dormId);

  let botOtherContent = '';
  const botSettings = rawBotSettings.filter((item) => {
    if (item.key === BOT_OTHER_CONTENT_KEY) {
      botOtherContent = item.value || '';
      return false;
    }
    return true;
  });

  return {
    id: me.id,
    email: me.email,
    name: me.name,
    avatarPath: me.avatarPath,
    botId: bot.id,
    botName: bot.name,
    botAvatarPath: bot.avatarPath,
    botSettings,
    botOtherContent,
    language: (me.language as 'zh-CN' | 'zh-TW' | 'fr' | 'en') || 'zh-CN',
    dormId: me.dormId,
    dormName: me.dorm.name,
    isLeader: me.isLeader,
    inviteCode: me.dorm.inviteCode,
    members: members.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarPath: user.avatarPath,
      isLeader: user.isLeader,
      description: descriptionMap.get(user.id) || '',
    })),
  };
}

export async function updateMyName(
  session: SessionUser,
  payload: { name?: string; language?: 'zh-CN' | 'zh-TW' | 'fr' | 'en' },
): Promise<MePayload> {
  const me = await ensureSessionUser(session);
  const name = payload.name ? normalizeName(payload.name) : undefined;
  const language = payload.language;

  if (!name && !language) {
    throw new ApiError(400, '缺少可更新字段');
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(name ? { name } : {}),
      ...(language ? { language } : {}),
    },
  });

  return getMe(session);
}

export async function updateMemberDescriptions(
  session: SessionUser,
  items: Array<{ userId: number; description: string }>,
): Promise<{ success: true }> {
  const me = await ensureSessionUser(session);
  const dedup = new Map<number, string>();
  for (const item of items || []) {
    const userId = Number(item.userId);
    if (!Number.isInteger(userId) || userId <= 0) continue;
    const normalizedDescription = (item.description || '').trim();
    if (normalizedDescription.length > LIMITS.MEMBER_DESCRIPTION) {
      throw new ApiError(400, `成员描述不能超过 ${LIMITS.MEMBER_DESCRIPTION} 字`);
    }
    dedup.set(userId, normalizedDescription);
  }

  if (dedup.size === 0) {
    return { success: true };
  }

  const targets = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
      id: { in: [...dedup.keys()] },
      NOT: { email: { endsWith: '@harmonious.bot' } },
    },
    select: { id: true },
  });
  const allowedIds = new Set(targets.map((item) => item.id));
  const validItems = [...dedup.entries()]
    .filter(([userId]) => allowedIds.has(userId))
    .map(([userId, description]) => ({ userId, description }));

  if (validItems.length === 0) {
    return { success: true };
  }

  if (!me.isLeader && validItems.some((item) => item.userId !== me.id)) {
    throw new ApiError(403, '仅舍长可以修改其他成员描述');
  }

  await upsertUserDescriptions(validItems);

  if (me.isLeader) {
    const leaderTargets = validItems.filter((item) => item.userId !== me.id);
    for (const item of leaderTargets) {
      await pushDormNotification({
        dormId: session.dormId,
        type: 'settings',
        title: '个人描述已更新',
        content: item.description || '你的个人描述已被舍长更新',
        targetPath: '/settings',
        groupKey: `profile-desc-${item.userId}`,
        recipientUserIds: [item.userId],
      });
    }
  }

  return { success: true };
}

export async function updateMyAvatar(
  session: SessionUser,
  file: File,
): Promise<{ avatarPath: string }> {
  const me = await ensureSessionUser(session);
  const relativePath = await saveImageToPublic({
    file,
    prefix: `${me.id}`,
    relativeDir: path.join('uploads', 'avatars'),
  });

  await prisma.user.update({
    where: { id: me.id },
    data: { avatarPath: relativePath },
  });

  return { avatarPath: relativePath };
}

export async function deleteMyAccount(session: SessionUser): Promise<{ success: true }> {
  const me = await ensureSessionUser(session);

  await prisma.$transaction(async (tx) => {
    const remainingUsers = await tx.user.findMany({
      where: {
        dormId: me.dormId,
        id: { not: me.id },
        NOT: { email: { endsWith: '@harmonious.bot' } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    if (me.isLeader && remainingUsers.length > 0) {
      await tx.user.updateMany({
        where: { dormId: me.dormId },
        data: { isLeader: false },
      });
      await tx.user.update({
        where: { id: remainingUsers[0].id },
        data: { isLeader: true },
      });
    }

    await tx.user.delete({
      where: { id: me.id },
    });

    const count = await tx.user.count({
      where: {
        dormId: me.dormId,
        NOT: { email: { endsWith: '@harmonious.bot' } },
      },
    });
    if (count === 0) {
      await tx.dorm.delete({ where: { id: me.dormId } });
    }
  });

  return { success: true };
}
