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

function isBatchBody(input: unknown): input is BatchBody {
  if (!input || typeof input !== 'object') return false;
  const body = input as Partial<BatchBody>;
  if (body.action !== 'delete' && body.action !== 'read') return false;
  if (body.status !== 'all' && body.status !== 'unread' && body.status !== 'read') return false;
  if (typeof body.selectAll !== 'boolean') return false;
  if (body.ids !== undefined && (!Array.isArray(body.ids) || body.ids.some((id) => !Number.isInteger(id) || id <= 0))) return false;
  const hasInvalidTypes =
    body.types !== undefined &&
    (!Array.isArray(body.types) || body.types.some((type) => typeof type !== 'string' || type.trim().length === 0));
  return !hasInvalidTypes;
}

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = await parseJson<unknown>(request);

    if (!isBatchBody(body)) {
      throw new ApiError(400, '批量操作参数无效');
    }

    const result = await bulkOperateNotifications({
      dormId: session.dormId,
      userId: session.userId,
      action: body.action,
      status: body.status,
      selectAll: body.selectAll,
      ids: body.ids || [],
      types: body.types || [],
    });

    return NextResponse.json({ success: true, count: result.count });
  });
}

