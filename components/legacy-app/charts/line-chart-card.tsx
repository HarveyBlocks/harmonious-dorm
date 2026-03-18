'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

import { randomColor } from '../constants';
import type { ChartPoint, LineSeries } from '../types';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export function LineChartCard({
  title,
  data,
  series,
  currency = false,
  darkMode = false,
}: {
  title: string;
  data?: ChartPoint[];
  series?: LineSeries[];
  currency?: boolean;
  darkMode?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);

  const normalizedSeries = useMemo(() => {
    if (series && series.length > 0) return series;
    if (data && data.length > 0) return [{ name: title, points: data }];
    return [] as LineSeries[];
  }, [data, series, title]);

  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    normalizedSeries.forEach((line) => line.points.forEach((point) => labels.add(point.label)));
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [normalizedSeries]);

  const seriesWithValues = useMemo(() => normalizedSeries.map((line, index) => {
    const color = randomColor(index);
    const map = new Map(line.points.map((point) => [point.label, point.value]));
    const points = allLabels.map((label) => ({ label, value: map.get(label) || 0 }));
    return { ...line, color, points };
  }), [allLabels, normalizedSeries]);

  const option = useMemo(() => {
    const lineWidth = fullscreen ? 5.2 : 3.8;
    const focusLineWidth = fullscreen ? 7.2 : 5.6;
    const axisTextColor = darkMode ? '#c8dcf7' : '#64748b';
    const tooltipTextColor = darkMode ? '#e2e8f0' : '#0f172a';
    const tooltipBg = darkMode ? 'rgba(2,6,23,0.95)' : 'rgba(255,255,255,0.96)';
    const tooltipBorder = darkMode ? 'rgba(148,163,184,0.35)' : '#e2e8f0';
    const splitLineColor = darkMode ? 'rgba(148,163,184,0.22)' : 'rgba(148,163,184,0.28)';
    return {
      animation: true,
      color: seriesWithValues.map((item) => item.color),
      grid: { left: 46, right: 20, top: 26, bottom: 56, containLabel: true },
      tooltip: {
        trigger: 'axis', confine: true, backgroundColor: tooltipBg, borderColor: tooltipBorder, borderWidth: 1,
        textStyle: { color: tooltipTextColor, fontWeight: 700 },
        formatter: (params: any) => {
          if (!Array.isArray(params) || params.length === 0) return '';
          const lines = [`${params[0].axisValue}`];
          for (const row of params) {
            const value = Number(row.value) || 0;
            lines.push(`${row.marker} ${row.seriesName}: ${currency ? `¥${value.toFixed(2)}` : value}`);
          }
          return lines.join('<br/>');
        },
      },
      legend: { bottom: 6, textStyle: { color: axisTextColor, fontWeight: 700, fontSize: 12 } },
      xAxis: { type: 'category', boundaryGap: false, data: allLabels, axisLine: { lineStyle: { color: 'rgba(148,163,184,0.8)' } }, axisLabel: { color: axisTextColor, fontWeight: 700 } },
      yAxis: {
        type: 'value', min: 0, splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } }, axisLine: { show: false },
        axisLabel: { color: axisTextColor, fontWeight: 700, formatter: (value: number) => (currency ? `¥${Number(value).toFixed(0)}` : `${value}`) },
      },
      series: seriesWithValues.map((line) => ({
        name: line.name, type: 'line', smooth: true, showSymbol: true, symbol: 'circle', symbolSize: fullscreen ? 9 : 7,
        lineStyle: { width: lineWidth }, emphasis: { focus: 'series', lineStyle: { width: focusLineWidth } },
        data: line.points.map((point) => point.value),
      })),
    };
  }, [allLabels, currency, darkMode, fullscreen, seriesWithValues]);

  const renderChart = (isFullscreen: boolean) => (
    <div className={`glass-card rounded-2xl relative ${isFullscreen ? 'h-full p-6 md:p-8 flex flex-col' : 'p-6'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-cyan-500/10 pointer-events-none rounded-2xl" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h4 className="font-black">{title}</h4>
        <button type="button" onClick={() => setFullscreen((prev) => !prev)} className="glass-card p-2 rounded-lg">{isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
      </div>
      {seriesWithValues.length > 0 && allLabels.length > 0 ? <div className={isFullscreen ? 'flex-1 min-h-0' : ''} onClick={() => !isFullscreen && setFullscreen(true)}><ReactECharts option={option} notMerge lazyUpdate style={isFullscreen ? { width: '100%', height: '100%' } : { width: '100%', height: 390 }} /></div> : null}
    </div>
  );

  return (
    <>
      {renderChart(false)}
      {fullscreen ? <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-4 md:p-8"><div className="h-full max-w-7xl mx-auto">{renderChart(true)}</div></div> : null}
    </>
  );
}