import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateDormBotName } from '@/lib/services';

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = await parseJson<{ name: string }>(request);
    const result = await updateDormBotName(session, body.name || '');
    return NextResponse.json(result);
  });
}

