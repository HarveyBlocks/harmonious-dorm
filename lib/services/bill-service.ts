import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
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
    throw new ApiError(400, 'At least one participant required', { code: 'bill.participants.required' });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { in: participants },
      dormId: session.dormId,
    },
    select: { id: true },
  });

  if (users.length !== participants.length) {
    throw new ApiError(400, 'Participants must belong to dorm', { code: 'bill.participants.invalid_member' });
  }

  const normalizedWeights = normalizeWeights(participants, input.participantWeights);
  if (!validateWeights(normalizedWeights)) {
    throw new ApiError(400, 'Weight cannot be negative', { code: 'bill.weight.negative' });
  }

  const amountMap = allocateAmounts(input.total, participants, normalizedWeights);
  if (amountMap.size !== participants.length) {
    throw new ApiError(400, 'At least one payable participant required', { code: 'bill.payable.required' });
  }

  const payableParticipants = participants
    .map((userId) => ({ userId, actualAmount: amountMap.get(userId) || 0 }))
    .filter((item) => item.actualAmount > 0);

  if (payableParticipants.length === 0) {
    throw new ApiError(400, 'At least one payable participant required', { code: 'bill.payable.required' });
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
    title: encodeMessageToken(NoticeMessageKey.NewBillPublished),
    content: encodeMessageToken(NoticeMessageKey.BillSummary, {
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
    const hasAnyPaid = bill.participants.some((item) => item.actualAmount > 0 && item.paid);
    const canDelete = hasAnyPaid ? session.isLeader : session.isLeader || bill.createdBy === session.userId;

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
      canDelete,
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
    throw new ApiError(403, 'Can only mark own payment status', { code: 'bill.payment.self_only' });
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
    throw new ApiError(404, 'Bill not found', { code: 'bill.not_found' });
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
    throw new ApiError(400, 'You are not in bill participants', { code: 'bill.participant.not_found' });
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
    title: encodeMessageToken(paid ? NoticeMessageKey.BillPaymentStatusUpdated : NoticeMessageKey.BillPaymentReverted),
    content: encodeMessageToken(paid ? NoticeMessageKey.MemberMarkedPaid : NoticeMessageKey.MemberRevertedPaid),
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
        title: encodeMessageToken(NoticeMessageKey.BillFullyPaid),
        content: encodeMessageToken(NoticeMessageKey.BillAllParticipantsPaid),
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






export async function deleteBill(session: SessionUser, billId: number): Promise<{ success: true }> {
  await ensureSessionUser(session);

  const bill = await prisma.bill.findFirst({
    where: {
      id: billId,
      dormId: session.dormId,
    },
    include: {
      participants: {
        where: { actualAmount: { gt: 0 } },
        select: { userId: true, paid: true },
      },
    },
  });

  if (!bill) {
    throw new ApiError(404, 'Bill not found', { code: 'bill.not_found' });
  }

  const hasAnyPaid = bill.participants.some((item) => item.paid);
  const canDelete = hasAnyPaid ? session.isLeader : session.isLeader || bill.createdBy === session.userId;
  if (!canDelete) {
    throw new ApiError(
      403,
      hasAnyPaid ? 'Only leader can delete after someone paid' : 'Only creator or leader can delete',
      { code: hasAnyPaid ? 'bill.delete.leader_required_after_paid' : 'bill.delete.creator_or_leader_required' },
    );
  }

  await prisma.bill.delete({
    where: { id: bill.id },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'bill',
    title: encodeMessageToken(NoticeMessageKey.BillDeleted),
    content: encodeMessageToken(NoticeMessageKey.BillDeletedContent, {
      name: bill.customCategory || bill.description || '',
      amount: bill.totalAmount.toFixed(2),
    }),
    targetPath: '/wallet',
    groupKey: `bill-delete-${bill.id}`,
    actorUserId: session.userId,
  });

  emitToDorm(session.dormId, 'bill:changed', { billId: bill.id, deleted: true });

  return { success: true };
}
