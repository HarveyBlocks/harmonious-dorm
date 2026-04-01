import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { deleteBill } from '@/lib/services';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(_: Request, { params }: Params) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { id } = await params;
    const billId = Number(id);
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new ApiError(400, 'Invalid bill id', { code: 'bill.id.invalid' });
    }
    const result = await deleteBill(session, billId);
    return NextResponse.json(result);
  });
}
