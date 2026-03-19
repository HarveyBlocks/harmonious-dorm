import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import { LIMITS } from '@/lib/limits';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import type { CursorPage, DutyItem, SessionUser } from '@/lib/types';

import { ensureSessionUser, weekRange } from './helpers';
import { pushDormNotification } from './notification-service';
import { emitToDorm } from '@/lib/socket-server';

export async function listDuties(
  session: SessionUser,
  options?: { week?: string; from?: string; to?: string; scope?: 'week' | 'all'; limit?: number; cursor?: number },
): Promise<CursorPage<DutyItem>> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
  const cursor = options?.cursor && Number.isInteger(options.cursor) && options.cursor > 0 ? options.cursor : undefined;

  let start: string;
  let end: string;
  if (options?.scope === 'all') {
    start = '1900-01-01';
    end = '2999-12-31';
  } else if (options?.from && options?.to) {
    start = options.from;
    end = options.to;
  } else {
    const range = weekRange(options?.week);
    start = range.start;
    end = range.end;
  }

  const duties = await prisma.duty.findMany({
    where: {
      dormId: session.dormId,
      date: {
        gte: start,
        lte: end,
      },
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ id: 'desc' }],
    take: limit + 1,
  });
  const hasMore = duties.length > limit;
  const pageDuties = hasMore ? duties.slice(0, limit) : duties;
  const nextCursor = hasMore ? pageDuties[pageDuties.length - 1]?.id ?? null : null;

  const items = pageDuties
    .map((duty) => ({
      dutyId: duty.id,
      date: duty.date,
      userId: duty.userId,
      userName: duty.user.name,
      task: duty.task,
      completed: duty.completed,
      imageUrl: duty.imageUrl,
    }))
    .sort((a, b) => (a.date === b.date ? a.dutyId - b.dutyId : a.date.localeCompare(b.date)));

  return {
    items,
    nextCursor,
  };
}

export async function assignDuty(
  session: SessionUser,
  input: { userId: number; date: string; task: string },
): Promise<{ success: true }> {
  await ensureSessionUser(session);

  if (!session.isLeader) {
    throw new ApiError(403, '只有舍长可以分配值日');
  }

  const task = input.task.trim();
  if (!task) {
    throw new ApiError(400, '任务内容不能为空');
  }
  if (task.length > LIMITS.DUTY_TASK) {
    throw new ApiError(400, `任务内容最多 ${LIMITS.DUTY_TASK} 字`);
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: input.userId,
      dormId: session.dormId,
    },
    select: { id: true },
  });

  if (!targetUser) {
    throw new ApiError(400, '被分配用户不在当前宿舍');
  }

  try {
    await prisma.duty.create({
      data: {
        dormId: session.dormId,
        userId: input.userId,
        date: input.date,
        task,
        completed: false,
        imageUrl: null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ApiError(409, '相同日期和任务已存在');
    }
    throw error;
  }

  const leaders = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
      isLeader: true,
    },
    select: { id: true },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'duty',
    title: encodeMessageToken(NoticeMessageKey.DutyPublished),
    content: encodeMessageToken(NoticeMessageKey.DutyAssignedContent, { date: input.date, task }),
    targetPath: '/',
    groupKey: `duty-assign-${input.date}-${input.userId}-${task}`,
    actorUserId: session.userId,
    recipientUserIds: [...new Set([input.userId, ...leaders.map((item) => item.id)])],
  });
  emitToDorm(session.dormId, 'duty:changed', { date: input.date });

  return {
    success: true,
  };
}

export async function completeDuty(
  session: SessionUser,
  input: { dutyId: number; imageUrl?: string | null; completed?: boolean },
): Promise<{ success: true }> {
  await ensureSessionUser(session);

  const duty = await prisma.duty.findFirst({
    where: {
      id: input.dutyId,
      dormId: session.dormId,
    },
  });

  if (!duty) {
    throw new ApiError(404, '值日记录不存在');
  }

  if (duty.userId !== session.userId) {
    throw new ApiError(403, '只能完成自己的值日任务');
  }

  await prisma.duty.update({
    where: {
      id: duty.id,
    },
    data: {
      completed: input.completed ?? true,
      imageUrl: input.imageUrl || null,
    },
  });

  const leaders = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
      isLeader: true,
    },
    select: { id: true },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'duty',
    title: encodeMessageToken(input.completed === false ? NoticeMessageKey.DutyRestored : NoticeMessageKey.DutyCompleted),
    content: encodeMessageToken(input.completed === false ? NoticeMessageKey.MemberReopenedDuty : NoticeMessageKey.MemberCompletedDuty),
    targetPath: '/',
    groupKey: `duty-complete-${duty.id}`,
    actorUserId: session.userId,
    recipientUserIds: [...new Set([duty.userId, ...leaders.map((item) => item.id)])],
  });
  emitToDorm(session.dormId, 'duty:changed', { dutyId: duty.id });

  return {
    success: true,
  };
}

export async function deleteDuty(session: SessionUser, dutyId: number): Promise<{ success: true }> {
  await ensureSessionUser(session);
  if (!session.isLeader) {
    throw new ApiError(403, '只有舍长可以删除值日任务');
  }

  const duty = await prisma.duty.findFirst({
    where: {
      id: dutyId,
      dormId: session.dormId,
    },
  });
  if (!duty) {
    throw new ApiError(404, '值日记录不存在');
  }

  await prisma.duty.delete({
    where: { id: duty.id },
  });

  emitToDorm(session.dormId, 'duty:changed', { dutyId: duty.id, deleted: true });
  return { success: true };
}

