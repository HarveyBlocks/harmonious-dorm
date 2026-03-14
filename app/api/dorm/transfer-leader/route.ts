import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { transferLeader } from '@/lib/services/dorm-service';
import { transferLeaderSchema } from '@/lib/validators';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = transferLeaderSchema.parse(await parseJson<{ targetUserId: number }>(request));
    const result = await transferLeader(session, body.targetUserId);
    return NextResponse.json(result);
  });
}