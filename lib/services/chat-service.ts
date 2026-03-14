import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { CursorPage, SessionUser } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';
import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';

export async function listChatMessages(
  session: SessionUser,
  options?: { limit?: number; cursor?: number },
): Promise<CursorPage<{ id: number; userId: number; userName: string; content: string; createdAt: string }>> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options?.limit ?? 40, 100));
  const cursor = options?.cursor && Number.isInteger(options.cursor) && options.cursor > 0 ? options.cursor : undefined;

  const rows = await prisma.chatMessage.findMany({
    where: { dormId: session.dormId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    ...(cursor ? { where: { dormId: session.dormId, id: { lt: cursor } } } : {}),
    orderBy: { id: 'desc' },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;
  const items = pageRows
    .reverse()
    .map((item) => ({
      id: item.id,
      userId: item.userId,
      userName: item.user.name,
      content: item.content,
      createdAt: item.createdAt.toISOString(),
    }));

  return {
    items,
    nextCursor,
  };
}

export async function findChatAnchorByTime(session: SessionUser, fromIso: string): Promise<number | null> {
  await ensureSessionUser(session);
  const fromDate = new Date(fromIso);
  if (Number.isNaN(fromDate.getTime())) {
    throw new ApiError(400, '时间参数错误');
  }

  const row = await prisma.chatMessage.findFirst({
    where: {
      dormId: session.dormId,
      createdAt: {
        gte: fromDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  });

  return row?.id ?? null;
}

export async function sendChatMessage(session: SessionUser, content: string) {
  const user = await ensureSessionUser(session);
  if (!content.trim()) {
    throw new ApiError(400, '消息不能为空');
  }

  const message = await prisma.chatMessage.create({
    data: {
      dormId: session.dormId,
      userId: session.userId,
      content: content.trim(),
    },
  });

  const payload = {
    id: message.id,
    userId: user.id,
    userName: user.name,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  };

  emitToDorm(session.dormId, 'chat:new', payload);

  await pushDormNotification({
    dormId: session.dormId,
    type: 'chat',
    title: `${user.name} 发来新消息`,
    content: message.content.slice(0, 60),
    targetPath: '/',
    groupKey: 'chat',
    actorUserId: session.userId,
  });

  return payload;
}
