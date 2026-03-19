import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateMemberDescriptions } from '@/lib/services';

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = await parseJson<{ items: Array<{ userId: number; description: string }> }>(request);
    const result = await updateMemberDescriptions(session, body.items || []);
    return NextResponse.json(result);
  });
}

