import { prisma } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import type { SessionUser } from '@/lib/types';

export function normalizeName(name: string): string {
  return name.trim();
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeInviteCode(inviteCode?: string | null): string {
  return (inviteCode || '').trim().toUpperCase();
}

export async function ensureSessionUser(session: SessionUser) {
  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      dormId: session.dormId,
    },
  });

  if (!user) {
    throw new ApiError(401, '登录状态失效，请重新登录');
  }

  return user;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

export function toDateText(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function weekRange(anchor?: string): { start: string; end: string } {
  const base = anchor ? new Date(`${anchor}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    throw new ApiError(400, 'week 参数格式错误，应为 YYYY-MM-DD');
  }

  const day = base.getDay();
  const diffFromMonday = (day + 6) % 7;
  const startDate = new Date(base);
  startDate.setDate(base.getDate() - diffFromMonday);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    start: toDateText(startDate),
    end: toDateText(endDate),
  };
}
