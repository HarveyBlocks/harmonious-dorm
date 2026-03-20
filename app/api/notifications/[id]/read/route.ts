import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { markNotificationRead } from '@/lib/services/notification-service';

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(_request: Request, { params }: Params) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, '通知 ID 无效');
    }

    await markNotificationRead(session.dormId, session.userId, id);
    return NextResponse.json({ success: true });
  });
}
