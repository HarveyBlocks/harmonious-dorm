import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { listNotifications } from '@/lib/services/notification-service';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'all') as 'all' | 'unread' | 'read';
    if (!['all', 'unread', 'read'].includes(status)) {
      throw new ApiError(400, 'Invalid status param', { code: 'notification.status.invalid' });
    }

    const limit = Number(searchParams.get('limit') || '20');
    const cursor = Number(searchParams.get('cursor') || '');
    const rows = await listNotifications(session.dormId, session.userId, status, {
      limit: Number.isFinite(limit) ? limit : 20,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
    });
    return NextResponse.json(rows);
  });
}

