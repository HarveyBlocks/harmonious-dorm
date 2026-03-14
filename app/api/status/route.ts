import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { listStatus, updateStatus } from '@/lib/services';
import { statusInputSchema } from '@/lib/validators';

export async function GET() {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const status = await listStatus(session);
    return NextResponse.json(status);
  });
}

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = statusInputSchema.parse(await parseJson<{ state: '学习' | '睡觉' | '游戏' | '外出' }>(request));
    const updated = await updateStatus(session, body.state);
    return NextResponse.json(updated);
  });
}