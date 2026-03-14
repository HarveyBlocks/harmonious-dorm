import { cookies } from 'next/headers';

import { SESSION_COOKIE_NAME } from '@/lib/constants';
import { prisma } from '@/lib/db';
import { readSessionToken } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

export function getServerSession(): SessionUser | null {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return readSessionToken(token);
}

export async function getValidatedServerSession(): Promise<SessionUser | null> {
  const session = getServerSession();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      dormId: session.dormId,
    },
    select: { id: true },
  });

  if (!user) {
    return null;
  }

  return session;
}
