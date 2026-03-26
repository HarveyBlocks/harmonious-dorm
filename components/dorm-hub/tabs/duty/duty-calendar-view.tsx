import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import DatePicker from 'react-datepicker';

type DutyRow = {
  dutyId: number;
  date: string;
  userId: number;
  userName: string;
  task: string;
  completed: boolean;
};

type MemberRow = {
  id: number;
  name: string;
};

type Props = {
  rows: DutyRow[];
  members: MemberRow[];
  language?: 'zh-CN' | 'zh-TW' | 'en' | 'fr';
  legendTitle: string;
  monthKey: string;
  onMonthKeyChange: (value: string) => void;
};

const DOT_COLORS = ['#ef4444', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899'];
const DUTY_TOOLTIP_WIDTH = 280;
const DUTY_TOOLTIP_HEIGHT = 260;
const DUTY_TOOLTIP_MARGIN = 8;
const DUTY_TOOLTIP_OFFSET = 4;

type ParsedDate = { year: number; month: number; day: number };

function parseDate(date: string): ParsedDate | null {
  const parts = date.split('-').map((item) => Number(item));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return { year, month, day };
}

function parseMonthKey(monthKey: string): { year: number; month: number } {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  return { year, month };
}

function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function shiftMonth(monthKey: string, deltaMonth: number): string {
  const { year, month } = parseMonthKey(monthKey);
  const next = new Date(year, month - 1 + deltaMonth, 1);
  return formatMonthKey(next.getFullYear(), next.getMonth() + 1);
}

function resolveTooltipPosition(clientX: number, clientY: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(DUTY_TOOLTIP_MARGIN, clientX + DUTY_TOOLTIP_OFFSET), window.innerWidth - DUTY_TOOLTIP_WIDTH - DUTY_TOOLTIP_MARGIN),
    y: Math.min(Math.max(DUTY_TOOLTIP_MARGIN, clientY + DUTY_TOOLTIP_OFFSET), window.innerHeight - DUTY_TOOLTIP_HEIGHT - DUTY_TOOLTIP_MARGIN),
  };
}

function weekdayLabels(language?: 'zh-CN' | 'zh-TW' | 'en' | 'fr'): string[] {
  if (language === 'en') return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (language === 'fr') return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  if (language === 'zh-TW') return ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
}

function buildGridDays(year: number, month: number): Array<{ year: number; month: number; day: number; inMonth: boolean }> {
  const first = new Date(year, month - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const cells: Array<{ year: number; month: number; day: number; inMonth: boolean }> = [];

  for (let i = startWeekday - 1; i >= 0; i -= 1) cells.push({ year, month: month - 1, day: prevMonthDays - i, inMonth: false });
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ year, month, day, inMonth: true });
  while (cells.length % 7 !== 0) cells.push({ year, month: month + 1, day: cells.length - (startWeekday + daysInMonth) + 1, inMonth: false });
  return cells;
}

function completedText(language?: 'zh-CN' | 'zh-TW' | 'en' | 'fr'): { done: string; pending: string } {
  if (language === 'en') return { done: 'Completed', pending: 'Pending' };
  if (language === 'fr') return { done: 'Termine', pending: 'En attente' };
  if (language === 'zh-TW') return { done: '已完成', pending: '未完成' };
  return { done: '已完成', pending: '未完成' };
}

