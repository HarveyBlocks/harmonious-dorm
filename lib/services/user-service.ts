import fs from 'node:fs/promises';
import path from 'node:path';

import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { MePayload, SessionUser } from '@/lib/types';

import { ensureSessionUser, normalizeName } from './helpers';

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

  return {
    id: me.id,
    email: me.email,
    name: me.name,
    avatarPath: me.avatarPath,
    language: (me.language as 'zh-CN' | 'zh-TW' | 'fr' | 'en') || 'zh-CN',
    dormId: me.dormId,
    dormName: me.dorm.name,
    isLeader: me.isLeader,
    inviteCode: me.dorm.inviteCode,
    members: me.dorm.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarPath: user.avatarPath,
      isLeader: user.isLeader,
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

export async function updateMyAvatar(
  session: SessionUser,
  file: File,
): Promise<{ avatarPath: string }> {
  const me = await ensureSessionUser(session);

  const maxSize = 5 * 1024 * 1024;
  if (file.size <= 0 || file.size > maxSize) {
    throw new ApiError(400, '头像文件大小必须在 0-5MB');
  }

  const mime = file.type.toLowerCase();
  const ext =
    mime === 'image/png'
      ? 'png'
      : mime === 'image/jpeg' || mime === 'image/jpg'
      ? 'jpg'
      : mime === 'image/webp'
      ? 'webp'
      : '';
  if (!ext) {
    throw new ApiError(400, '头像仅支持 PNG/JPG/WEBP');
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const relativeDir = path.join('uploads', 'avatars');
  const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const fileName = `${me.id}-${Date.now()}.${ext}`;
  const relativePath = `${relativeDir.replace(/\\/g, '/')}/${fileName}`;
  const absolutePath = path.join(absoluteDir, fileName);
  await fs.writeFile(absolutePath, bytes);

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

    const count = await tx.user.count({ where: { dormId: me.dormId } });
    if (count === 0) {
      await tx.dorm.delete({ where: { id: me.dormId } });
    }
  });

  return { success: true };
}
