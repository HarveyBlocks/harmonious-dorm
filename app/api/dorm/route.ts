import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateDormName } from '@/lib/services/dorm-service';
import { updateDormSchema } from '@/lib/validators';

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const body = updateDormSchema.parse(await parseJson<{ name: string }>(request));
    const dorm = await updateDormName(session, body.name);
    return NextResponse.json({ id: dorm.id, name: dorm.name, inviteCode: dorm.inviteCode });
  });
}
