import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateDormBotSettings } from '@/lib/services';

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = await parseJson<{ settings: Array<{ key: string; value: string }>; otherContent?: string }>(request);
    const result = await updateDormBotSettings(session, body.settings || [], body.otherContent || '');
    return NextResponse.json(result);
  });
}