export function DutyCalendarView({ rows, members, language, legendTitle, monthKey, onMonthKeyChange }: Props) {
  const { year, month } = useMemo(() => parseMonthKey(monthKey), [monthKey]);
  const [hoverDuties, setHoverDuties] = useState<DutyRow[] | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const memberColorMap = useMemo(() => {
    const map = new Map<number, string>();
    members.forEach((member, index) => map.set(member.id, DOT_COLORS[index % DOT_COLORS.length]));
    return map;
  }, [members]);

  const monthRows = useMemo(
    () => rows.filter((row) => {
      const parsed = parseDate(row.date);
      return Boolean(parsed && parsed.year === year && parsed.month === month);
    }),
    [rows, month, year],
  );

  const rowsByDay = useMemo(() => {
    const map = new Map<number, DutyRow[]>();
    monthRows.forEach((row) => {
      const parsed = parseDate(row.date);
      if (!parsed) return;
      const list = map.get(parsed.day) || [];
      list.push(row);
      map.set(parsed.day, list);
    });
    return map;
  }, [monthRows]);

  const selectedMonthDate = useMemo(() => {
    const p = parseMonthKey(monthKey);
    return new Date(p.year, p.month - 1, 1);
  }, [monthKey]);

  const labels = weekdayLabels(language);
  const statusText = completedText(language);
  const cells = useMemo(() => buildGridDays(year, month), [month, year]);

  const moveTooltip = (clientX: number, clientY: number) => {
    if (!tooltipRef.current) return;
    const pos = resolveTooltipPosition(clientX, clientY);
    tooltipRef.current.style.left = `${pos.x}px`;
    tooltipRef.current.style.top = `${pos.y}px`;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1.5">
        {labels.map((label) => <div key={label} className="text-sm font-black text-muted text-center py-1">{label}</div>)}
        {cells.map((cell) => {
          const duties = cell.inMonth ? rowsByDay.get(cell.day) || [] : [];
          return (
            <div
              key={`${cell.year}-${cell.month}-${cell.day}`}
              className={`relative glass-card rounded-xl border p-1.5 min-h-[68px] ${cell.inMonth ? 'border-white/20' : 'border-white/10 opacity-70'}`}
              onMouseEnter={(event) => {
                if (!duties.length) return;
                setHoverDuties(duties);
                requestAnimationFrame(() => moveTooltip(event.clientX, event.clientY));
              }}
              onMouseMove={(event) => {
                if (!duties.length) return;
                moveTooltip(event.clientX, event.clientY);
              }}
              onMouseLeave={() => setHoverDuties(null)}
            >
              <p className={`text-lg font-bold leading-none text-muted ${cell.inMonth ? '' : 'text-muted'}`}>{cell.day}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {duties.slice(0, 8).map((duty) => (
                  <span
                    key={duty.dutyId}
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: memberColorMap.get(duty.userId) || '#94a3b8',
                      opacity: duty.completed ? 0.38 : 1,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {hoverDuties && typeof document !== 'undefined'
        ? createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[220] w-[260px] rounded-xl border border-white/30 bg-[var(--card-bg)]/95 p-3 shadow-2xl floating-menu"
          >
            <div className="space-y-2">
              {hoverDuties.map((duty) => (
                <div key={duty.dutyId} className="rounded-lg border border-white/15 bg-white/5 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-black">{duty.date}</p>
                    <span className={`text-[10px] font-black ${duty.completed ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {duty.completed ? statusText.done : statusText.pending}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: memberColorMap.get(duty.userId) || '#94a3b8' }} />
                    <p className="text-[11px] font-bold truncate">{duty.userName}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-muted leading-4 break-words">{duty.task || '-'}</p>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )
        : null}

      <div className="flex items-start justify-between gap-4 rounded-xl border border-white/20 bg-white/5 p-4 duty-member-legend">
        <div>
          <p className="text-base font-black text-muted mb-3.5">{legendTitle}</p>
          <div className="flex flex-wrap gap-5">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: memberColorMap.get(member.id) || '#94a3b8' }} />
                <span className="text-base font-black">{member.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="inline-flex items-center gap-1">
          <button type="button" className="h-8 w-8 inline-flex items-center justify-center text-muted hover:text-[var(--accent)]" onClick={() => onMonthKeyChange(shiftMonth(monthKey, -12))}>
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button type="button" className="h-8 w-8 inline-flex items-center justify-center text-muted hover:text-[var(--accent)]" onClick={() => onMonthKeyChange(shiftMonth(monthKey, -1))}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <DatePicker
            selected={selectedMonthDate}
            onChange={(date) => {
              if (!date) return;
              onMonthKeyChange(formatMonthKey(date.getFullYear(), date.getMonth() + 1));
            }}
            showMonthYearPicker
            dateFormat="yyyy-MM"
            className="h-8 w-[104px] px-2 rounded-lg glass-card custom-field text-sm font-bold"
            popperPlacement="top"
          />
          <button type="button" className="h-8 w-8 inline-flex items-center justify-center text-muted hover:text-[var(--accent)]" onClick={() => onMonthKeyChange(shiftMonth(monthKey, 1))}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button type="button" className="h-8 w-8 inline-flex items-center justify-center text-muted hover:text-[var(--accent)]" onClick={() => onMonthKeyChange(shiftMonth(monthKey, 12))}>
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}