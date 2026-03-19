import { NextResponse } from 'next/server';

import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getDutyStats } from '@/lib/services';
import { parseStatsQuery } from '@/lib/stats-route-params';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const payload = await getDutyStats(session, parseStatsQuery(request, 'month'));
    return NextResponse.json(payload);
  });
}

