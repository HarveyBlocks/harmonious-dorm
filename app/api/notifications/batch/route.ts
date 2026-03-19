import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { bulkOperateNotifications } from '@/lib/services/notification-service';

interface BatchBody {
  action: 'delete' | 'read';
  status: 'all' | 'unread' | 'read';
  selectAll: boolean;
  ids?: number[];
  types?: string[];
}

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = await parseJson<BatchBody>(request);

    if (!body || (body.action !== 'delete' && body.action !== 'read')) {
      throw new ApiError(400, '批量操作 action 无效');
    }
    if (!['all', 'unread', 'read'].includes(body.status)) {
      throw new ApiError(400, 'status 参数错误');
    }
    const selectAll = (body as { selectAll?: unknown }).selectAll;
    if (typeof selectAll !== 'boolean') {
      throw new ApiError(400, 'selectAll 参数错误');
    }
    if (body.types !== undefined) {
      if (!Array.isArray(body.types) || body.types.some((item) => typeof item !== 'string' || !item.trim())) {
        throw new ApiError(400, 'types 参数错误');
      }
    }

    const result = await bulkOperateNotifications({
      dormId: session.dormId,
      userId: session.userId,
      action: body.action,
      status: body.status,
      selectAll,
      ids: body.ids || [],
      types: body.types || [],
    });

    return NextResponse.json({ success: true, count: result.count });
  });
}
