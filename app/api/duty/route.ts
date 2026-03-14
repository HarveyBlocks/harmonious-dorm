import { NextResponse } from 'next/server';

import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { listDuties } from '@/lib/services';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const scope = (searchParams.get('scope') || 'week') as 'week' | 'all';
    const limit = Number(searchParams.get('limit') || '20');
    const cursor = Number(searchParams.get('cursor') || '');
    const duties = await listDuties(session, {
      week,
      from,
      to,
      scope,
      limit: Number.isFinite(limit) ? limit : 20,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
    });
    return NextResponse.json(duties);
  });
}
