import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { assignDuty } from '@/lib/services';
import { assignDutySchema } from '@/lib/validators';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = assignDutySchema.parse(await parseJson<{ userId: number; date: string; task: string }>(request));
    const result = await assignDuty(session, body);
    return NextResponse.json(result);
  });
}