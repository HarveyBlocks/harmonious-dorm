import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { BillSummary, CursorPage, SessionUser } from '@/lib/types';

import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';
import { emitToDorm } from '@/lib/socket-server';

export async function createBill(
  session: SessionUser,
  input: {
    total: number;
    description?: string | null;
    category?: string;
    customCategory?: string | null;
    participants: number[];
  },
): Promise<{ billId: number }> {
  await ensureSessionUser(session);

  const participants = [...new Set(input.participants)];
  if (participants.length === 0) {
    throw new ApiError(400, '至少选择一位参与人');
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: participants },
      dormId: session.dormId,
    },
    select: { id: true },
  });

  if (users.length !== participants.length) {
    throw new ApiError(400, '参与人必须属于当前宿舍');
  }

  const bill = await prisma.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
        dormId: session.dormId,
        totalAmount: input.total,
        description: input.description?.trim() || null,
        category: input.category?.trim() || '其他',
        customCategory: input.customCategory?.trim() || null,
        createdBy: session.userId,
      },
    });

    await tx.billParticipant.createMany({
      data: participants.map((userId) => ({
        billId: created.id,
        userId,
      })),
    });

    return created;
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'bill',
    title: '新账单已发布',
    content: `${input.description || '未命名账单'} · ¥${input.total.toFixed(2)}`,
    targetPath: '/',
    groupKey: 'bill-created',
    actorUserId: session.userId,
    recipientUserIds: participants,
  });
  emitToDorm(session.dormId, 'bill:changed', { billId: bill.id });

  return {
    billId: bill.id,
  };
}

export async function listBills(
  session: SessionUser,
  options?: { limit?: number; cursor?: number },
): Promise<CursorPage<BillSummary>> {
  await ensureSessionUser(session);
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
  const cursor = options?.cursor && Number.isInteger(options.cursor) && options.cursor > 0 ? options.cursor : undefined;

  const bills = await prisma.bill.findMany({
    where: {
      dormId: session.dormId,
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      participants: true,
    },
    orderBy: {
      id: 'desc',
    },
    take: limit + 1,
  });
  const hasMore = bills.length > limit;
  const pageBills = hasMore ? bills.slice(0, limit) : bills;
  const nextCursor = hasMore ? pageBills[pageBills.length - 1]?.id ?? null : null;

  const items = pageBills.map((bill) => {
    const totalCount = bill.participants.length;
    const paidCount = bill.participants.filter((item) => item.paid).length;
    const myShare = bill.participants.find((item) => item.userId === session.userId);

    return {
      id: bill.id,
      total: bill.totalAmount,
      description: bill.description,
      category: bill.category,
      customCategory: bill.customCategory,
      createdAt: bill.createdAt.toISOString(),
      paidCount,
      totalCount,
      myPaid: Boolean(myShare?.paid),
    };
  });

  return {
    items,
    nextCursor,
  };
}

export async function markBillPaid(
  session: SessionUser,
  billId: number,
  userId?: number,
  paid = true,
): Promise<{ success: true }> {
  await ensureSessionUser(session);

  const effectiveUserId = userId ?? session.userId;
  if (effectiveUserId !== session.userId) {
    throw new ApiError(403, '只能标记自己的支付状态');
  }

  const bill = await prisma.bill.findFirst({
    where: {
      id: billId,
      dormId: session.dormId,
    },
    select: {
      id: true,
      participants: {
        select: { userId: true },
      },
    },
  });

  if (!bill) {
    throw new ApiError(404, '账单不存在');
  }

  const share = await prisma.billParticipant.findUnique({
    where: {
      billId_userId: {
        billId,
        userId: effectiveUserId,
      },
    },
  });

  if (!share) {
    throw new ApiError(400, '你不在该账单参与列表中');
  }

  await prisma.billParticipant.update({
    where: {
      billId_userId: {
        billId,
        userId: effectiveUserId,
      },
    },
    data: {
      paid,
    },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'bill',
    title: paid ? '账单支付状态更新' : '账单支付已撤销',
    content: paid ? '有成员标记了已支付' : '有成员撤销了已支付',
    targetPath: '/',
    groupKey: `bill-pay-${billId}`,
    actorUserId: session.userId,
    recipientUserIds: bill.participants.map((item) => item.userId),
  });

  if (paid) {
    const shares = await prisma.billParticipant.findMany({
      where: { billId },
      select: { paid: true },
    });
    const allPaid = shares.length > 0 && shares.every((item) => item.paid);
    if (allPaid) {
      const leaders = await prisma.user.findMany({
        where: { dormId: session.dormId, isLeader: true },
        select: { id: true },
      });
      await pushDormNotification({
        dormId: session.dormId,
        type: 'bill',
        title: '账单已全部支付',
        content: '该账单所有参与成员已完成支付',
        targetPath: '/',
        groupKey: `bill-all-paid-${billId}`,
        actorUserId: session.userId,
        recipientUserIds: leaders.map((item) => item.id),
      });
    }
  }
  emitToDorm(session.dormId, 'bill:changed', { billId });

  return {
    success: true,
  };
}
