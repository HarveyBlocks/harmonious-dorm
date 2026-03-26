import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateDormBotToolPermissionsBatch } from '@/lib/services';

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = await parseJson<{ toolPermissions?: Record<string, 'allow' | 'deny'> }>(request);
    const result = await updateDormBotToolPermissionsBatch(session, body.toolPermissions || {});
    return NextResponse.json(result);
  });
}
