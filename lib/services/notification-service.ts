import { prisma } from '@/lib/db';
import type { CursorPage, NotificationPayload } from '@/lib/types';

import { emitToDorm } from '@/lib/socket-server';

export async function pushDormNotification(input: {
  dormId: number;
  type: string;
  title: string;
  content: string;
  targetPath?: string;
  groupKey?: string;
  actorUserId?: number;
  recipientUserIds?: number[];
}) {
  const { dormId, type, title, content, targetPath, groupKey, actorUserId } = input;
  const users = await prisma.user.findMany({
    where: { dormId },
    select: { id: true },
  });
  const allowSet = new Set(input.recipientUserIds && input.recipientUserIds.length > 0 ? input.recipientUserIds : users.map((u) => u.id));
  if (actorUserId) {
    allowSet.delete(actorUserId);
  }
  const recipients = [...allowSet];
  if (recipients.length === 0) return null;

  for (const userId of recipients) {
    let notification = null;
    if (groupKey) {
      const existed = await prisma.notification.findFirst({
        where: {
          dormId,
          userId,
          groupKey,
          isRead: false,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (existed) {
        notification = await prisma.notification.update({
          where: { id: existed.id },
          data: {
            title,
            content,
            targetPath: targetPath || existed.targetPath,
            unreadCount: existed.unreadCount + 1,
          },
        });
      }
    }

    if (!notification) {
      notification = await prisma.notification.create({
        data: {
          dormId,
          userId,
          type,
          title,
          content,
          targetPath: targetPath || null,
          groupKey: groupKey || null,
        },
      });
    }

    emitToDorm(dormId, 'notification:new', {
      id: notification.id,
      userId,
      title: notification.title,
      content: notification.content,
      targetPath: notification.targetPath,
      unreadCount: notification.unreadCount,
    });
  }

  emitToDorm(dormId, 'notification:changed', {
    type,
    groupKey: groupKey || null,
  });

  return { success: true };
}

export async function listNotifications(
  dormId: number,
  userId: number,
  status: 'all' | 'unread' | 'read',
  options?: { limit?: number; cursor?: number },
): Promise<CursorPage<NotificationPayload>> {
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
  const cursor = options?.cursor && Number.isInteger(options.cursor) && options.cursor > 0 ? options.cursor : undefined;
  const where =
    status === 'all'
      ? { dormId, userId }
      : {
          dormId,
          userId,
          isRead: status === 'read',
        };

  const rows = await prisma.notification.findMany({
    where: {
      ...where,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;

  const items = pageRows.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    content: item.content,
    targetPath: item.targetPath,
    isRead: item.isRead,
    unreadCount: item.unreadCount,
    updatedAt: item.updatedAt.toISOString(),
  }));

  return {
    items,
    nextCursor,
  };
}

export async function getOldestUnreadChatNotificationTime(dormId: number, userId: number): Promise<string | null> {
  const row = await prisma.notification.findFirst({
    where: {
      dormId,
      userId,
      isRead: false,
      type: 'chat',
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      createdAt: true,
    },
  });
  return row ? row.createdAt.toISOString() : null;
}

export async function markNotificationRead(dormId: number, userId: number, id: number) {
  return prisma.notification.updateMany({
    where: { id, dormId, userId },
    data: {
      isRead: true,
      unreadCount: 0,
    },
  });
}

export async function markAllNotificationsRead(dormId: number, userId: number) {
  return prisma.notification.updateMany({
    where: {
      dormId,
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      unreadCount: 0,
    },
  });
}

export async function deleteNotification(dormId: number, userId: number, id: number) {
  return prisma.notification.deleteMany({
    where: { id, dormId, userId },
  });
}

export async function bulkOperateNotifications(input: {
  dormId: number;
  userId: number;
  action: 'delete' | 'read';
  status: 'all' | 'unread' | 'read';
  selectAll: boolean;
  ids: number[];
  types?: string[];
}) {
  const { dormId, userId, action, status, selectAll, ids, types } = input;
  const sanitizedIds = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
  const sanitizedTypes = [...new Set((types || []).map((item) => item.trim()).filter((item) => item.length > 0))];

  const whereBase =
    status === 'all'
      ? {
          dormId,
          userId,
          ...(sanitizedTypes.length > 0 ? { type: { in: sanitizedTypes } } : {}),
        }
      : {
          dormId,
          userId,
          isRead: status === 'read',
          ...(sanitizedTypes.length > 0 ? { type: { in: sanitizedTypes } } : {}),
        };

  const where = selectAll
    ? {
        ...whereBase,
        ...(sanitizedIds.length > 0 ? { id: { notIn: sanitizedIds } } : {}),
      }
    : {
        ...whereBase,
        id: { in: sanitizedIds.length > 0 ? sanitizedIds : [-1] },
      };

  if (action === 'delete') {
    const result = await prisma.notification.deleteMany({ where });
    return { count: result.count };
  }

  const result = await prisma.notification.updateMany({
    where: {
      ...where,
      isRead: false,
    },
    data: {
      isRead: true,
      unreadCount: 0,
    },
  });
  return { count: result.count };
}
