import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { deleteNotification } from '@/lib/services/notification-service';

interface Params {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: Params) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ApiError(400, '通知 ID 无效');
    }

    await deleteNotification(session.dormId, session.userId, id);
    return NextResponse.json({ success: true });
  });
}
