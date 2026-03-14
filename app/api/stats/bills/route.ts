import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getBillStats } from '@/lib/services';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const periodType = (searchParams.get('periodType') || 'quarter') as 'month' | 'quarter' | 'year';
    const year = Number(searchParams.get('year') || new Date().getFullYear());
    const marker = Number(searchParams.get('marker') || 1);
    const lineGranularity = (searchParams.get('lineGranularity') || 'day') as 'month' | 'day';

    if (!['month', 'quarter', 'year'].includes(periodType)) {
      throw new ApiError(400, '请求参数校验失败');
    }
    if (!['month', 'day'].includes(lineGranularity)) {
      throw new ApiError(400, '请求参数校验失败');
    }
    if (!Number.isInteger(year) || year < 1900 || year > 2999) {
      throw new ApiError(400, '请求参数校验失败');
    }
    const markerMax = periodType === 'quarter' ? 4 : 12;
    if (!Number.isInteger(marker) || marker < 1 || marker > markerMax) {
      throw new ApiError(400, '请求参数校验失败');
    }

    const payload = await getBillStats(session, { periodType, year, marker, lineGranularity });
    return NextResponse.json(payload);
  });
}
