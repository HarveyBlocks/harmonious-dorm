import { ApiError } from '@/lib/errors';

export type StatsPeriodType = 'month' | 'quarter' | 'year';
export type StatsLineGranularity = 'month' | 'day';

export function parseStatsQuery(request: Request, defaultPeriodType: StatsPeriodType): {
  periodType: StatsPeriodType;
  year: number;
  marker: number;
  lineGranularity: StatsLineGranularity;
} {
  const { searchParams } = new URL(request.url);
  const periodType = (searchParams.get('periodType') || defaultPeriodType) as StatsPeriodType;
  const year = Number(searchParams.get('year') || new Date().getFullYear());
  const marker = Number(searchParams.get('marker') || 1);
  const lineGranularity = (searchParams.get('lineGranularity') || 'day') as StatsLineGranularity;

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

  return { periodType, year, marker, lineGranularity };
}
