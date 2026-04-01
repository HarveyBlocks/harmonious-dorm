import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { requestDormChatSummary } from '@/lib/services';
import { requestChatSummarySchema } from '@/lib/validators';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = requestChatSummarySchema.parse(await parseJson<{ messageCount: number }>(request));
    const result = await requestDormChatSummary(session, body.messageCount);
    return NextResponse.json(result, { status: 202 });
  });
}
