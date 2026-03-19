import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { allocateAmounts, normalizeWeights, validateWeights } from '@/lib/share-allocation';
import { normalizeBillCategory } from '@/lib/domain-codes';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import type { BillSummary, CursorPage, SessionUser } from '@/lib/types';

import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';
import { emitToDorm } from '@/lib/socket-server';

async function syncBillParticipantAmounts(dormId: number): Promise<void> {
  const bills = await prisma.bill.findMany({
    where: { dormId },
    include: { participants: true },
  });

  for (const bill of bills) {
    if (bill.participants.length === 0) continue;
    const allZero = bill.participants.every((item) => item.actualAmount <= 0);
    if (!allZero) continue;

    const rows = normalizeWeights(bill.participants.map((item) => item.userId));
    const amountMap = allocateAmounts(bill.totalAmount, rows.map((item) => item.userId), rows);
    if (amountMap.size !== bill.participants.length) continue;

    await prisma.$transaction(
      bill.participants.map((item) =>
        prisma.billParticipant.update({
          where: { billId_userId: { billId: bill.id, userId: item.userId } },
          data: { actualAmount: amountMap.get(item.userId) || 0 },
        }),
      ),
    );
  }
}

export async function createBill(
  session: SessionUser,
  input: {
    total: number;
    description?: string | null;
    category?: string;
    customCategory?: string | null;
    participants: number[];
    participantWeights?: Array<{ userId: number; weight: number }>;
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

  const normalizedWeights = normalizeWeights(participants, input.participantWeights);
  if (!validateWeights(normalizedWeights)) {
    throw new ApiError(400, '权重不能小于 0');
  }

  const amountMap = allocateAmounts(input.total, participants, normalizedWeights);
  if (amountMap.size !== participants.length) {
    throw new ApiError(400, '至少一位成员需要支付');
  }

  const payableParticipants = participants
    .map((userId) => ({ userId, actualAmount: amountMap.get(userId) || 0 }))
    .filter((item) => item.actualAmount > 0);

  if (payableParticipants.length === 0) {
    throw new ApiError(400, '至少一位成员需要支付');
  }

  const normalizedCategory = normalizeBillCategory(input.category?.trim());
  const bill = await prisma.$transaction(async (tx) => {
    const created = await tx.bill.create({
      data: {
        dormId: session.dormId,
        totalAmount: input.total,
        description: normalizedCategory === 'other' ? (input.customCategory?.trim() || null) : null,
        category: normalizedCategory,
        customCategory: normalizedCategory === 'other' ? (input.customCategory?.trim() || null) : null,
        createdBy: session.userId,
      },
    });

    await tx.billParticipant.createMany({
      data: payableParticipants.map((item) => ({
        billId: created.id,
        userId: item.userId,
        actualAmount: item.actualAmount,
      })),
    });

    return created;
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'bill',
    title: encodeMessageToken('notice.newBillPublished'),
    content: encodeMessageToken('notice.billSummary', {
      name: input.description || '',
      amount: input.total.toFixed(2),
    }),
    targetPath: '/',
    groupKey: 'bill-created',
    actorUserId: session.userId,
    recipientUserIds: payableParticipants.map((item) => item.userId),
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
  await syncBillParticipantAmounts(session.dormId);

  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
  const cursor = options?.cursor && Number.isInteger(options.cursor) && options.cursor > 0 ? options.cursor : undefined;

  const bills = await prisma.bill.findMany({
    where: {
      dormId: session.dormId,
      participants: { some: { userId: session.userId, actualAmount: { gt: 0 } } },
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
    const myShare = bill.participants.find((item) => item.userId === session.userId && item.actualAmount > 0);

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
      myAmount: myShare?.actualAmount ?? 0,
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
        where: { actualAmount: { gt: 0 } },
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

  if (!share || share.actualAmount <= 0) {
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
    title: encodeMessageToken(paid ? 'notice.billPaymentStatusUpdated' : 'notice.billPaymentReverted'),
    content: encodeMessageToken(paid ? 'notice.memberMarkedPaid' : 'notice.memberRevertedPaid'),
    targetPath: '/',
    groupKey: `bill-pay-${billId}`,
    actorUserId: session.userId,
    recipientUserIds: bill.participants.map((item) => item.userId),
  });

  if (paid) {
    const shares = await prisma.billParticipant.findMany({
      where: { billId, actualAmount: { gt: 0 } },
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
        title: encodeMessageToken('notice.billFullyPaid'),
        content: encodeMessageToken('notice.billAllParticipantsPaid'),
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




