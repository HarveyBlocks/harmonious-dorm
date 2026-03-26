
import { useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';

import { randomColor } from '../ui-constants';
import type { ChartPoint } from '../ui-types';

function buildSlices(data: ChartPoint[]) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let acc = 0;
  return {
    total,
    slices: data.map((item, index) => {
      const start = (acc / (total || 1)) * Math.PI * 2 - Math.PI / 2;
      acc += item.value;
      const end = (acc / (total || 1)) * Math.PI * 2 - Math.PI / 2;
      const mid = (start + end) / 2;
      const largeArcFlag = end - start > Math.PI ? 1 : 0;
      const r = 120;
      const cx = 150;
      const cy = 150;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      return { ...item, sliceKey: `${index}-${item.label}-${item.value}`, path, mid, color: randomColor(index) };
    }),
  };
}

export function PieChartCard({
  title,
  data,
  currency = false,
  darkMode = false,
}: {
  title: string;
  data: ChartPoint[];
  currency?: boolean;
  darkMode?: boolean;
}) {
  const [hovered, setHovered] = useState<{ key: string; label: string; value: number; x: number; y: number } | null>(null);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { slices, total } = buildSlices(data);
  const activeKey = focusedKey || hovered?.key || null;

  const renderChart = (isFullscreen: boolean) => (
    <div className={`glass-card rounded-2xl relative ${isFullscreen ? 'h-full p-8' : 'p-6'}`} ref={containerRef}>
      <div className="absolute inset-0 card-overlay-surface pointer-events-none rounded-2xl" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h4 className="font-black">{title}</h4>
        <button type="button" onClick={() => setFullscreen((prev) => !prev)} className="glass-card p-2 rounded-lg">
          {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      {total <= 0 ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-center">
          <div className="cursor-zoom-in" onClick={() => setFullscreen(true)}>
            <svg className={`w-full max-w-[380px] h-auto ${darkMode ? 'drop-shadow-[0_6px_20px_rgba(2,6,23,0.65)]' : 'drop-shadow-[0_6px_20px_rgba(15,23,42,0.25)]'}`} viewBox="0 0 300 300">
              {slices.map((slice) => {
                const isActive = !activeKey || activeKey === slice.sliceKey;
                const shift = activeKey === slice.sliceKey ? 7 : 0;
                return (
                  <path
                    key={slice.sliceKey}
                    d={slice.path}
                    fill={slice.color}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={activeKey === slice.sliceKey ? 2.5 : 1.2}
                    style={{ opacity: isActive ? 1 : 0.35, transform: `translate(${Math.cos(slice.mid) * shift}px, ${Math.sin(slice.mid) * shift}px)`, transformOrigin: '150px 150px', transition: 'opacity 160ms ease, transform 160ms ease, stroke-width 160ms ease' }}
                    onMouseEnter={() => setFocusedKey(slice.sliceKey)}
                    onMouseMove={(event) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setHovered({ key: slice.sliceKey, label: slice.label, value: slice.value, x: event.clientX - rect.left, y: event.clientY - rect.top });
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setFocusedKey(null);
                    }}
                  />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2 text-sm">
            {slices.map((slice) => {
              const isActive = !activeKey || activeKey === slice.sliceKey;
              return (
                <div key={slice.sliceKey} className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors" style={{ opacity: isActive ? 1 : 0.4 }} onMouseEnter={() => setFocusedKey(slice.sliceKey)} onMouseLeave={() => setFocusedKey(null)}>
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span>{slice.label}: {currency ? `¥${slice.value.toFixed(2)}` : slice.value} ({total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {hovered ? (
        <div className="light-tooltip pointer-events-none absolute z-20 rounded-xl shadow-xl border px-3 py-2 text-xs font-bold pie-dark-tooltip" style={{ left: hovered.x + 12, top: hovered.y + 12, background: darkMode ? "rgba(6, 12, 22, 0.96)" : "rgba(255,255,255,0.96)", color: darkMode ? "#e2e8f0" : "#0f172a", borderColor: darkMode ? "rgba(148,163,184,0.35)" : "#e2e8f0" }}>
          <div>{hovered.label}</div>
          <div>{currency ? `¥${hovered.value.toFixed(2)}` : hovered.value}</div>
          <div>{total > 0 ? `${((hovered.value / total) * 100).toFixed(2)}%` : '0%'}</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {renderChart(false)}
      {fullscreen ? <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-4 md:p-8"><div className="h-full max-w-7xl mx-auto">{renderChart(true)}</div></div> : null}
    </>
  );
}

