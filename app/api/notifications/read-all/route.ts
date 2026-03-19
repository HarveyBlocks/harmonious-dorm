import { NextResponse } from 'next/server';

import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { markAllNotificationsRead } from '@/lib/services/notification-service';

export async function PUT() {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    await markAllNotificationsRead(session.dormId, session.userId);
    return NextResponse.json({ success: true });
  });
}

