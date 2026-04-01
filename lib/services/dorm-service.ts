import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import { emitToDorm } from '@/lib/socket-server';
import type { SessionUser } from '@/lib/types';

import { ensureSessionUser } from './helpers';
import { pushDormNotification } from './notification-service';

export async function updateDormName(session: SessionUser, name: string) {
  const user = await ensureSessionUser(session);
  if (!user.isLeader) {
    throw new ApiError(403, 'Leader required to update dorm name', { code: 'dorm.name.update.leader_required' });
  }

  const dorm = await prisma.dorm.update({
    where: { id: session.dormId },
    data: { name: name.trim() },
  });

  await pushDormNotification({
    dormId: session.dormId,
    type: 'dorm',
    title: encodeMessageToken(NoticeMessageKey.DormInfoUpdated),
    content: encodeMessageToken(NoticeMessageKey.DormNameChanged, { name: dorm.name }),
    targetPath: '/settings',
    groupKey: 'dorm-name',
    actorUserId: session.userId,
  });
  emitToDorm(session.dormId, 'settings:changed', { scope: 'dorm-name' });

  return dorm;
}

export async function transferLeader(session: SessionUser, targetUserId: number) {
  const user = await ensureSessionUser(session);
  if (!user.isLeader) {
    throw new ApiError(403, 'Leader required to transfer leader', { code: 'dorm.leader.transfer.leader_required' });
  }

  const target = await prisma.user.findFirst({
    where: { id: targetUserId, dormId: session.dormId },
  });
  if (!target) {
    throw new ApiError(404, 'Target user not found', { code: 'dorm.leader.transfer.target_not_found' });
  }

  if (target.id === user.id) {
    throw new ApiError(400, 'Cannot transfer to self', { code: 'dorm.leader.transfer.self_forbidden' });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { isLeader: false } }),
    prisma.user.update({ where: { id: target.id }, data: { isLeader: true } }),
  ]);

  await pushDormNotification({
    dormId: session.dormId,
    type: 'leader',
    title: encodeMessageToken(NoticeMessageKey.LeaderRightsTransferred),
    content: encodeMessageToken(NoticeMessageKey.LeaderTransferContent, { fromUserName: user.name, toUserName: target.name }),
    targetPath: '/settings',
    groupKey: 'leader-transfer',
    actorUserId: session.userId,
  });
  emitToDorm(session.dormId, 'settings:changed', { scope: 'leader-transfer' });

  return { success: true };
}
