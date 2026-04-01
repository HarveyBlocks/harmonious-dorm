import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { findChatAnchorByTime } from '@/lib/services/chat-service';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    if (!from) {
      throw new ApiError(400, 'Invalid time param', { code: 'chat.time_param.invalid' });
    }
    const anchorId = await findChatAnchorByTime(session, from);
    return NextResponse.json({ anchorId });
  });
}

