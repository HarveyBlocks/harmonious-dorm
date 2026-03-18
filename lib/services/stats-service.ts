import type { SessionUser } from '@/lib/types';
import { ensureSessionUser } from './helpers';
import { prisma } from '@/lib/db';

type PeriodType = 'month' | 'quarter' | 'year';
type LineGranularity = 'month' | 'day';

function inPeriod(date: Date, periodType: PeriodType, year: number, marker: number): boolean {
  if (periodType === 'year') {
    return date.getFullYear() === year;
  }
  if (periodType === 'month') {
    return date.getFullYear() === year && date.getMonth() + 1 === marker;
  }
  const startMonth = (marker - 1) * 3 + 1;
  return date.getFullYear() === year && date.getMonth() + 1 >= startMonth && date.getMonth() + 1 <= startMonth + 2;
}

function dateLabel(date: Date, granularity: LineGranularity): string {
  if (granularity === 'month') {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
  }
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

export async function getBillStats(
  session: SessionUser,
  input: { periodType: PeriodType; year: number; marker: number; lineGranularity: LineGranularity },
) {
  await ensureSessionUser(session);
  const rows = await prisma.bill.findMany({
    where: { dormId: session.dormId },
    select: {
      totalAmount: true,
      category: true,
      customCategory: true,
      createdAt: true,
    },
  });
  const filtered = rows.filter((item) => inPeriod(item.createdAt, input.periodType, input.year, input.marker));

  const pieMap = new Map<string, number>();
  const lineMap = new Map<string, number>();
  const categoryLineMap = new Map<string, Map<string, number>>();
  const lineLabels = new Set<string>();
  for (const item of filtered) {
    const categoryKey = item.customCategory || item.category || 'other';
    pieMap.set(categoryKey, (pieMap.get(categoryKey) || 0) + item.totalAmount);
    const key = dateLabel(item.createdAt, input.lineGranularity);
    lineLabels.add(key);
    lineMap.set(key, (lineMap.get(key) || 0) + item.totalAmount);
    const categoryBucket = categoryLineMap.get(categoryKey) || new Map<string, number>();
    categoryBucket.set(key, (categoryBucket.get(key) || 0) + item.totalAmount);
    categoryLineMap.set(categoryKey, categoryBucket);
  }
  const sortedLabels = [...lineLabels].sort((a, b) => a.localeCompare(b));
  const topCategories = [...pieMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
  const categoryLineSeries = topCategories.map((name) => {
    const bucket = categoryLineMap.get(name) || new Map<string, number>();
    return {
      name,
      points: sortedLabels.map((label) => ({
        label,
        value: bucket.get(label) || 0,
      })),
    };
  });

  return {
    pieData: [...pieMap.entries()].map(([label, value]) => ({ label, value })),
    lineData: [...lineMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value })),
    categoryLineSeries,
  };
}

export async function getDutyStats(
  session: SessionUser,
  input: { periodType: PeriodType; year: number; marker: number; lineGranularity: LineGranularity },
) {
  await ensureSessionUser(session);
  const rows = await prisma.duty.findMany({
    where: { dormId: session.dormId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const filtered = rows.filter((item) => inPeriod(new Date(`${item.date}T00:00:00`), input.periodType, input.year, input.marker));

  let completed = 0;
  const lineMap = new Map<string, number>();
  const memberMap = new Map<string, number>();
  const memberLineMap = new Map<string, Map<string, number>>();
  const lineLabels = new Set<string>();
  for (const item of filtered) {
    const key = dateLabel(new Date(`${item.date}T00:00:00`), input.lineGranularity);
    lineLabels.add(key);
    if (item.completed) {
      completed += 1;
      memberMap.set(item.user.name, (memberMap.get(item.user.name) || 0) + 1);
      const memberBucket = memberLineMap.get(item.user.name) || new Map<string, number>();
      memberBucket.set(key, (memberBucket.get(key) || 0) + 1);
      memberLineMap.set(item.user.name, memberBucket);
    }
    lineMap.set(key, (lineMap.get(key) || 0) + 1);
  }
  const sortedLabels = [...lineLabels].sort((a, b) => a.localeCompare(b));
  const topMembers = [...memberMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name]) => name);
  const memberLineSeries = topMembers.map((name) => {
    const bucket = memberLineMap.get(name) || new Map<string, number>();
    return {
      name,
      points: sortedLabels.map((label) => ({
        label,
        value: bucket.get(label) || 0,
      })),
    };
  });

  return {
    pieData: [
      { label: 'completed', value: completed },
      { label: 'pending', value: Math.max(filtered.length - completed, 0) },
    ],
    memberPieData: [...memberMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    lineData: [...lineMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ label, value })),
    memberLineSeries,
  };
}

