import { prisma } from '@/lib/db';
import { encodeMessageToken } from '@/lib/i18n/message-token';
import { NoticeMessageKey } from '@/lib/i18n/notice-messages';
import type { SessionUser } from '@/lib/types';
import { normalizeDormState, type DormStateCode } from '@/lib/domain-codes';

import { emitToDorm } from '@/lib/socket-server';
import { ensureSessionUser } from './helpers';

export async function listStatus(session: SessionUser) {
  await ensureSessionUser(session);

  const users = await prisma.user.findMany({
    where: {
      dormId: session.dormId,
    },
    include: {
      status: true,
    },
    orderBy: [{ isLeader: 'desc' }, { createdAt: 'asc' }],
  });

  return users.map((user) => ({
    userId: user.id,
    name: user.name,
    state: normalizeDormState(user.status?.state),
    updatedAt: user.status?.updatedAt?.toISOString() ?? null,
  }));
}

export async function updateStatus(session: SessionUser, state: DormStateCode) {
  const me = await ensureSessionUser(session);

  const normalizedState = normalizeDormState(state);

  const status = await prisma.status.upsert({
    where: {
      userId: session.userId,
    },
    create: {
      userId: session.userId,
      state: normalizedState,
    },
    update: {
      state: normalizedState,
    },
  });

  const chat = await prisma.chatMessage.create({
    data: {
      dormId: session.dormId,
      userId: me.id,
      content: encodeMessageToken(NoticeMessageKey.ChatStatusChanged, {
        userName: me.name,
        state: normalizedState,
      }),
    },
  });
  emitToDorm(session.dormId, 'chat:new', {
    id: chat.id,
    userId: me.id,
    userName: me.name,
    content: chat.content,
    createdAt: chat.createdAt.toISOString(),
  });
  emitToDorm(session.dormId, 'status:changed', {
    userId: me.id,
    state: normalizedState,
  });

  return {
    userId: status.userId,
    state: status.state,
    updatedAt: status.updatedAt.toISOString(),
  };
}
