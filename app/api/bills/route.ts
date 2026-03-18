import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { createBill, listBills } from '@/lib/services';
import { createBillSchema } from '@/lib/validators';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '20');
    const cursor = Number(searchParams.get('cursor') || '');
    const bills = await listBills(session, {
      limit: Number.isFinite(limit) ? limit : 20,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
    });
    return NextResponse.json(bills);
  });
}

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = createBillSchema.parse(
      await parseJson<{
        total: number;
        description?: string | null;
        category?: string;
        customCategory?: string | null;
        participants: number[];
        participantWeights?: Array<{ userId: number; weight: number }>;
      }>(request),
    );
    const result = await createBill(session, body);
    return NextResponse.json(result, { status: 201 });
  });
}
