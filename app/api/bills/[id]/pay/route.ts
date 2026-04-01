import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { markBillPaid } from '@/lib/services';
import { markPaySchema } from '@/lib/validators';

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: Request, { params }: Params) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { id } = await params;
    const billId = Number(id);
    if (!Number.isInteger(billId) || billId <= 0) {
      throw new ApiError(400, 'Invalid bill id', { code: 'bill.id.invalid' });
    }

    const body = markPaySchema.parse(await parseJson<{ userId?: number; paid?: boolean }>(request));
    const result = await markBillPaid(session, billId, body.userId, body.paid ?? true);
    return NextResponse.json(result);
  });
}
