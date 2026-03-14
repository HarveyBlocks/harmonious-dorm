import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getChatWindowAround, listNewerChatMessages, listOlderChatMessages } from '@/lib/services/chat-service';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'around';

    if (mode === 'around') {
      const anchorId = Number(searchParams.get('anchorId') || '');
      const before = Number(searchParams.get('before') || '10');
      const after = Number(searchParams.get('after') || '10');
      if (!Number.isInteger(anchorId) || anchorId <= 0) {
        throw new ApiError(400, '请求参数校验失败');
      }
      const payload = await getChatWindowAround(session, {
        anchorId,
        before: Number.isFinite(before) ? before : 10,
        after: Number.isFinite(after) ? after : 10,
      });
      return NextResponse.json(payload);
    }

    if (mode === 'older') {
      const cursor = Number(searchParams.get('cursor') || '');
      const limit = Number(searchParams.get('limit') || '20');
      if (!Number.isInteger(cursor) || cursor <= 0) {
        throw new ApiError(400, '请求参数校验失败');
      }
      const payload = await listOlderChatMessages(session, {
        cursor,
        limit: Number.isFinite(limit) ? limit : 20,
      });
      return NextResponse.json(payload);
    }

    if (mode === 'newer') {
      const cursor = Number(searchParams.get('cursor') || '');
      const limit = Number(searchParams.get('limit') || '20');
      if (!Number.isInteger(cursor) || cursor <= 0) {
        throw new ApiError(400, '请求参数校验失败');
      }
      const payload = await listNewerChatMessages(session, {
        cursor,
        limit: Number.isFinite(limit) ? limit : 20,
      });
      return NextResponse.json(payload);
    }

    throw new ApiError(400, '请求参数校验失败');
  });
}

