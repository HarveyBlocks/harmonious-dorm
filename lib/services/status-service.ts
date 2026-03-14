import { prisma } from '@/lib/db';
import type { SessionUser } from '@/lib/types';

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
    state: user.status?.state ?? '外出',
    updatedAt: user.status?.updatedAt?.toISOString() ?? null,
  }));
}

export async function updateStatus(session: SessionUser, state: '学习' | '睡觉' | '游戏' | '外出') {
  const me = await ensureSessionUser(session);

  const status = await prisma.status.upsert({
    where: {
      userId: session.userId,
    },
    create: {
      userId: session.userId,
      state,
    },
    update: {
      state,
    },
  });

  const chat = await prisma.chatMessage.create({
    data: {
      dormId: session.dormId,
      userId: me.id,
      content: `${me.name}现在是${state}状态`,
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
    state,
  });

  return {
    userId: status.userId,
    state: status.state,
    updatedAt: status.updatedAt.toISOString(),
  };
}
