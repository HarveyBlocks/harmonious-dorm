'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Bell,
  Moon,
  BookOpen,
  Coffee,
  Music,
  Users,
  MessageSquare,
  Send,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Circle,
  CheckCircle2,
  Settings,
  Trash2,
  Copy,
  MoreHorizontal,
  Check,
  Maximize2,
  X,
  Camera,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { apiRequest } from '@/lib/client-api';
import { I18N, LANG_OPTIONS, type LanguageCode } from '@/lib/i18n';
import { BILL_CATEGORY_COLOR, STATE_DOT, STATUS_COLOR } from '@/lib/theme/status-colors';
import type { BillSummary, CursorPage, DormState, DutyItem, MePayload, NotificationPayload } from '@/lib/types';

type ActiveTab = 'dashboard' | 'duty' | 'wallet' | 'chat' | 'notifications' | 'settings';

type ChatMessage = {
  id: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};
type RenderedChatMessage = ChatMessage & {
  isStatusMessage: boolean;
  localizedContent: string;
  avatar: string;
};

type NotificationFilter = 'all' | 'unread' | 'read';
type PeriodType = 'month' | 'quarter' | 'year';
type LineGranularity = 'month' | 'day';
const CHAT_PAGE_LIMIT = 20;
const BILL_PAGE_LIMIT = 8;
const BILL_AUTO_FILL_UNPAID = 10;
const BILL_AUTO_FILL_TOTAL_GROUPS = 4;
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function fakeAvatar(id: number): string {
  return `https://picsum.photos/seed/user-${id}/100/100`;
}

function resolveAvatar(path: string | null | undefined, id: number): string {
  if (!path) return fakeAvatar(id);
  return path.startsWith('/') ? path : `/${path}`;
}

function todayText(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, '0');
  const d = `${now.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function currentQuarter(): number {
  return Math.floor(new Date().getMonth() / 3) + 1;
}

function monthHeader(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}年${`${d.getMonth() + 1}`.padStart(2, '0')}月`;
}

function weekStartLabel(isoDate: string): string {
  const base = new Date(`${isoDate}T00:00:00`);
  const day = base.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - diff);
  return `周起始 ${start.getFullYear()}-${`${start.getMonth() + 1}`.padStart(2, '0')}-${`${start.getDate()}`.padStart(2, '0')}`;
}

function mapPathToTab(path: string): ActiveTab {
  if (path.includes('settings')) return 'settings';
  if (path.includes('notifications')) return 'notifications';
  if (path.includes('chat')) return 'chat';
  if (path.includes('duty')) return 'duty';
  if (path.includes('bill')) return 'wallet';
  if (path.includes('profile')) return 'settings';
  return 'dashboard';
}

function mapTabToPath(tab: ActiveTab): string {
  if (tab === 'settings') return '/settings';
  if (tab === 'notifications') return '/notifications';
  if (tab === 'chat') return '/chat';
  if (tab === 'duty') return '/duty';
  if (tab === 'wallet') return '/bills';
  return '/';
}

