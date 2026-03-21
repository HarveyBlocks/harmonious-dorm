import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { abortDormBotStream } from '@/lib/services/chat-bot-queue';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { id } = await context.params;
    const streamId = Number(id);
    if (!Number.isInteger(streamId) || streamId <= 0) {
      throw new ApiError(400, '当前消息无法停止');
    }
    const result = await abortDormBotStream({ session, streamId });
    return NextResponse.json(result);
  });
}
