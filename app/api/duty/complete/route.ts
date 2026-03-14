import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { completeDuty } from '@/lib/services';
import { completeDutySchema } from '@/lib/validators';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = completeDutySchema.parse(
      await parseJson<{ dutyId: number; imageUrl?: string | null; completed?: boolean }>(request),
    );
    const result = await completeDuty(session, body);
    return NextResponse.json(result);
  });
}