function isThisMonth(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function formatPaidInfo(lang: LanguageCode, paid: number, total: number): string {
  if (lang === 'en') return `Paid ${paid}/${total}`;
  if (lang === 'fr') return `Payé ${paid}/${total}`;
  if (lang === 'zh-TW') return `已付 ${paid}/${total}`;
  return `已付 ${paid}/${total}`;
}

function unnamedBill(lang: LanguageCode): string {
  if (lang === 'en') return 'Untitled bill';
  if (lang === 'fr') return 'Facture sans titre';
  if (lang === 'zh-TW') return '未命名帳單';
  return '未命名账单';
}

const BILL_CATEGORIES = ['电费', '水费', '网费', '日用品', '其他', '自定义'];
const BILL_CATEGORY_CUSTOM = '__custom__';
const STATUS_OPTIONS: DormState[] = ['外出', '学习', '睡觉', '游戏'];

function stateLabel(lang: LanguageCode, state: DormState): string {
  if (lang === 'en') {
    if (state === '学习') return 'Studying';
    if (state === '睡觉') return 'Sleeping';
    if (state === '游戏') return 'Gaming';
    return 'Out';
  }
  if (lang === 'fr') {
    if (state === '学习') return 'Etude';
    if (state === '睡觉') return 'Sommeil';
    if (state === '游戏') return 'Jeu';
    return 'Sorti';
  }
  if (lang === 'zh-TW') {
    if (state === '学习') return '學習';
    if (state === '睡觉') return '睡覺';
    if (state === '游戏') return '遊戲';
    return '外出';
  }
  return state;
}

function parseStatusSystemMessage(text: string): { userName: string; state: DormState } | null {
  const hit = text.match(/^(.+?)现在是(学习|睡觉|游戏|外出)状态$/) || text.match(/^(.+?) 的状态改变了：(学习|睡觉|游戏|外出)$/);
  if (!hit) return null;
  return {
    userName: hit[1],
    state: hit[2] as DormState,
  };
}

function categoryLabel(lang: LanguageCode, category: string): string {
  if (lang === 'en') {
    if (category === '电费') return 'Electricity';
    if (category === '水费') return 'Water';
    if (category === '网费') return 'Internet';
    if (category === '日用品') return 'Daily Supplies';
    if (category === '其他') return 'Other';
    if (category === BILL_CATEGORY_CUSTOM) return 'Custom';
    return category;
  }
  if (lang === 'fr') {
    if (category === '电费') return 'Electricite';
    if (category === '水费') return 'Eau';
    if (category === '网费') return 'Internet';
    if (category === '日用品') return 'Articles courants';
    if (category === '其他') return 'Autre';
    if (category === BILL_CATEGORY_CUSTOM) return 'Personnalisee';
    return category;
  }
  if (lang === 'zh-TW') {
    if (category === '电费') return '電費';
    if (category === '水费') return '水費';
    if (category === '网费') return '網費';
    if (category === '日用品') return '日用品';
    if (category === '其他') return '其他';
    if (category === BILL_CATEGORY_CUSTOM) return '自訂';
    return category;
  }
  if (category === BILL_CATEGORY_CUSTOM) return '自定义';
  return category;
}

function localizeServerText(lang: LanguageCode, text: string): string {
  const staticMap: Record<string, Record<LanguageCode, string>> = {
    新账单已发布: {
      'zh-CN': '新账单已发布',
      'zh-TW': '新帳單已發布',
      fr: 'Nouvelle facture publiée',
      en: 'New bill published',
    },
    账单支付状态更新: {
      'zh-CN': '账单支付状态更新',
      'zh-TW': '帳單支付狀態更新',
      fr: 'Statut de paiement mis à jour',
      en: 'Bill payment status updated',
    },
    账单支付已撤销: {
      'zh-CN': '账单支付已撤销',
      'zh-TW': '帳單支付已撤銷',
      fr: 'Paiement de facture annulé',
      en: 'Bill payment reverted',
    },
    账单已全部支付: {
      'zh-CN': '账单已全部支付',
      'zh-TW': '帳單已全部支付',
      fr: 'Facture entièrement payée',
      en: 'Bill fully paid',
    },
    该账单所有参与成员已完成支付: {
      'zh-CN': '该账单所有参与成员已完成支付',
      'zh-TW': '該帳單所有參與成員已完成支付',
      fr: 'Tous les participants ont payé cette facture',
      en: 'All participants have completed payment',
    },
    值日安排已发布: {
      'zh-CN': '值日安排已发布',
      'zh-TW': '值日安排已發布',
      fr: 'Corvée assignée',
      en: 'Duty assignment published',
    },
    值日状态已恢复: {
      'zh-CN': '值日状态已恢复',
      'zh-TW': '值日狀態已恢復',
      fr: 'Statut de corvée rétabli',
      en: 'Duty status restored',
    },
    值日任务已完成: {
      'zh-CN': '值日任务已完成',
      'zh-TW': '值日任務已完成',
      fr: 'Corvée terminée',
      en: 'Duty completed',
    },
    宿舍信息已更新: {
      'zh-CN': '宿舍信息已更新',
      'zh-TW': '宿舍資訊已更新',
      fr: 'Informations du dortoir mises à jour',
      en: 'Dorm info updated',
    },
    舍长权限已移交: {
      'zh-CN': '舍长权限已移交',
      'zh-TW': '舍長權限已移交',
      fr: 'Droits du chef transférés',
      en: 'Leader rights transferred',
    },
    有成员标记了已支付: {
      'zh-CN': '有成员标记了已支付',
      'zh-TW': '有成員標記了已支付',
      fr: 'Un membre a marqué comme payé',
      en: 'A member marked as paid',
    },
    有成员撤销了已支付: {
      'zh-CN': '有成员撤销了已支付',
      'zh-TW': '有成員撤銷了已支付',
      fr: 'Un membre a annulé le paiement',
      en: 'A member reverted payment',
    },
    有成员将值日恢复为未完成: {
      'zh-CN': '有成员将值日恢复为未完成',
      'zh-TW': '有成員將值日恢復為未完成',
      fr: 'Un membre a rouvert une corvée',
      en: 'A member reopened a duty',
    },
    有成员完成了值日任务: {
      'zh-CN': '有成员完成了值日任务',
      'zh-TW': '有成員完成了值日任務',
      fr: 'Un membre a terminé une corvée',
      en: 'A member completed a duty',
    },
    未命名账单: {
      'zh-CN': '未命名账单',
      'zh-TW': '未命名帳單',
      fr: 'Facture sans titre',
      en: 'Untitled bill',
    },
  };
  const mapped = staticMap[text];
  if (mapped) {
    return mapped[lang];
  }

  const statusChanged = parseStatusSystemMessage(text);
  if (statusChanged) {
    const { userName, state } = statusChanged;
    if (lang === 'en') return `${userName} is now ${stateLabel(lang, state)}`;
    if (lang === 'fr') return `${userName} est maintenant en mode ${stateLabel(lang, state)}`;
    if (lang === 'zh-TW') return `${userName} 現在是 ${stateLabel(lang, state)} 狀態`;
    return `${userName}现在是${stateLabel(lang, state)}状态`;
  }

  const renamedDorm = text.match(/^宿舍名称已改为 (.+)$/);
  if (renamedDorm) {
    const name = renamedDorm[1];
    if (lang === 'en') return `Dorm name changed to ${name}`;
    if (lang === 'fr') return `Nom du dortoir changé en ${name}`;
    if (lang === 'zh-TW') return `宿舍名稱已改為 ${name}`;
    return text;
  }

  const transferLeader = text.match(/^(.+) 已将舍长权限移交给 (.+)$/);
  if (transferLeader) {
    const from = transferLeader[1];
    const to = transferLeader[2];
    if (lang === 'en') return `${from} transferred leader rights to ${to}`;
    if (lang === 'fr') return `${from} a transféré les droits de chef à ${to}`;
    if (lang === 'zh-TW') return `${from} 已將舍長權限移交給 ${to}`;
    return text;
  }

  const assignDuty = text.match(/^已安排 (.+) 的值日任务$/);
  if (assignDuty) {
    const date = assignDuty[1];
    if (lang === 'en') return `Duty assigned for ${date}`;
    if (lang === 'fr') return `Corvée assignée pour ${date}`;
    if (lang === 'zh-TW') return `已安排 ${date} 的值日任務`;
    return text;
  }

  const chatTitle = text.match(/^(.+) 发来新消息$/);
  if (chatTitle) {
    const userName = chatTitle[1];
    if (lang === 'en') return `New message from ${userName}`;
    if (lang === 'fr') return `Nouveau message de ${userName}`;
    if (lang === 'zh-TW') return `${userName} 發來新訊息`;
    return text;
  }

  return text;
}

function randomColor(index: number): string {
  const palette = ['#2563eb', '#06b6d4', '#f43f5e', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316', '#10b981', '#e11d48'];
  return palette[index % palette.length];
}

function mergeChatMessages(base: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map<number, ChatMessage>();
  for (const item of base) {
    map.set(item.id, item);
  }
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

type ChartPoint = { label: string; value: number };
type LineSeries = { name: string; points: ChartPoint[] };

function PieChartCard({ title, data, currency = false }: { title: string; data: ChartPoint[]; currency?: boolean }) {
  const [hovered, setHovered] = useState<{ label: string; value: number; x: number; y: number } | null>(null);
  const [focusedLabel, setFocusedLabel] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let acc = 0;
  const slices = data.map((item, index) => {
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
    return { path, color: randomColor(index), mid, ...item };
  });
  const activeLabel = focusedLabel || hovered?.label || null;

  const renderChart = (isFullscreen: boolean) => (
    <div className={`glass-card rounded-2xl relative ${isFullscreen ? 'h-full p-8' : 'p-6'}`} ref={containerRef}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-slate-500/10 pointer-events-none rounded-2xl" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h4 className="font-black">{title}</h4>
        <button type="button" onClick={() => setFullscreen((prev) => !prev)} className="glass-card p-2 rounded-lg">
          {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      {total <= 0 ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-center">
          <div className="cursor-zoom-in" onClick={() => setFullscreen(true)}>
            <svg className="w-full max-w-[380px] h-auto drop-shadow-[0_6px_20px_rgba(15,23,42,0.25)]" viewBox="0 0 300 300">
              {slices.map((slice) => {
                const isActive = !activeLabel || activeLabel === slice.label;
                const shift = activeLabel === slice.label ? 7 : 0;
                return (
                  <path
                    key={slice.label}
                    d={slice.path}
                    fill={slice.color}
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={activeLabel === slice.label ? 2.5 : 1.2}
                    style={{
                      opacity: isActive ? 1 : 0.35,
                      transform: `translate(${Math.cos(slice.mid) * shift}px, ${Math.sin(slice.mid) * shift}px)`,
                      transformOrigin: '150px 150px',
                      transition: 'opacity 160ms ease, transform 160ms ease, stroke-width 160ms ease',
                    }}
                    onMouseEnter={() => setFocusedLabel(slice.label)}
                    onMouseMove={(event) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setHovered({
                        label: slice.label,
                        value: slice.value,
                        x: event.clientX - rect.left,
                        y: event.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => {
                      setHovered(null);
                      setFocusedLabel(null);
                    }}
                  />
                );
              })}
            </svg>
          </div>
          <div className="space-y-2 text-sm">
            {slices.map((slice) => {
              const isActive = !activeLabel || activeLabel === slice.label;
              return (
                <div
                  key={slice.label}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors"
                  style={{ opacity: isActive ? 1 : 0.4 }}
                  onMouseEnter={() => setFocusedLabel(slice.label)}
                  onMouseLeave={() => setFocusedLabel(null)}
                >
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
                  <span>
                    {slice.label}: {currency ? `¥${slice.value.toFixed(2)}` : slice.value} ({total > 0 ? ((slice.value / total) * 100).toFixed(1) : '0.0'}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {hovered ? (
        <div
          className="pointer-events-none absolute z-20 rounded-xl bg-white/96 text-slate-900 shadow-xl border border-slate-200 px-3 py-2 text-xs font-bold"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
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
      {fullscreen ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-4 md:p-8">
          <div className="h-full max-w-7xl mx-auto">{renderChart(true)}</div>
        </div>
      ) : null}
    </>
  );
}

function LineChartCard({
  title,
  data,
  series,
  currency = false,
}: {
  title: string;
  data?: ChartPoint[];
  series?: LineSeries[];
  currency?: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const normalizedSeries = useMemo(() => {
    if (series && series.length > 0) return series;
    if (data && data.length > 0) return [{ name: title, points: data }];
    return [];
  }, [data, series, title]);
  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    normalizedSeries.forEach((line) => line.points.forEach((point) => labels.add(point.label)));
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [normalizedSeries]);
  const seriesWithValues = useMemo(() => {
    return normalizedSeries.map((line, index) => {
      const color = randomColor(index);
      const map = new Map(line.points.map((point) => [point.label, point.value]));
      const points = allLabels.map((label) => ({ label, value: map.get(label) || 0 }));
      return { ...line, color, points };
    });
  }, [allLabels, normalizedSeries]);
  const option = useMemo(() => {
    const lineWidth = fullscreen ? 5.2 : 3.8;
    const focusLineWidth = fullscreen ? 7.2 : 5.6;
    return {
      animation: true,
      color: seriesWithValues.map((item) => item.color),
      grid: {
        left: 46,
        right: 20,
        top: 26,
        bottom: 56,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#0f172a',
          fontWeight: 700,
        },
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
      legend: {
        bottom: 6,
        textStyle: {
          color: '#64748b',
          fontWeight: 700,
          fontSize: 12,
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: allLabels,
        axisLine: { lineStyle: { color: 'rgba(148,163,184,0.8)' } },
        axisLabel: { color: '#64748b', fontWeight: 700 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        splitLine: { lineStyle: { color: 'rgba(148,163,184,0.28)', type: 'dashed' } },
        axisLine: { show: false },
        axisLabel: {
          color: '#64748b',
          fontWeight: 700,
          formatter: (value: number) => (currency ? `¥${Number(value).toFixed(0)}` : `${value}`),
        },
      },
      series: seriesWithValues.map((line) => ({
        name: line.name,
        type: 'line',
        smooth: true,
        showSymbol: true,
        symbol: 'circle',
        symbolSize: fullscreen ? 9 : 7,
        lineStyle: {
          width: lineWidth,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: focusLineWidth,
          },
        },
        data: line.points.map((point) => point.value),
      })),
    };
  }, [allLabels, currency, fullscreen, seriesWithValues]);

  const renderChart = (isFullscreen: boolean) => (
    <div className={`glass-card rounded-2xl relative ${isFullscreen ? 'h-full p-6 md:p-8 flex flex-col' : 'p-6'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-cyan-500/10 pointer-events-none rounded-2xl" />
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h4 className="font-black">{title}</h4>
        <button type="button" onClick={() => setFullscreen((prev) => !prev)} className="glass-card p-2 rounded-lg">
          {isFullscreen ? <X className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
      {seriesWithValues.length > 0 && allLabels.length > 0 ? (
        <div className={isFullscreen ? 'flex-1 min-h-0' : ''} onClick={() => !isFullscreen && setFullscreen(true)}>
          <ReactECharts
            option={option}
            notMerge
            lazyUpdate
            style={isFullscreen ? { width: '100%', height: '100%' } : { width: '100%', height: 390 }}
          />
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {renderChart(false)}
      {fullscreen ? (
        <div className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-sm p-4 md:p-8">
          <div className="h-full max-w-7xl mx-auto">{renderChart(true)}</div>
        </div>
      ) : null}
    </>
  );
}

export default function LegacyDormApp() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => mapPathToTab(pathname || '/'));
  const [selectedState, setSelectedState] = useState<DormState>('外出');
  const [assignUserId, setAssignUserId] = useState<number | null>(null);
  const [assignDate, setAssignDate] = useState(todayText());
  const [billTotal, setBillTotal] = useState('');
  const [billDescription, setBillDescription] = useState('');
  const [billCategory, setBillCategory] = useState('电费');
  const [customCategory, setCustomCategory] = useState('');
  const [participants, setParticipants] = useState<number[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [chatWindowMode, setChatWindowMode] = useState(false);
  const [chatOlderCursor, setChatOlderCursor] = useState<number | null>(null);
  const [chatNewerCursor, setChatNewerCursor] = useState<number | null>(null);
  const [chatHasOlder, setChatHasOlder] = useState(true);
  const [chatHasNewer, setChatHasNewer] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilter>('all');
  const [notificationSelectAll, setNotificationSelectAll] = useState(false);
  const [notificationIncludeIds, setNotificationIncludeIds] = useState<Set<number>>(new Set());
  const [notificationExcludeIds, setNotificationExcludeIds] = useState<Set<number>>(new Set());
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [billPeriodType, setBillPeriodType] = useState<PeriodType>('month');
  const [billYear, setBillYear] = useState(`${new Date().getFullYear()}`);
  const [billPeriodMarker, setBillPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [billLineGranularity, setBillLineGranularity] = useState<LineGranularity>('day');
  const [dutyPeriodType, setDutyPeriodType] = useState<PeriodType>('month');
  const [dutyYear, setDutyYear] = useState(`${new Date().getFullYear()}`);
  const [dutyPeriodMarker, setDutyPeriodMarker] = useState<number>(new Date().getMonth() + 1);
  const [dutyLineGranularity, setDutyLineGranularity] = useState<LineGranularity>('day');
  const [showAllDoneDuty, setShowAllDoneDuty] = useState(false);
  const [noticePopup, setNoticePopup] = useState<{ title: string; content: string } | null>(null);

  const [name, setName] = useState('');
  const [language, setLanguage] = useState<LanguageCode>('zh-CN');
  const [dormNameInput, setDormNameInput] = useState('');
  const [targetLeaderId, setTargetLeaderId] = useState<number | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatMessageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const notificationListRef = useRef<HTMLDivElement>(null);
  const billUnpaidListRef = useRef<HTMLDivElement>(null);
  const billPaidListRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const chatAutoScrolledRef = useRef(false);
  const chatLoadingOlderRef = useRef(false);
  const chatLoadingNewerRef = useRef(false);
  const chatPrependStateRef = useRef<{ pending: boolean; prevHeight: number; prevTop: number }>({
    pending: false,
    prevHeight: 0,
    prevTop: 0,
  });
  const profileSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dormSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveTabRef = useRef<ActiveTab>('dashboard');
  const lastAutoReadTabRef = useRef<ActiveTab>('dashboard');
  const lastSyncedProfileRef = useRef<{ name: string; language: LanguageCode } | null>(null);
  const lastSyncedDormNameRef = useRef<string>('');

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiRequest<MePayload>('/api/users/me'),
  });
  const authReady = Boolean(meQuery.data?.id);

  const dutyAllQuery = useInfiniteQuery({
    queryKey: ['duty', 'all'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<DutyItem>>(
        `/api/duty?scope=all&limit=8${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const billsQuery = useInfiniteQuery({
    queryKey: ['bills'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<BillSummary>>(`/api/bills?limit=${BILL_PAGE_LIMIT}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const chatQuery = useInfiniteQuery({
    queryKey: ['chat'],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<ChatMessage>>(`/api/chat?limit=${CHAT_PAGE_LIMIT}${pageParam ? `&cursor=${pageParam}` : ''}`),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const statusQuery = useQuery({
    queryKey: ['status'],
    queryFn: () => apiRequest<Array<{ userId: number; state: DormState }>>('/api/status'),
    enabled: authReady,
  });

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications', notificationFilter],
    queryFn: ({ pageParam }) =>
      apiRequest<CursorPage<NotificationPayload>>(
        `/api/notifications?status=${notificationFilter}&limit=10${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: authReady,
  });

  const notificationsUnreadQuery = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => apiRequest<CursorPage<NotificationPayload>>('/api/notifications?status=unread&limit=60'),
    enabled: authReady,
  });

  const chatAnchorNoticeQuery = useQuery({
    queryKey: ['notifications-chat-anchor'],
    queryFn: () => apiRequest<{ oldestUnreadChatNotificationTime: string | null }>('/api/notifications/chat-anchor'),
    enabled: authReady,
  });

  const chatAnchorQuery = useQuery({
    queryKey: ['chat-anchor-id', chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime],
    queryFn: () =>
      apiRequest<{ anchorId: number | null }>(
        `/api/chat/anchor?from=${encodeURIComponent(chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime || '')}`,
      ),
    enabled: authReady && Boolean(chatAnchorNoticeQuery.data?.oldestUnreadChatNotificationTime),
  });

  const billStatsQuery = useQuery({
    queryKey: ['stats-bills', billPeriodType, billYear, billPeriodMarker, billLineGranularity],
    queryFn: () =>
      apiRequest<{
        pieData: ChartPoint[];
        lineData: ChartPoint[];
        categoryLineSeries: LineSeries[];
      }>(
        `/api/stats/bills?periodType=${billPeriodType}&year=${encodeURIComponent(billYear)}&marker=${billPeriodMarker}&lineGranularity=${billLineGranularity}`,
      ),
    enabled: authReady,
  });

  const dutyStatsQuery = useQuery({
    queryKey: ['stats-duty', dutyPeriodType, dutyYear, dutyPeriodMarker, dutyLineGranularity],
    queryFn: () =>
      apiRequest<{
        pieData: ChartPoint[];
        memberPieData: ChartPoint[];
        lineData: ChartPoint[];
        memberLineSeries: LineSeries[];
      }>(
        `/api/stats/duty?periodType=${dutyPeriodType}&year=${encodeURIComponent(dutyYear)}&marker=${dutyPeriodMarker}&lineGranularity=${dutyLineGranularity}`,
      ),
    enabled: authReady,
  });

  useEffect(() => {
    if (chatWindowMode) return;
    if (!chatQuery.data?.pages) return;
    const merged = chatQuery.data.pages
      .slice()
      .reverse()
      .flatMap((page) => page.items);
    setLiveMessages((prev) => mergeChatMessages(prev, merged));
  }, [chatQuery.dataUpdatedAt, chatWindowMode]);

  useEffect(() => {
    const dormId = meQuery.data?.dormId;
    if (!dormId) return;

    let mounted = true;

    const init = async () => {
      const initResp = await fetch('/api/socket-init');
      if (!initResp.ok || !mounted) return;
      if (!mounted) return;
      const socket = io({ path: '/api/socket' });
      socket.emit('join', dormId);

      socket.on('chat:new', (message: ChatMessage) => {
        setLiveMessages((prev) => mergeChatMessages(prev, [message]));
        setChatNewerCursor((prev) => (prev && prev > message.id ? prev : message.id));
        setChatHasNewer(false);
      });
      socket.on('duty:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
      });
      socket.on('bill:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['bills'] });
      });
      socket.on('notification:new', (payload: { userId?: number; title: string; content: string }) => {
        if (!meQuery.data?.id || (payload.userId && payload.userId !== meQuery.data.id)) return;
        setNoticePopup({ title: payload.title, content: payload.content });
        setTimeout(() => {
          setNoticePopup((current) => (current && current.title === payload.title && current.content === payload.content ? null : current));
        }, 5000);
      });
      socket.on('notification:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
        queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
      });
      socket.on('status:changed', () => {
        queryClient.invalidateQueries({ queryKey: ['status'] });
      });

      socketRef.current = socket;
    };

    init();

    return () => {
      mounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [meQuery.data?.dormId, meQuery.data?.id, queryClient]);

  useLayoutEffect(() => {
    if (activeTab !== 'chat' || !chatScrollRef.current || liveMessages.length === 0) return;
    const container = chatScrollRef.current;
    if (chatPrependStateRef.current.pending) {
      const { prevHeight, prevTop } = chatPrependStateRef.current;
      const nextHeight = container.scrollHeight;
      const nextTop = Math.max(0, nextHeight - prevHeight + prevTop);
      container.scrollTop = nextTop;
      chatPrependStateRef.current.pending = false;
      return;
    }
    if (!chatAutoScrolledRef.current) {
      container.scrollTop = container.scrollHeight;
      chatAutoScrolledRef.current = true;
      return;
    }
    const nearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 140;
    if (nearBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [activeTab, liveMessages.length]);

  useEffect(() => {
    if (!assignUserId && meQuery.data?.members.length) {
      setAssignUserId(meQuery.data.members[0].id);
      setParticipants(meQuery.data.members.map((item) => item.id));
    }
  }, [assignUserId, meQuery.data]);

  useEffect(() => {
    if (meQuery.data) {
      setName(meQuery.data.name);
      setLanguage(meQuery.data.language);
      setDormNameInput(meQuery.data.dormName);
      lastSyncedProfileRef.current = {
        name: meQuery.data.name.trim(),
        language: meQuery.data.language,
      };
      lastSyncedDormNameRef.current = meQuery.data.dormName.trim();
      if (!targetLeaderId) {
        const candidate = meQuery.data.members.find((item) => !item.isLeader);
        setTargetLeaderId(candidate?.id || null);
      }
    }
  }, [meQuery.data, targetLeaderId]);

  useEffect(() => {
    const myId = meQuery.data?.id;
    if (!myId) return;
    const mine = (statusQuery.data || []).find((item) => item.userId === myId);
    if (mine?.state) {
      setSelectedState(mine.state);
    }
  }, [meQuery.data?.id, statusQuery.data]);

  const me = meQuery.data;
  const t = I18N[me?.language || 'zh-CN'];
  const copyInviteCode = async () => {
    const code = me?.inviteCode;
    if (!code || typeof window === 'undefined') return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement('input');
        input.value = code;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'success', message: t.inviteCodeCopied },
        }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'error', message: t.requestFailed },
        }),
      );
    }
  };
  const changeAvatarTitle =
    me?.language === 'en'
      ? 'Change avatar'
      : me?.language === 'fr'
      ? 'Changer l’avatar'
      : me?.language === 'zh-TW'
      ? '更換頭像'
      : '更换头像';
  const eText = useMemo(() => ({
    chooseMember: t.chooseMember,
    invalidDate: t.invalidDate,
    amountRequired:
      me?.language === 'en'
        ? 'Please enter bill amount'
        : me?.language === 'fr'
        ? 'Veuillez saisir le montant'
        : me?.language === 'zh-TW'
        ? '請輸入帳單金額'
        : '请输入账单金额',
    amountNotNumber:
      me?.language === 'en'
        ? 'Bill amount must be a number'
        : me?.language === 'fr'
        ? 'Le montant doit être un nombre'
        : me?.language === 'zh-TW'
        ? '帳單金額必須是數字'
        : '账单金额必须是数字',
    amountGtZero:
      me?.language === 'en'
        ? 'Bill amount must be greater than 0'
        : me?.language === 'fr'
        ? 'Le montant doit être supérieur à 0'
        : me?.language === 'zh-TW'
        ? '帳單金額必須大於 0'
        : '账单金额必须大于 0',
    amountMax:
      me?.language === 'en'
        ? 'Amount cannot exceed 1000000'
        : me?.language === 'fr'
        ? 'Le montant ne peut pas dépasser 1000000'
        : me?.language === 'zh-TW'
        ? '帳單金額不能超過 1000000'
        : '账单金额不能超过 1000000',
    amountDecimal:
      me?.language === 'en'
        ? 'Amount can have at most 2 decimal places'
        : me?.language === 'fr'
        ? 'Le montant accepte au plus 2 décimales'
        : me?.language === 'zh-TW'
        ? '帳單金額最多保留兩位小數'
        : '账单金额最多保留两位小数',
    participantsRequired:
      me?.language === 'en'
        ? 'Please select at least one participant'
        : me?.language === 'fr'
        ? 'Sélectionnez au moins un participant'
        : me?.language === 'zh-TW'
        ? '至少選擇一位參與成員'
        : '至少选择一位参与成员',
    customCategoryRequired:
      me?.language === 'en'
        ? 'Please enter custom category'
        : me?.language === 'fr'
        ? 'Veuillez saisir une catégorie personnalisée'
        : me?.language === 'zh-TW'
        ? '請輸入自訂消費類型'
        : '请输入自定义消费类型',
    messageRequired:
      me?.language === 'en'
        ? 'Message cannot be empty'
        : me?.language === 'fr'
        ? 'Le message ne peut pas être vide'
        : me?.language === 'zh-TW'
        ? '訊息不能為空'
        : '消息不能为空',
    dormNameRequired:
      me?.language === 'en'
        ? 'Dorm name cannot be empty'
        : me?.language === 'fr'
        ? 'Le nom du dortoir est requis'
        : me?.language === 'zh-TW'
        ? '宿舍名稱不能為空'
        : '宿舍名称不能为空',
    transferTargetRequired:
      me?.language === 'en'
        ? 'Please choose a target user'
        : me?.language === 'fr'
        ? 'Veuillez choisir un utilisateur'
        : me?.language === 'zh-TW'
        ? '請選擇移交對象'
        : '请选择移交对象',
    avatarRequired:
      me?.language === 'en'
        ? 'Please choose an avatar file'
        : me?.language === 'fr'
        ? 'Veuillez choisir un fichier avatar'
        : me?.language === 'zh-TW'
        ? '請選擇頭像檔案'
        : '请选择头像文件',
    avatarUploadFailed:
      me?.language === 'en'
        ? 'Avatar upload failed'
        : me?.language === 'fr'
        ? 'Échec du téléversement de l’avatar'
        : me?.language === 'zh-TW'
        ? '頭像上傳失敗'
        : '头像上传失败',
  }), [me?.language, t.chooseMember, t.invalidDate]);

  const displayUsers = useMemo(() => {
    const statusMap = new Map((statusQuery.data || []).map((item) => [item.userId, item.state as DormState]));
    return (me?.members || []).map((member) => ({
      id: member.id,
      name: member.name,
      avatar: resolveAvatar(member.avatarPath, member.id),
      role: member.isLeader ? 'leader' : 'member',
      state: statusMap.get(member.id) || '外出',
      status: member.isLeader ? 'online' : 'busy',
    }));
  }, [me, statusQuery.data]);
  const memberAvatarMap = useMemo(() => {
    const map = new Map<number, string>();
    (me?.members || []).forEach((member) => {
      map.set(member.id, resolveAvatar(member.avatarPath, member.id));
    });
    return map;
  }, [me?.members]);

  const themeClass = useMemo(() => {
    let classes = selectedState === '睡觉' ? 'dark-mode' : '';
    if (selectedState === '学习') classes += ' study-mode';
    if (selectedState === '游戏') classes += ' party-mode';
    return classes;
  }, [selectedState]);
  const billsRows = useMemo(() => billsQuery.data?.pages.flatMap((page) => page.items) || [], [billsQuery.data?.pages]);
  const dutyRows = useMemo(() => dutyAllQuery.data?.pages.flatMap((page) => page.items) || [], [dutyAllQuery.data?.pages]);
  const billListRows = useMemo(
    () => [...billsRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [billsRows],
  );
  const dutyListRows = useMemo(
    () => [...dutyRows].sort((a, b) => (a.date === b.date ? b.dutyId - a.dutyId : b.date.localeCompare(a.date))),
    [dutyRows],
  );
  const notificationRows = useMemo(
    () => notificationsQuery.data?.pages.flatMap((page) => page.items) || [],
    [notificationsQuery.data?.pages],
  );
  const renderedLiveMessages = useMemo<RenderedChatMessage[]>(() => {
    const lang = me?.language || 'zh-CN';
    return liveMessages.map((msg) => {
      const isStatusMessage = Boolean(parseStatusSystemMessage(msg.content));
      return {
        ...msg,
        isStatusMessage,
        localizedContent: localizeServerText(lang, msg.content),
        avatar: memberAvatarMap.get(msg.userId) || resolveAvatar(null, msg.userId),
      };
    });
  }, [liveMessages, me?.language, memberAvatarMap]);

  const monthTotal = useMemo(() => {
    return billsRows.filter((item) => isThisMonth(item.createdAt)).reduce((sum, item) => sum + item.total, 0);
  }, [billsRows]);

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assignUserId) {
        throw new Error(eText.chooseMember);
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(assignDate)) {
        throw new Error(eText.invalidDate);
      }
      return apiRequest('/api/duty/assign', {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, date: assignDate }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const toggleDutyMutation = useMutation({
    mutationFn: (payload: { dutyId: number; completed: boolean }) =>
      apiRequest('/api/duty/complete', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const deleteDutyMutation = useMutation({
    mutationFn: (dutyId: number) => apiRequest(`/api/duty/${dutyId}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty', 'all'] });
    },
  });

  const createBillMutation = useMutation({
    mutationFn: () => {
      const total = Number(billTotal);
      if (!billTotal.trim()) throw new Error(eText.amountRequired);
      if (Number.isNaN(total)) throw new Error(eText.amountNotNumber);
      if (total <= 0) throw new Error(eText.amountGtZero);
      if (total > 1_000_000) throw new Error(eText.amountMax);
      if (!Number.isInteger(total * 100)) throw new Error(eText.amountDecimal);
      if (!participants.length) throw new Error(eText.participantsRequired);
      if (billCategory === BILL_CATEGORY_CUSTOM && !customCategory.trim()) throw new Error(eText.customCategoryRequired);

      return apiRequest('/api/bills', {
        method: 'POST',
        body: JSON.stringify({
          total,
          description: billDescription,
          category: billCategory === BILL_CATEGORY_CUSTOM ? '其他' : billCategory,
          customCategory: billCategory === BILL_CATEGORY_CUSTOM ? customCategory : null,
          participants,
        }),
      });
    },
    onSuccess: () => {
      setBillTotal('');
      setBillDescription('');
      setCustomCategory('');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const togglePaidMutation = useMutation({
    mutationFn: (payload: { billId: number; paid: boolean }) =>
      apiRequest(`/api/bills/${payload.billId}/pay`, {
        method: 'POST',
        body: JSON.stringify({ paid: payload.paid }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: (state: DormState) =>
      apiRequest('/api/status', {
        method: 'PUT',
        body: JSON.stringify({ state }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['status'] }),
  });

  const sendChatMutation = useMutation({
    mutationFn: () => {
      if (!chatInput.trim()) throw new Error(eText.messageRequired);
      return apiRequest('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ content: chatInput }),
      });
    },
    onSuccess: () => {
      setChatInput('');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (payload: { name: string; language: LanguageCode }) =>
      apiRequest('/api/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, payload) => {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('app_lang', payload.language);
      }
      lastSyncedProfileRef.current = { name: payload.name.trim(), language: payload.language };
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const updateDormMutation = useMutation({
    mutationFn: (dormName: string) => {
      if (!dormName.trim()) throw new Error(eText.dormNameRequired);
      return apiRequest('/api/dorm', {
        method: 'PUT',
        body: JSON.stringify({ name: dormName }),
      });
    },
    onSuccess: (_, dormName) => {
      lastSyncedDormNameRef.current = dormName.trim();
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  const transferMutation = useMutation({
    mutationFn: () => {
      if (!targetLeaderId) throw new Error(eText.transferTargetRequired);
      return apiRequest('/api/dorm/transfer-leader', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: targetLeaderId }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await fetch('/api/users/avatar', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message || eText.avatarUploadFailed);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setAvatarFile(null);
    },
  });

  const readNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const readSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const deleteSelectedNoticeMutation = useMutation({
    mutationFn: (payload: { selectAll: boolean; ids: number[] }) =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          status: notificationFilter,
          selectAll: payload.selectAll,
          ids: payload.ids,
          types: [],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const autoReadByTypeMutation = useMutation({
    mutationFn: (type: 'chat' | 'bill' | 'duty') =>
      apiRequest('/api/notifications/batch', {
        method: 'POST',
        body: JSON.stringify({
          action: 'read',
          status: 'unread',
          selectAll: true,
          ids: [],
          types: [type],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-chat-anchor'] });
      queryClient.invalidateQueries({ queryKey: ['chat-anchor-id'] });
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest<{ success: true }>('/api/logout', { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => apiRequest<{ success: true }>('/api/users/me', { method: 'DELETE', body: JSON.stringify({}) }),
    onSuccess: () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      queryClient.clear();
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    },
  });

  const saveProfileNow = useCallback(() => {
    const synced = lastSyncedProfileRef.current;
    if (!me || !synced || updateProfileMutation.isPending) return;
    const trimmed = name.trim();
    const nextName = trimmed || synced.name;
    const nextLanguage = language;
    if (nextName === synced.name && nextLanguage === synced.language) return;
    if (!trimmed) {
      setName(synced.name);
    }
    updateProfileMutation.mutate({ name: nextName, language: nextLanguage });
  }, [language, me, name, updateProfileMutation]);

  const saveDormNow = useCallback(() => {
    if (!me?.isLeader || updateDormMutation.isPending) return;
    const synced = lastSyncedDormNameRef.current;
    const trimmed = dormNameInput.trim();
    const nextDormName = trimmed || synced;
    if (!nextDormName || nextDormName === synced) return;
    if (!trimmed) {
      setDormNameInput(synced);
    }
    updateDormMutation.mutate(nextDormName);
  }, [dormNameInput, me?.isLeader, updateDormMutation]);

  const saveAvatarNow = useCallback(() => {
    if (!avatarFile || uploadAvatarMutation.isPending) return;
    uploadAvatarMutation.mutate(avatarFile);
  }, [avatarFile, uploadAvatarMutation]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me) return;
    const synced = lastSyncedProfileRef.current;
    if (!synced) return;
    const nextName = name.trim() || synced.name;
    if (nextName === synced.name && language === synced.language) return;

    if (profileSaveTimerRef.current) {
      clearTimeout(profileSaveTimerRef.current);
    }
    profileSaveTimerRef.current = setTimeout(() => {
      saveProfileNow();
    }, 900);

    return () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
    };
  }, [activeTab, language, me, name, saveProfileNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !me?.isLeader) return;
    const synced = lastSyncedDormNameRef.current;
    const nextDormName = dormNameInput.trim() || synced;
    if (!nextDormName || nextDormName === synced) return;

    if (dormSaveTimerRef.current) {
      clearTimeout(dormSaveTimerRef.current);
    }
    dormSaveTimerRef.current = setTimeout(() => {
      saveDormNow();
    }, 900);

    return () => {
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
    };
  }, [activeTab, dormNameInput, me?.isLeader, saveDormNow]);

  useEffect(() => {
    if (activeTab !== 'settings' || !avatarFile) return;
    if (avatarSaveTimerRef.current) {
      clearTimeout(avatarSaveTimerRef.current);
    }
    avatarSaveTimerRef.current = setTimeout(() => {
      saveAvatarNow();
    }, 1200);

    return () => {
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
    };
  }, [activeTab, avatarFile, saveAvatarNow]);

  useEffect(() => {
    if (lastActiveTabRef.current === 'settings' && activeTab !== 'settings') {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
        profileSaveTimerRef.current = null;
      }
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
        dormSaveTimerRef.current = null;
      }
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
        avatarSaveTimerRef.current = null;
      }
      saveProfileNow();
      saveDormNow();
      saveAvatarNow();
    }
    lastActiveTabRef.current = activeTab;
  }, [activeTab, saveAvatarNow, saveDormNow, saveProfileNow]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatAutoScrolledRef.current = false;
    }
  }, [activeTab]);

  useEffect(() => {
    if (lastAutoReadTabRef.current === activeTab) return;
    lastAutoReadTabRef.current = activeTab;
    if (activeTab === 'chat') {
      autoReadByTypeMutation.mutate('chat');
      return;
    }
    if (activeTab === 'wallet') {
      autoReadByTypeMutation.mutate('bill');
      return;
    }
    if (activeTab === 'duty') {
      autoReadByTypeMutation.mutate('duty');
    }
  }, [activeTab, autoReadByTypeMutation]);

  useEffect(
    () => () => {
      if (profileSaveTimerRef.current) {
        clearTimeout(profileSaveTimerRef.current);
      }
      if (dormSaveTimerRef.current) {
        clearTimeout(dormSaveTimerRef.current);
      }
      if (avatarSaveTimerRef.current) {
        clearTimeout(avatarSaveTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    setActiveTab(mapPathToTab(pathname || '/'));
  }, [pathname]);

  const navigateToTab = useCallback(
    (tab: ActiveTab) => {
      const targetPath = mapTabToPath(tab);
      setActiveTab(tab);
      if (pathname !== targetPath) {
        router.push(targetPath);
      }
    },
    [pathname, router],
  );

  useEffect(() => {
    setNotificationSelectAll(false);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
    setNotificationMenuOpen(false);
  }, [notificationFilter]);

  const toggleNoticeSelect = useCallback((id: number) => {
    if (notificationSelectAll) {
      setNotificationExcludeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setNotificationIncludeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [notificationSelectAll]);

  const setNoticeSelectAll = useCallback(() => {
    setNotificationSelectAll(true);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
  }, []);

  const clearNoticeSelection = useCallback(() => {
    setNotificationSelectAll(false);
    setNotificationIncludeIds(new Set());
    setNotificationExcludeIds(new Set());
  }, []);

  const onNoticeListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (
      el.scrollHeight - el.scrollTop - el.clientHeight < 80 &&
      notificationsQuery.hasNextPage &&
      !notificationsQuery.isFetchingNextPage
    ) {
      notificationsQuery.fetchNextPage();
    }
  }, [notificationsQuery]);

  const onBillUnpaidListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && billsQuery.hasNextPage && !billsQuery.isFetchingNextPage) {
      billsQuery.fetchNextPage();
    }
  }, [billsQuery]);

  const onBillPaidListScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && billsQuery.hasNextPage && !billsQuery.isFetchingNextPage) {
      billsQuery.fetchNextPage();
    }
  }, [billsQuery]);

  const onPendingDutyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && dutyAllQuery.hasNextPage && !dutyAllQuery.isFetchingNextPage) {
      dutyAllQuery.fetchNextPage();
    }
  }, [dutyAllQuery]);

  const onDoneDutyScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    if (!showAllDoneDuty) {
      setShowAllDoneDuty(true);
    }
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80 && dutyAllQuery.hasNextPage && !dutyAllQuery.isFetchingNextPage) {
      dutyAllQuery.fetchNextPage();
    }
  }, [dutyAllQuery, showAllDoneDuty]);

  const onChatListScroll = useCallback(async (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const nearTop = el.scrollTop <= 80;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;

    if (chatWindowMode) {
      if (nearTop && chatHasOlder && chatOlderCursor && !chatLoadingOlderRef.current) {
        chatLoadingOlderRef.current = true;
        chatPrependStateRef.current = {
          pending: true,
          prevHeight: el.scrollHeight,
          prevTop: el.scrollTop,
        };
        try {
          const resp = await apiRequest<{ items: ChatMessage[]; nextCursor: number | null; hasMore: boolean }>(
            `/api/chat/window?mode=older&cursor=${chatOlderCursor}&limit=20`,
          );
          if (resp.items.length > 0) {
            setLiveMessages((prev) => mergeChatMessages(resp.items, prev));
            setChatOlderCursor(resp.nextCursor ?? chatOlderCursor);
          }
          setChatHasOlder(Boolean(resp.hasMore && resp.nextCursor));
        } finally {
          chatLoadingOlderRef.current = false;
        }
        return;
      }
      if (nearBottom && chatHasNewer && chatNewerCursor && !chatLoadingNewerRef.current) {
        chatLoadingNewerRef.current = true;
        try {
          const resp = await apiRequest<{ items: ChatMessage[]; nextCursor: number | null; hasMore: boolean }>(
            `/api/chat/window?mode=newer&cursor=${chatNewerCursor}&limit=20`,
          );
          if (resp.items.length > 0) {
            setLiveMessages((prev) => mergeChatMessages(prev, resp.items));
            setChatNewerCursor(resp.nextCursor ?? chatNewerCursor);
          }
          setChatHasNewer(Boolean(resp.hasMore && resp.nextCursor));
        } finally {
          chatLoadingNewerRef.current = false;
        }
      }
      return;
    }

    if (nearTop && chatQuery.hasNextPage && !chatQuery.isFetchingNextPage) {
      chatPrependStateRef.current = {
        pending: true,
        prevHeight: el.scrollHeight,
        prevTop: el.scrollTop,
      };
      await chatQuery.fetchNextPage();
    }
  }, [chatHasNewer, chatHasOlder, chatNewerCursor, chatOlderCursor, chatQuery, chatWindowMode]);


  const dormName = me?.dormName || t.dormTitle;
  const meId = me?.id;
  const notificationAllRows = notificationRows;
  const notificationVisibleRows = notificationAllRows;
  const isNoticeChecked = useCallback(
    (id: number) => (notificationSelectAll ? !notificationExcludeIds.has(id) : notificationIncludeIds.has(id)),
    [notificationExcludeIds, notificationIncludeIds, notificationSelectAll],
  );
  const selectedNoticeCount = useMemo(() => {
    if (notificationSelectAll) {
      return Math.max(notificationAllRows.length - notificationExcludeIds.size, 0);
    }
    return notificationIncludeIds.size;
  }, [notificationAllRows.length, notificationExcludeIds.size, notificationIncludeIds.size, notificationSelectAll]);
  const selectionPayload = useMemo(
    () => ({
      selectAll: notificationSelectAll,
      ids: notificationSelectAll ? [...notificationExcludeIds] : [...notificationIncludeIds],
    }),
    [notificationExcludeIds, notificationIncludeIds, notificationSelectAll],
  );
  const unreadNoticeCount = useMemo(
    () => (notificationsUnreadQuery.data?.items || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [notificationsUnreadQuery.data?.items],
  );
  const unreadChatCount = useMemo(() => {
    const unreadRows = notificationsUnreadQuery.data?.items || [];
    return unreadRows
      .filter((item) => item.type === 'chat')
      .reduce((sum, item) => sum + Math.max(item.unreadCount || 0, 1), 0);
  }, [notificationsUnreadQuery.data?.items]);
  const lastPositionChatId = chatAnchorQuery.data?.anchorId || null;
  const jumpToLastPosition = useCallback(async () => {
    if (unreadChatCount <= 20) return;
    if (!lastPositionChatId) return;
    const windowResp = await apiRequest<{
      items: ChatMessage[];
      olderCursor: number | null;
      newerCursor: number | null;
      hasOlder: boolean;
      hasNewer: boolean;
    }>(`/api/chat/window?mode=around&anchorId=${lastPositionChatId}&before=10&after=10`);
    if (!windowResp.items.length) return;
    setChatWindowMode(true);
    setLiveMessages(windowResp.items);
    setChatOlderCursor(windowResp.olderCursor);
    setChatNewerCursor(windowResp.newerCursor);
    setChatHasOlder(windowResp.hasOlder);
    setChatHasNewer(windowResp.hasNewer);
    requestAnimationFrame(() => {
      const node = chatMessageRefs.current[lastPositionChatId];
      if (node) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  }, [lastPositionChatId, unreadChatCount]);

  const resetChatToLatest = useCallback(() => {
    setChatWindowMode(false);
    setChatOlderCursor(null);
    setChatNewerCursor(null);
    setChatHasOlder(true);
    setChatHasNewer(false);
  }, []);

  useEffect(() => {
    if (activeTab !== 'chat') {
      resetChatToLatest();
    }
  }, [activeTab, resetChatToLatest]);
  const pText = useMemo(
    () => ({
      month: me?.language === 'en' ? 'Month' : me?.language === 'fr' ? 'Mois' : me?.language === 'zh-TW' ? '月份' : '月份',
      quarter: me?.language === 'en' ? 'Quarter' : me?.language === 'fr' ? 'Trimestre' : me?.language === 'zh-TW' ? '季度' : '季度',
      year: me?.language === 'en' ? 'Year' : me?.language === 'fr' ? 'Annee' : me?.language === 'zh-TW' ? '年份' : '年份',
      byMonth: me?.language === 'en' ? 'By month' : me?.language === 'fr' ? 'Par mois' : me?.language === 'zh-TW' ? '按月' : '按月',
      byDay: me?.language === 'en' ? 'By day' : me?.language === 'fr' ? 'Par jour' : me?.language === 'zh-TW' ? '按日' : '按日',
      billPie: me?.language === 'en' ? 'Category Share' : me?.language === 'fr' ? 'Part des categories' : me?.language === 'zh-TW' ? '分類占比' : '分类占比',
      billLine: me?.language === 'en' ? 'Amount Trend' : me?.language === 'fr' ? 'Tendance des montants' : me?.language === 'zh-TW' ? '金額趨勢' : '金额趋势',
      billLineByCategory: me?.language === 'en' ? 'Category Amount Trend' : me?.language === 'fr' ? 'Tendance par categorie' : me?.language === 'zh-TW' ? '分類金額趨勢' : '分类金额趋势',
      unpaidBills: me?.language === 'en' ? 'Pending Payment Bills' : me?.language === 'fr' ? 'Factures a payer' : me?.language === 'zh-TW' ? '待支付帳單' : '待支付账单',
      paidBills: me?.language === 'en' ? 'Paid Bills' : me?.language === 'fr' ? 'Factures payees' : me?.language === 'zh-TW' ? '已支付帳單' : '已支付账单',
      dutyPie: me?.language === 'en' ? 'Task Status Share' : me?.language === 'fr' ? 'Part des statuts de tache' : me?.language === 'zh-TW' ? '任務狀態占比' : '任务状态占比',
      dutyByMemberPie: me?.language === 'en' ? 'Completed By Member' : me?.language === 'fr' ? 'Taches terminees par membre' : me?.language === 'zh-TW' ? '完成者占比' : '完成人占比',
      dutyLine: me?.language === 'en' ? 'Task Trend' : me?.language === 'fr' ? 'Tendance des taches' : me?.language === 'zh-TW' ? '任務趨勢' : '任务趋势',
      dutyLineByMember: me?.language === 'en' ? 'Member Completion Trend' : me?.language === 'fr' ? 'Tendance de completion par membre' : me?.language === 'zh-TW' ? '成員完成趨勢' : '成员完成趋势',
      doneList: me?.language === 'en' ? 'Completed List' : me?.language === 'fr' ? 'Liste terminee' : me?.language === 'zh-TW' ? '完成列表' : '完成列表',
      showMore: me?.language === 'en' ? 'Show all' : me?.language === 'fr' ? 'Tout afficher' : me?.language === 'zh-TW' ? '顯示全部' : '显示全部',
      showLess: me?.language === 'en' ? 'Collapse' : me?.language === 'fr' ? 'Replier' : me?.language === 'zh-TW' ? '收起' : '收起',
      pendingTasks: me?.language === 'en' ? 'Pending Tasks' : me?.language === 'fr' ? 'Taches en attente' : me?.language === 'zh-TW' ? '待完成任務' : '待完成任务',
      popupNewNotice: me?.language === 'en' ? 'New notification' : me?.language === 'fr' ? 'Nouvelle notification' : me?.language === 'zh-TW' ? '新通知' : '新通知',
    }),
    [me?.language],
  );

  const billPieData = useMemo(
    () => (billStatsQuery.data?.pieData || []).map((item) => ({ label: categoryLabel(me?.language || 'zh-CN', item.label), value: item.value })),
    [billStatsQuery.data?.pieData, me?.language],
  );
  const billLineData = useMemo(() => billStatsQuery.data?.lineData || [], [billStatsQuery.data?.lineData]);
  const billCategoryLineSeries = useMemo(
    () =>
      (billStatsQuery.data?.categoryLineSeries || []).map((line) => ({
        name: categoryLabel(me?.language || 'zh-CN', line.name),
        points: line.points,
      })),
    [billStatsQuery.data?.categoryLineSeries, me?.language],
  );

  const pendingDutyList = useMemo(() => dutyListRows.filter((item) => !item.completed), [dutyListRows]);
  const doneDutyList = useMemo(() => dutyListRows.filter((item) => item.completed), [dutyListRows]);
  const visiblePendingDutyList = pendingDutyList;
  const effectiveDoneLimit = showAllDoneDuty ? doneDutyList.length : 5;
  const doneDutyPreview = useMemo(() => doneDutyList.slice(0, effectiveDoneLimit), [doneDutyList, effectiveDoneLimit]);

  const groupedUnpaidBills = useMemo(() => {
    const map = new Map<string, BillSummary[]>();
    billListRows
      .filter((bill) => !bill.myPaid)
      .forEach((bill) => {
        const key = monthHeader(bill.createdAt);
        map.set(key, [...(map.get(key) || []), bill]);
      });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [billListRows]);
  const unpaidBillCount = useMemo(
    () => groupedUnpaidBills.reduce((sum, [, items]) => sum + items.length, 0),
    [groupedUnpaidBills],
  );

  const groupedPaidBills = useMemo(() => {
    const map = new Map<string, BillSummary[]>();
    billListRows
      .filter((bill) => bill.myPaid)
      .forEach((bill) => {
        const key = monthHeader(bill.createdAt);
        map.set(key, [...(map.get(key) || []), bill]);
      });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [billListRows]);

  const groupedPendingDuties = useMemo(() => {
    const map = new Map<string, DutyItem[]>();
    visiblePendingDutyList.forEach((item) => {
      const key = weekStartLabel(item.date);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [visiblePendingDutyList]);

  const groupedDoneDuties = useMemo(() => {
    const map = new Map<string, DutyItem[]>();
    doneDutyPreview.forEach((item) => {
      const key = weekStartLabel(item.date);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [doneDutyPreview]);

  const dutyPieData = useMemo(() => {
    const doneLabel = me?.language === 'en' ? 'Completed' : me?.language === 'fr' ? 'Termine' : me?.language === 'zh-TW' ? '已完成' : '已完成';
    const pendingLabel = me?.language === 'en' ? 'Pending' : me?.language === 'fr' ? 'En attente' : me?.language === 'zh-TW' ? '未完成' : '未完成';
    return (dutyStatsQuery.data?.pieData || []).map((item) => ({
      label: item.label === 'completed' ? doneLabel : pendingLabel,
      value: item.value,
    }));
  }, [dutyStatsQuery.data?.pieData, me?.language]);

  const dutyLineData = useMemo(() => dutyStatsQuery.data?.lineData || [], [dutyStatsQuery.data?.lineData]);
  const dutyByMemberPieData = useMemo(() => dutyStatsQuery.data?.memberPieData || [], [dutyStatsQuery.data?.memberPieData]);
  const dutyMemberLineSeries = useMemo(() => dutyStatsQuery.data?.memberLineSeries || [], [dutyStatsQuery.data?.memberLineSeries]);

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsQuery.hasNextPage || billsQuery.isFetchingNextPage) return;
    if (unpaidBillCount >= BILL_AUTO_FILL_UNPAID && groupedPaidBills.length >= BILL_AUTO_FILL_TOTAL_GROUPS) return;
    billsQuery.fetchNextPage();
  }, [activeTab, billsQuery, groupedPaidBills.length, unpaidBillCount]);

  useEffect(() => {
    if (activeTab !== 'wallet') return;
    if (!billsQuery.hasNextPage || billsQuery.isFetchingNextPage) return;
    const unpaidList = billUnpaidListRef.current;
    const paidList = billPaidListRef.current;
    const unpaidNotScrollable = unpaidList ? unpaidList.scrollHeight <= unpaidList.clientHeight + 8 : false;
    const paidNotScrollable = paidList ? paidList.scrollHeight <= paidList.clientHeight + 8 : false;
    if ((unpaidNotScrollable || paidNotScrollable) && billsRows.length > 0) {
      billsQuery.fetchNextPage();
    }
  }, [activeTab, billsQuery, billsRows.length, groupedPaidBills.length, unpaidBillCount]);

  useEffect(() => {
    if (activeTab !== 'duty') return;
    if (groupedPendingDuties.length + groupedDoneDuties.length > 0) return;
    if (!dutyAllQuery.hasNextPage || dutyAllQuery.isFetchingNextPage) return;
    dutyAllQuery.fetchNextPage();
  }, [activeTab, dutyAllQuery, groupedDoneDuties.length, groupedPendingDuties.length]);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    if (notificationRows.length > 0) return;
    if (!notificationsQuery.hasNextPage || notificationsQuery.isFetchingNextPage) return;
    notificationsQuery.fetchNextPage();
  }, [activeTab, notificationRows.length, notificationsQuery]);

  return (
    <div className={`min-h-screen ${themeClass}`}>
      <AnimatePresence>
        {noticePopup ? (
          <motion.aside
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 80 }}
            className="fixed right-4 top-4 z-[70] w-80 glass-card sleep-depth-near p-4 rounded-2xl shadow-2xl"
          >
            <p className="text-xs text-muted mb-1">{pText.popupNewNotice}</p>
            <p className="font-black">{localizeServerText(me?.language || 'zh-CN', noticePopup.title)}</p>
            <p className="text-sm text-muted mt-1">{localizeServerText(me?.language || 'zh-CN', noticePopup.content)}</p>
            <button className="mt-3 text-xs font-bold accent-text" onClick={() => setNoticePopup(null)}>
              OK
            </button>
          </motion.aside>
        ) : null}
      </AnimatePresence>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:top-0 md:bottom-0 md:left-0 md:w-20 lg:w-64 glass-card flex md:flex-col items-center justify-around md:justify-start py-4 md:py-8">
        <div className="hidden md:flex items-center gap-3 px-6 mb-12">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <Users className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl lg:block hidden">{t.dormTitle}</span>
        </div>

        <div className="flex md:flex-col gap-2 w-full px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => navigateToTab('dashboard')} icon={LayoutDashboard} label={t.home} />
          <NavButton active={activeTab === 'duty'} onClick={() => navigateToTab('duty')} icon={Calendar} label={t.duty} />
          <NavButton active={activeTab === 'wallet'} onClick={() => navigateToTab('wallet')} icon={Wallet} label={t.bills} />
          <NavButton active={activeTab === 'chat'} onClick={() => navigateToTab('chat')} icon={MessageSquare} label={t.chat} />
          <NavButton active={activeTab === 'notifications'} onClick={() => navigateToTab('notifications')} icon={Bell} label={t.notifications} badge={unreadNoticeCount} />
          <NavButton active={activeTab === 'settings'} onClick={() => navigateToTab('settings')} icon={Settings} label={t.settings} />
        </div>

        <div className="hidden md:mt-auto md:flex flex-col items-center gap-4 w-full px-4">
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-indigo-500/30">
            <img src={resolveAvatar(me?.avatarPath, meId || 0)} alt={t.userInfo} className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      <main className="pb-24 md:pb-8 md:pl-24 lg:pl-72 p-4 md:p-8 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight">{dormName}</h1>
            <p className="text-muted mt-1 font-medium">{t.welcomeBack}，{me?.name || '-'}</p>
          </div>

          <div className="flex items-center gap-2 glass-card p-1.5 rounded-2xl">
            {STATUS_OPTIONS.map((state) => (
              <button
                key={state}
                title={stateLabel(me?.language || 'zh-CN', state)}
                onClick={() => {
                  setSelectedState(state);
                  updateStatusMutation.mutate(state);
                }}
                className={`relative group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  selectedState === state ? 'accent-bg shadow-lg' : 'hover:bg-slate-100/20 text-muted'
                }`}
              >
                {state === '外出' && <Coffee className="w-4 h-4" />}
                {state === '学习' && <BookOpen className="w-4 h-4" />}
                {state === '睡觉' && <Moon className="w-4 h-4" />}
                {state === '游戏' && <Music className="w-4 h-4" />}
                <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {stateLabel(me?.language || 'zh-CN', state)}
                </span>
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card sleep-depth-near p-8 rounded-2xl accent-bg relative overflow-hidden shadow-2xl">
                <div className="pointer-events-none absolute inset-0 opacity-25">
                  <Coffee className="absolute right-8 top-8 w-10 h-10 rotate-12" />
                  <Moon className="absolute right-24 bottom-12 w-12 h-12 -rotate-12" />
                  <Music className="absolute left-10 bottom-8 w-8 h-8 rotate-6" />
                  <BookOpen className="absolute left-24 top-10 w-9 h-9 -rotate-6" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight">{t.dormTitle}</h2>
                  <p className="text-lg opacity-90 max-w-md font-medium">{t.notifyRealtimeDesc}</p>
                </div>
              </div>

              <div className="glass-card sleep-depth-mid p-6 rounded-xl">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-2"><Users className="w-5 h-5 accent-text" /> {t.memberActivity}</h3>
                <div className="space-y-4">
                  {displayUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img src={user.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200/20" alt="" />
                          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-white rounded-full ${STATE_DOT[user.state] || STATUS_COLOR[user.status as keyof typeof STATUS_COLOR]}`} />
                        </div>
                        <div>
                          <p className="font-bold">{user.name} {user.role === 'leader' && <span className="text-[10px] accent-bg px-1.5 py-0.5 rounded-md ml-1">{t.leaderTag}</span>}</p>
                          <p className="text-xs text-muted">{stateLabel(me?.language || 'zh-CN', user.state)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'duty' && (
            <motion.div key="duty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${me?.isLeader ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
                <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
                  <h3 className="text-2xl font-black mb-4">{t.dutyBoard}</h3>
                  <p className="font-black mb-3">{pText.pendingTasks}</p>
                  <div className="space-y-4 max-h-[34vh] overflow-y-auto pr-1" onScroll={onPendingDutyScroll}>
                    {groupedPendingDuties.map(([weekKey, items]) => (
                      <div key={weekKey} className="space-y-3">
                        <p className="text-xs font-black text-muted">{weekKey}</p>
                        {items.map((item) => (
                          <div
                            key={item.dutyId}
                            className={`flex items-center justify-between p-4 glass-card rounded-2xl ${item.userId === meId ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                            onClick={() => {
                              if (item.userId === meId) {
                                toggleDutyMutation.mutate({ dutyId: item.dutyId, completed: true });
                              }
                            }}
                          >
                            <div>
                              <p className="font-black">{item.date}</p>
                              <p className="text-sm text-muted">{item.userName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Circle className="w-5 h-5 text-amber-500" />
                              {me?.isLeader ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDutyMutation.mutate(item.dutyId);
                                  }}
                                  className="p-2 rounded-lg glass-card text-rose-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-black">{pText.doneList}</p>
                    {doneDutyList.length > 5 ? (
                      <button className="text-xs font-bold accent-text" onClick={() => setShowAllDoneDuty((v) => !v)}>
                        {showAllDoneDuty ? pText.showLess : pText.showMore}
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1" onScroll={onDoneDutyScroll}>
                    {groupedDoneDuties.map(([weekKey, items]) => (
                      <div key={weekKey} className="space-y-3">
                        <p className="text-xs font-black text-muted">{weekKey}</p>
                        {items.map((item) => (
                          <div
                            key={item.dutyId}
                            className={`flex items-center justify-between p-4 glass-card rounded-2xl ${item.userId === meId ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                            onClick={() => {
                              if (item.userId === meId) {
                                toggleDutyMutation.mutate({ dutyId: item.dutyId, completed: false });
                              }
                            }}
                          >
                            <div>
                              <p className="font-black">{item.date}</p>
                              <p className="text-sm text-muted">{item.userName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              {me?.isLeader ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDutyMutation.mutate(item.dutyId);
                                  }}
                                  className="p-2 rounded-lg glass-card text-rose-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {me?.isLeader ? (
                <div className="glass-card sleep-depth-mid p-6 rounded-2xl">
                  <h3 className="text-xl font-black mb-6">{t.dutyAssign}</h3>
                  <div className="space-y-4">
                    <select className="w-full p-4 rounded-2xl glass-card outline-none custom-field" value={assignUserId ?? ''} onChange={(event) => setAssignUserId(Number(event.target.value))}>
                      {(me?.members || []).map((member) => (
                        <option key={member.id} value={member.id}>{member.name}</option>
                      ))}
                    </select>
                    <input type="date" className="w-full p-4 rounded-2xl glass-card outline-none custom-field" value={assignDate} onChange={(event) => setAssignDate(event.target.value)} />
                    <button onClick={() => assignMutation.mutate()} className="w-full py-4 accent-bg rounded-2xl font-black shadow-xl">{t.assignDuty}</button>
                    {assignMutation.error ? <p className="text-rose-500 text-sm">{(assignMutation.error as Error).message}</p> : null}
                  </div>
                </div>
              ) : null}

              <div className="lg:col-span-3 glass-card sleep-depth-deep p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select className="p-3 rounded-xl glass-card custom-field" value={dutyPeriodType} onChange={(e) => setDutyPeriodType(e.target.value as PeriodType)}>
                    <option value="month">{pText.month}</option>
                    <option value="quarter">{pText.quarter}</option>
                    <option value="year">{pText.year}</option>
                  </select>
                  <input className="p-3 rounded-xl glass-card custom-field" type="number" value={dutyYear} onChange={(e) => setDutyYear(e.target.value)} />
                  {dutyPeriodType !== 'year' ? (
                    <select className="p-3 rounded-xl glass-card custom-field" value={dutyPeriodMarker} onChange={(e) => setDutyPeriodMarker(Number(e.target.value))}>
                      {(dutyPeriodType === 'month' ? Array.from({ length: 12 }, (_, i) => i + 1) : [1, 2, 3, 4]).map((item) => (
                        <option key={item} value={item}>
                          {dutyPeriodType === 'month' ? `${pText.month} ${item}` : `${pText.quarter} ${item}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div />
                  )}
                  <select className="p-3 rounded-xl glass-card custom-field" value={dutyLineGranularity} onChange={(e) => setDutyLineGranularity(e.target.value as LineGranularity)}>
                    <option value="day">{pText.byDay}</option>
                    <option value="month">{pText.byMonth}</option>
                  </select>
                </div>
              </div>

              <div className="lg:col-span-3 grid grid-cols-1 gap-6">
                <PieChartCard title={pText.dutyPie} data={dutyPieData} />
                <PieChartCard title={pText.dutyByMemberPie} data={dutyByMemberPieData} />
                <LineChartCard title={pText.dutyLine} data={dutyLineData} />
                <LineChartCard title={pText.dutyLineByMember} series={dutyMemberLineSeries} />
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card sleep-depth-mid rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-2xl">
              <div className="p-6 border-b border-slate-200/20 flex items-center justify-between bg-white/10">
                <h2 className="font-black text-lg">{dormName} {t.chatRoom}</h2>
                {lastPositionChatId && unreadChatCount > 20 ? (
                  <button
                    type="button"
                    onClick={jumpToLastPosition}
                    className="px-3 py-2 rounded-xl glass-card text-xs font-bold"
                  >
                    {t.jumpToLastPosition}{unreadChatCount > 0 ? ` (${unreadChatCount})` : ''}
                  </button>
                ) : null}
              </div>
              <div ref={chatScrollRef} onScroll={onChatListScroll} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                {renderedLiveMessages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(node) => {
                      chatMessageRefs.current[msg.id] = node;
                    }}
                  >
                    {msg.isStatusMessage ? (
                      <div className="flex justify-center">
                        <p className="px-4 py-1.5 rounded-full bg-slate-500/15 text-xs font-bold text-muted">
                          {msg.localizedContent}
                        </p>
                      </div>
                    ) : (
                      <div className={`flex gap-3 ${msg.userId === meId ? 'justify-end' : ''}`}>
                        {msg.userId !== meId && (
                          <img
                            src={msg.avatar}
                            className="w-10 h-10 rounded-full shadow-md"
                            alt=""
                          />
                        )}
                        <div className={`max-w-[70%] p-4 rounded-3xl shadow-sm ${msg.userId === meId ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}>
                          <p className="text-xs text-muted mb-1">{msg.userName}</p>
                          <p className="text-sm font-medium leading-relaxed">{msg.localizedContent}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 bg-white/20 border-t border-slate-200/20">
                <div className="flex gap-3">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChatMutation.mutate()} className="flex-1 p-4 rounded-2xl glass-card custom-field outline-none focus:accent-border font-medium" placeholder={t.inputMessage} />
                  <button onClick={() => sendChatMutation.mutate()} className="p-4 accent-bg rounded-2xl shadow-lg hover:scale-105 transition-transform"><Send className="w-6 h-6" /></button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card wallet-total-card p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-12">
                      <CreditCard className="w-10 h-10 wallet-top-icon" />
                      <span className="text-sm font-bold tracking-widest uppercase wallet-kpi-label">{t.bills}</span>
                    </div>
                    <p className="text-sm font-bold uppercase tracking-widest mb-1 wallet-kpi-label">{t.monthTotal}</p>
                    <h2 className="text-5xl font-black mb-8 wallet-main-value">¥ {monthTotal.toFixed(2)}</h2>
                    <div className="flex gap-8">
                      <div>
                        <p className="text-[10px] font-bold uppercase mb-1 wallet-kpi-label">{t.billCount}</p>
                        <p className="text-xl font-bold flex items-center gap-1 wallet-kpi-value"><ArrowDownLeft className="w-4 h-4 text-emerald-300" /> {billsRows.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase mb-1 wallet-kpi-label">{t.pendingPayment}</p>
                        <p className="text-xl font-bold flex items-center gap-1 wallet-kpi-value"><ArrowUpRight className="w-4 h-4 text-rose-300" /> {billsRows.filter((item) => !item.myPaid).length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
                  <h3 className="text-xl font-black mb-6">{pText.unpaidBills}</h3>
                  <div ref={billUnpaidListRef} className="space-y-4 max-h-[30vh] overflow-y-auto pr-1" onScroll={onBillUnpaidListScroll}>
                    {groupedUnpaidBills.map(([monthKey, items]) => (
                      <div key={monthKey} className="space-y-3">
                        <p className="text-xs font-black text-muted">{monthKey}</p>
                        {items.map((bill) => (
                          <div key={bill.id} className="flex items-center justify-between p-4 glass-card rounded-2xl">
                            <div>
                              <p className={`font-black ${BILL_CATEGORY_COLOR[bill.category] || 'text-muted'}`}>
                                {bill.customCategory || categoryLabel(me?.language || 'zh-CN', bill.category)} · {bill.description || unnamedBill(me?.language || 'zh-CN')}
                              </p>
                              <p className="text-xs text-muted font-bold">{new Date(bill.createdAt).toLocaleDateString()} · {formatPaidInfo(me?.language || 'zh-CN', bill.paidCount, bill.totalCount)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-black">¥{bill.total.toFixed(2)}</p>
                              <button onClick={() => togglePaidMutation.mutate({ billId: bill.id, paid: true })} className="px-3 py-2 accent-bg rounded-xl text-xs font-bold">
                                {t.markPaid}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
                  <h3 className="text-xl font-black mb-6">{pText.paidBills}</h3>
                  <div ref={billPaidListRef} className="space-y-4 max-h-[30vh] overflow-y-auto pr-1" onScroll={onBillPaidListScroll}>
                    {groupedPaidBills.map(([monthKey, items]) => (
                      <div key={monthKey} className="space-y-3">
                        <p className="text-xs font-black text-muted">{monthKey}</p>
                        {items.map((bill) => (
                          <div key={bill.id} className="flex items-center justify-between p-4 glass-card rounded-2xl">
                            <div>
                              <p className={`font-black ${BILL_CATEGORY_COLOR[bill.category] || 'text-muted'}`}>
                                {bill.customCategory || categoryLabel(me?.language || 'zh-CN', bill.category)} · {bill.description || unnamedBill(me?.language || 'zh-CN')}
                              </p>
                              <p className="text-xs text-muted font-bold">{new Date(bill.createdAt).toLocaleDateString()} · {formatPaidInfo(me?.language || 'zh-CN', bill.paidCount, bill.totalCount)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-black">¥{bill.total.toFixed(2)}</p>
                              <button onClick={() => togglePaidMutation.mutate({ billId: bill.id, paid: false })} className="px-3 py-2 accent-bg rounded-xl text-xs font-bold">
                                {t.resetUnpaid}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="glass-card sleep-depth-mid p-8 rounded-2xl h-fit">
                <h3 className="text-xl font-black mb-6">{t.quickBill}</h3>
                <div className="space-y-4">
                  <input type="text" value={billDescription} onChange={(e) => setBillDescription(e.target.value)} className="w-full p-4 rounded-2xl glass-card custom-field outline-none focus:accent-border font-bold" placeholder={t.billDesc} />
                  <input type="number" value={billTotal} onChange={(e) => setBillTotal(e.target.value)} className="w-full p-4 rounded-2xl glass-card custom-field outline-none focus:accent-border font-bold" placeholder={`${t.billAmount} ¥`} />
                  <select value={billCategory} onChange={(e) => setBillCategory(e.target.value)} className="w-full p-4 rounded-2xl glass-card custom-field outline-none">
                    {BILL_CATEGORIES.map((category) => (
                      <option key={category} value={category === '自定义' ? BILL_CATEGORY_CUSTOM : category}>
                        {categoryLabel(me?.language || 'zh-CN', category === '自定义' ? BILL_CATEGORY_CUSTOM : category)}
                      </option>
                    ))}
                  </select>
                  {billCategory === BILL_CATEGORY_CUSTOM ? (
                    <input type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="w-full p-4 rounded-2xl glass-card custom-field outline-none" placeholder={t.customCategory} />
                  ) : null}
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {(me?.members || []).map((member) => (
                      <label key={member.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={participants.includes(member.id)} onChange={(e) => setParticipants((prev) => e.target.checked ? [...new Set([...prev, member.id])] : prev.filter((id) => id !== member.id))} />
                        {member.name}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => createBillMutation.mutate()} className="w-full py-4 accent-bg rounded-2xl font-black shadow-xl hover:translate-y-[-2px] transition-all">{t.publish}</button>
                  {createBillMutation.error ? <p className="text-rose-500 text-sm">{(createBillMutation.error as Error).message}</p> : null}
                </div>
              </div>

              <div className="lg:col-span-3 glass-card sleep-depth-deep p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select className="p-3 rounded-xl glass-card custom-field" value={billPeriodType} onChange={(e) => setBillPeriodType(e.target.value as PeriodType)}>
                    <option value="month">{pText.month}</option>
                    <option value="quarter">{pText.quarter}</option>
                    <option value="year">{pText.year}</option>
                  </select>
                  <input className="p-3 rounded-xl glass-card custom-field" type="number" value={billYear} onChange={(e) => setBillYear(e.target.value)} />
                  {billPeriodType !== 'year' ? (
                    <select className="p-3 rounded-xl glass-card custom-field" value={billPeriodMarker} onChange={(e) => setBillPeriodMarker(Number(e.target.value))}>
                      {(billPeriodType === 'month' ? Array.from({ length: 12 }, (_, i) => i + 1) : [1, 2, 3, 4]).map((item) => (
                        <option key={item} value={item}>
                          {billPeriodType === 'month' ? `${pText.month} ${item}` : `${pText.quarter} ${item}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div />
                  )}
                  <select className="p-3 rounded-xl glass-card custom-field" value={billLineGranularity} onChange={(e) => setBillLineGranularity(e.target.value as LineGranularity)}>
                    <option value="day">{pText.byDay}</option>
                    <option value="month">{pText.byMonth}</option>
                  </select>
                </div>
              </div>

              <div className="lg:col-span-3 grid grid-cols-1 gap-6">
                <PieChartCard title={pText.billPie} data={billPieData} currency />
                <LineChartCard title={pText.billLine} data={billLineData} currency />
                <LineChartCard title={pText.billLineByCategory} series={billCategoryLineSeries} currency />
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div key="notice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card sleep-depth-mid p-8 rounded-2xl">
              <div className="flex items-center justify-between gap-3 mb-6">
                <h3 className="text-2xl font-black">{t.notifications}</h3>
                <div className="flex items-center gap-2 relative">
                  <span className="text-xs font-bold text-muted">{t.selectedCount}: {selectedNoticeCount}</span>
                  <button
                    type="button"
                    onClick={() => setNotificationMenuOpen((prev) => !prev)}
                    className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
                    title={t.moreActions}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {notificationMenuOpen ? (
                    <div className="absolute right-0 top-12 z-50 w-56 rounded-xl glass-card p-2 shadow-2xl space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNoticeSelectAll();
                          setNotificationMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold"
                      >
                        {t.selectAll}
                      </button>
                      {notificationFilter === 'unread' ? (
                        <button
                          type="button"
                          disabled={selectedNoticeCount === 0 || readSelectedNoticeMutation.isPending}
                          onClick={() => {
                            readSelectedNoticeMutation.mutate(selectionPayload, {
                              onSuccess: () => {
                                clearNoticeSelection();
                              },
                            });
                            setNotificationMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold disabled:opacity-50"
                        >
                          {t.markSelectedRead}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={selectedNoticeCount === 0 || deleteSelectedNoticeMutation.isPending}
                        onClick={() => {
                          deleteSelectedNoticeMutation.mutate(selectionPayload, {
                            onSuccess: () => {
                              clearNoticeSelection();
                            },
                          });
                          setNotificationMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold text-rose-500 disabled:opacity-50"
                      >
                        {t.deleteSelected}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 mb-6">
                {(['all', 'unread', 'read'] as NotificationFilter[]).map((item) => (
                  <button key={item} onClick={() => setNotificationFilter(item)} className={`px-4 py-2 rounded-xl font-bold ${item === notificationFilter ? 'accent-bg' : 'glass-card'}`}>
                    {item === 'all' ? t.all : item === 'unread' ? t.unread : t.read}
                  </button>
                ))}
              </div>
              <div ref={notificationListRef} className="space-y-3 max-h-[58vh] overflow-y-auto pr-1" onScroll={onNoticeListScroll}>
                {notificationVisibleRows.map((notice) => (
                  <article
                    key={notice.id}
                    className="glass-card p-4 rounded-2xl flex items-start justify-between gap-4 cursor-pointer hover:scale-[1.01]"
                    onClick={() => {
                      if (!notice.isRead) {
                        readNoticeMutation.mutate(notice.id);
                      }
                      if (notice.targetPath) {
                        const tab = mapPathToTab(notice.targetPath);
                        const targetPath = mapTabToPath(tab);
                        setActiveTab(tab);
                        if (pathname !== targetPath) {
                          router.push(targetPath);
                        }
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNoticeSelect(notice.id);
                        }}
                        className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isNoticeChecked(notice.id) ? 'accent-bg border-transparent text-white' : 'border-slate-300/60 text-transparent'}`}
                        aria-label="select"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <div>
                        <p className="font-black">{localizeServerText(me?.language || 'zh-CN', notice.title)} {notice.unreadCount > 1 ? `(${notice.unreadCount})` : ''}</p>
                        <p className="text-sm text-muted mt-1">{localizeServerText(me?.language || 'zh-CN', notice.content)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="lg:col-span-2 glass-card sleep-depth-mid rounded-3xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-start">
                  <div className="flex flex-col items-center text-center">
                    <div className="relative w-44 h-44">
                      <div className="w-44 h-44 rounded-full overflow-hidden ring-4 ring-white/40 shadow-2xl">
                        <img src={resolveAvatar(me?.avatarPath, meId || 0)} alt={t.userInfo} className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        title={changeAvatarTitle}
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute right-1 bottom-1 w-11 h-11 rounded-full accent-bg shadow-xl flex items-center justify-center border-2 border-white/70"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                    </div>
                    <input
                      ref={avatarInputRef}
                      className="hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                    />
                    <p className="mt-4 text-xl font-black">{name || '-'}</p>
                    <p className="text-sm text-muted">{me?.email || '-'}</p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black text-xl">{t.userInfo}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input className="w-full p-3 rounded-xl glass-card custom-field" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.nickname} />
                      <select className="w-full p-3 rounded-xl glass-card custom-field" value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
                        {LANG_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                <section className="glass-card sleep-depth-deep rounded-3xl p-6 space-y-4">
                  <h4 className="font-black text-lg">{t.dormInfo}</h4>
                  <div className="glass-card rounded-2xl p-4">
                    <p className="text-xs text-muted mb-2">{t.inviteCodeLabel}</p>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-black tracking-[0.2em] text-base">{me?.inviteCode || '-'}</span>
                      <button onClick={copyInviteCode} className="glass-card px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                        <Copy className="w-4 h-4" />
                        {t.copy}
                      </button>
                    </div>
                  </div>
                  <input className="w-full p-3 rounded-xl glass-card custom-field" value={dormNameInput} onChange={(e) => setDormNameInput(e.target.value)} placeholder={t.dormName} />

                  {me?.isLeader ? (
                    <div className="pt-4 border-t border-slate-200/20 space-y-3">
                      <select className="w-full p-3 rounded-xl glass-card custom-field" value={targetLeaderId || ''} onChange={(e) => setTargetLeaderId(Number(e.target.value))}>
                        {(me?.members || []).filter((item) => !item.isLeader).map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <button onClick={() => transferMutation.mutate()} className="glass-card px-4 py-3 rounded-xl font-bold w-full text-rose-500">{t.transferLeader}</button>
                    </div>
                  ) : null}
                </section>

                <section className="glass-card sleep-depth-mid rounded-3xl p-6 space-y-3">
                  <h4 className="font-black text-lg">{t.accountSecurity}</h4>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.confirm(t.logoutConfirm)) {
                        logoutMutation.mutate();
                      }
                    }}
                    className="glass-card px-4 py-3 rounded-xl font-bold w-full"
                  >
                    {t.logout}
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.confirm(t.deleteAccountConfirm)) {
                        deleteAccountMutation.mutate();
                      }
                    }}
                    className="glass-card px-4 py-3 rounded-xl font-bold w-full text-rose-500"
                  >
                    {t.deleteAccount}
                  </button>
                  {logoutMutation.error ? <p className="text-rose-500 text-sm">{(logoutMutation.error as Error).message}</p> : null}
                  {deleteAccountMutation.error ? <p className="text-rose-500 text-sm">{(deleteAccountMutation.error as Error).message}</p> : null}
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge = 0,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<any>;
  label: string;
  badge?: number;
}) {
  return (
    <button onClick={onClick} className={`flex flex-col md:flex-row items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full relative group ${active ? 'accent-bg shadow-lg' : 'text-muted hover:bg-slate-100/10'}`}>
      <Icon className={`nav-icon transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-muted'}`} />
      {badge > 0 ? (
        <span className="absolute top-1 right-2 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-5 font-black text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
      <span className="text-[10px] md:text-sm font-black md:block hidden uppercase tracking-widest">{label}</span>
      {active && <motion.div layoutId="nav-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-r-full hidden md:block" />}
    </button>
  );
}
