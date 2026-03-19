import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { deleteDuty } from '@/lib/services';

interface Params {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: Params) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const dutyId = Number(params.id);
    if (!Number.isInteger(dutyId) || dutyId <= 0) {
      throw new ApiError(400, '值日 ID 无效');
    }
    const result = await deleteDuty(session, dutyId);
    return NextResponse.json(result);
  });
}
