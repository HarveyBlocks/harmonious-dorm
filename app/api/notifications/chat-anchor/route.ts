import { NextResponse } from 'next/server';

import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getOldestUnreadChatNotificationTime } from '@/lib/services/notification-service';

export async function GET() {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const oldestUnreadChatNotificationTime = await getOldestUnreadChatNotificationTime(session.dormId, session.userId);
    return NextResponse.json({ oldestUnreadChatNotificationTime });
  });
}

