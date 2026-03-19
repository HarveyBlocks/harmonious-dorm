import { NextResponse } from 'next/server';

import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getBillStats } from '@/lib/services';
import { parseStatsQuery } from '@/lib/stats-route-params';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const payload = await getBillStats(session, parseStatsQuery(request, 'quarter'));
    return NextResponse.json(payload);
  });
}

