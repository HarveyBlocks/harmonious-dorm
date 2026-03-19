import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { LIMITS } from '@/lib/limits';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import type { CursorPage, SessionUser } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';
import { replyByDormBotIfMentioned } from './chat-bot-service';
import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';

type ChatListItem = { id: number; userId: number; userName: string; content: string; createdAt: string };

function toChatListItems(
  rows: Array<{
    id: number;
    userId: number;
    content: string;
    createdAt: Date;
    user: { id: number; name: string };
  }>,
): ChatListItem[] {
  return rows.map((item) => ({
    id: item.id,
    userId: item.userId,
    userName: item.user.name,
    content: item.content,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function listChatMessages(
  session: SessionUser,
  options?: { limit?: number; cursor?: number },
): Promise<CursorPage<ChatListItem>> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
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
  const items = toChatListItems(pageRows.reverse());

  return {
    items,
    nextCursor,
  };
}

export async function getChatWindowAround(
  session: SessionUser,
  options: { anchorId: number; before: number; after: number },
): Promise<{ items: ChatListItem[]; olderCursor: number | null; newerCursor: number | null; hasOlder: boolean; hasNewer: boolean }> {
  await ensureSessionUser(session);
  const anchorId = options.anchorId;
  const before = Math.max(0, Math.min(options.before, 100));
  const after = Math.max(0, Math.min(options.after, 100));
  const anchor = await prisma.chatMessage.findFirst({
    where: { id: anchorId, dormId: session.dormId },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!anchor) {
    throw new ApiError(404, '消息不存在');
  }

  const [olderRows, newerRows] = await Promise.all([
    before > 0
      ? prisma.chatMessage.findMany({
          where: { dormId: session.dormId, id: { lt: anchorId } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { id: 'desc' },
          take: before,
        })
      : Promise.resolve([]),
    after > 0
      ? prisma.chatMessage.findMany({
          where: { dormId: session.dormId, id: { gt: anchorId } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { id: 'asc' },
          take: after,
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...toChatListItems(olderRows.reverse()),
    ...toChatListItems([anchor]),
    ...toChatListItems(newerRows),
  ];
  const olderCursor = items.length > 0 ? items[0].id : anchorId;
  const newerCursor = items.length > 0 ? items[items.length - 1].id : anchorId;
  const [hasOlder, hasNewer] = await Promise.all([
    prisma.chatMessage.count({ where: { dormId: session.dormId, id: { lt: olderCursor } } }).then((n) => n > 0),
    prisma.chatMessage.count({ where: { dormId: session.dormId, id: { gt: newerCursor } } }).then((n) => n > 0),
  ]);

  return {
    items,
    olderCursor,
    newerCursor,
    hasOlder,
    hasNewer,
  };
}

export async function listOlderChatMessages(
  session: SessionUser,
  options: { cursor: number; limit?: number },
): Promise<{ items: ChatListItem[]; nextCursor: number | null; hasMore: boolean }> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const rows = await prisma.chatMessage.findMany({
    where: { dormId: session.dormId, id: { lt: options.cursor } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { id: 'desc' },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = toChatListItems(pageRows.reverse());
  const nextCursor = items.length > 0 ? items[0].id : null;
  return { items, nextCursor, hasMore };
}

export async function listNewerChatMessages(
  session: SessionUser,
  options: { cursor: number; limit?: number },
): Promise<{ items: ChatListItem[]; nextCursor: number | null; hasMore: boolean }> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const rows = await prisma.chatMessage.findMany({
    where: { dormId: session.dormId, id: { gt: options.cursor } },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { id: 'asc' },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = toChatListItems(pageRows);
  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;
  return { items, nextCursor, hasMore };
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
  const trimmed = content.trim();
  if (!trimmed) {
    throw new ApiError(400, '消息不能为空');
  }
  if (trimmed.length > LIMITS.CHAT_USER_CONTENT) {
    throw new ApiError(400, `消息不能超过 ${LIMITS.CHAT_USER_CONTENT} 字`);
  }

  const message = await prisma.chatMessage.create({
    data: {
      dormId: session.dormId,
      userId: session.userId,
      content: trimmed,
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
    title: encodeMessageToken('notice.chatFrom', { userName: user.name }),
    content: message.content.slice(0, 60),
    targetPath: '/chat',
    groupKey: 'chat',
    actorUserId: session.userId,
  });

  await replyByDormBotIfMentioned(session, message.content);

  return payload;
}
