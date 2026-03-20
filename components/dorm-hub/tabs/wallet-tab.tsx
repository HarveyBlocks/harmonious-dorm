
import { ArrowDownLeft, ArrowUpRight, CreditCard } from 'lucide-react';
import { motion } from 'motion/react';
import { BILL_CATEGORY_COLOR } from '@/lib/theme/status-colors';
import type { Dispatch, RefObject, SetStateAction, UIEvent } from 'react';

import { QuickBillForm } from '@/components/bill-quick-form';

import { BILL_CATEGORIES, BILL_CATEGORY_CUSTOM } from '../ui-constants';
import { LineChartCard, PieChartCard } from '../charts';

import { categoryLabel } from '../i18n-adapter';
import { formatPaidInfo } from '../ui-helpers';
import type { LineGranularity, PeriodType } from '../ui-types';
export function WalletTab(props: {
  t: any;
  pText: any;
  me: any;
  selectedState: string;
  billsRows: any[];
  monthTotal: number;
  groupedUnpaidBills: Array<[string, any[]]>;
  groupedPaidBills: Array<[string, any[]]>;
  billUnpaidListRef: RefObject<HTMLDivElement>;
  billPaidListRef: RefObject<HTMLDivElement>;
  onBillUnpaidListScroll: (event: UIEvent<HTMLDivElement>) => void;
  onBillPaidListScroll: (event: UIEvent<HTMLDivElement>) => void;
  togglePaidMutation: any;
  billTotal: string;
  setBillTotal: (v: string) => void;
  billCategory: string;
  setBillCategory: (v: string) => void;
  customCategory: string;
  setCustomCategory: (v: string) => void;
  billUseWeights: boolean;
  setBillUseWeights: (v: boolean) => void;
  participants: number[];
  setParticipants: Dispatch<SetStateAction<number[]>>;
  participantWeights: Record<number, string>;
  setParticipantWeights: Dispatch<SetStateAction<Record<number, string>>>;
  previewAmounts: Map<number, number>;
  tryApplyLimitedInput: (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => boolean;
  eText: any;
  LIMITS: any;
  createBillMutation: any;
  billPeriodType: PeriodType;
  setBillPeriodType: (v: PeriodType) => void;
  billYear: string;
  setBillYear: (v: string) => void;
  billPeriodMarker: number;
  setBillPeriodMarker: (v: number) => void;
  billLineGranularity: LineGranularity;
  setBillLineGranularity: (v: LineGranularity) => void;
  billPieData: any[];
  billLineData: any[];
  billCategoryLineSeries: any[];
}) {
  const p = props;

  const buildBillLine = (bill: any) => bill.customCategory || categoryLabel(p.me?.language || 'zh-CN', bill.category);

  return (
    <motion.div key="wallet" animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 glass-card wallet-total-card p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 wallet-total-overlay pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4"><CreditCard className="w-10 h-10 wallet-top-icon" /><span className="text-sm font-bold tracking-widest uppercase wallet-kpi-label">{p.t.bills}</span></div>
          <p className="text-sm font-bold uppercase tracking-widest mb-1 wallet-kpi-label">{p.t.monthTotal}</p>
          <h2 className="text-5xl font-black mb-8 wallet-main-value">¥ {p.monthTotal.toFixed(2)}</h2>
          <div className="flex gap-8">
            <div><p className="text-[10px] font-bold uppercase mb-1 wallet-kpi-label">{p.t.billCount}</p><p className="text-xl font-bold flex items-center gap-1 wallet-kpi-value"><ArrowDownLeft className="w-4 h-4 text-emerald-300" /> {p.billsRows.length}</p></div>
            <div><p className="text-[10px] font-bold uppercase mb-1 wallet-kpi-label">{p.t.pendingPayment}</p><p className="text-xl font-bold flex items-center gap-1 wallet-kpi-value"><ArrowUpRight className="w-4 h-4 text-rose-300" /> {p.billsRows.filter((item) => !item.myPaid).length}</p></div>
          </div>
        </div>
      </div>

      <QuickBillForm
        texts={{
          quickBill: p.t.quickBill,
          customCategory: p.t.customCategory,
          billAmount: p.t.billAmount,
          publish: p.t.publish,
        }}
        categories={BILL_CATEGORIES.map((category) => ({ value: category, label: categoryLabel(p.me?.language || 'zh-CN', category === BILL_CATEGORY_CUSTOM ? BILL_CATEGORY_CUSTOM : category) }))}
        billDescription={p.customCategory}
        billTotal={p.billTotal}
        billCategory={p.billCategory}
        billUseWeights={p.billUseWeights}
        splitEqualLabel={p.pText.splitEqual}
        splitWeightLabel={p.pText.splitWeight}
        members={p.me?.members || []}
        participants={p.participants}
        participantWeights={p.participantWeights}
        previewAmounts={p.previewAmounts}
        errorText={p.createBillMutation.error ? (p.createBillMutation.error as Error).message : null}
        onBillDescriptionChange={(value) => p.tryApplyLimitedInput('custom_category', value, p.LIMITS.BILL_CUSTOM_CATEGORY, p.eText.customCategoryTooLong, p.setCustomCategory)}
        onBillTotalChange={p.setBillTotal}
        onBillCategoryChange={p.setBillCategory}
        onSplitModeChange={p.setBillUseWeights}
        onToggleParticipant={(memberId, checked) => p.setParticipants((prev) => checked ? [...new Set([...prev, memberId])] : prev.filter((id) => id !== memberId))}
        onParticipantWeightChange={(memberId, value) => p.setParticipantWeights((prev) => ({ ...prev, [memberId]: value }))}
        onSubmit={() => p.createBillMutation.mutate()}
      />

      <div className="md:col-span-3 glass-card sleep-depth-mid p-8 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="min-h-[42vh]">
            <h3 className="text-xl font-black mb-6">{p.pText.unpaidBills}</h3>
            <div ref={p.billUnpaidListRef} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1" onScroll={p.onBillUnpaidListScroll}>
              {p.groupedUnpaidBills.map(([monthKey, items]) => (
                <div key={monthKey} className="space-y-3">
                  <p className="text-xs font-black text-muted">{monthKey}</p>
                  {items.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 glass-card rounded-2xl">
                      <div>
                        <p className={`font-black ${BILL_CATEGORY_COLOR[bill.category] || 'text-muted'}`}>{buildBillLine(bill)}</p>
                        <p className="text-xs text-muted font-bold">{new Date(bill.createdAt).toLocaleDateString()} · {formatPaidInfo(p.me?.language || 'zh-CN', bill.paidCount, bill.totalCount)} · ¥{(bill.myAmount || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black">¥{bill.total.toFixed(2)}</p>
                        <button onClick={() => p.togglePaidMutation.mutate({ billId: bill.id, paid: true })} className="px-3 py-2 accent-bg rounded-xl text-xs font-bold">{p.t.markPaid}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section className="min-h-[42vh]">
            <h3 className="text-xl font-black mb-6">{p.pText.paidBills}</h3>
            <div ref={p.billPaidListRef} className="space-y-4 max-h-[50vh] overflow-y-auto pr-1" onScroll={p.onBillPaidListScroll}>
              {p.groupedPaidBills.map(([monthKey, items]) => (
                <div key={monthKey} className="space-y-3">
                  <p className="text-xs font-black text-muted">{monthKey}</p>
                  {items.map((bill) => (
                    <div key={bill.id} className="flex items-center justify-between p-4 glass-card rounded-2xl">
                      <div>
                        <p className={`font-black ${BILL_CATEGORY_COLOR[bill.category] || 'text-muted'}`}>{buildBillLine(bill)}</p>
                        <p className="text-xs text-muted font-bold">{new Date(bill.createdAt).toLocaleDateString()} · {formatPaidInfo(p.me?.language || 'zh-CN', bill.paidCount, bill.totalCount)} · ¥{(bill.myAmount || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-black">¥{bill.total.toFixed(2)}</p>
                        <button onClick={() => p.togglePaidMutation.mutate({ billId: bill.id, paid: false })} className="px-3 py-2 accent-bg rounded-xl text-xs font-bold">{p.t.resetUnpaid}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="md:col-span-3 glass-card sleep-depth-deep p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="p-3 rounded-xl glass-card custom-field" value={p.billPeriodType} onChange={(e) => p.setBillPeriodType(e.target.value as PeriodType)}><option value="month">{p.pText.month}</option><option value="quarter">{p.pText.quarter}</option><option value="year">{p.pText.year}</option></select>
          <input className="p-3 rounded-xl glass-card custom-field" type="number" value={p.billYear} onChange={(e) => p.setBillYear(e.target.value)} />
          {p.billPeriodType !== 'year' ? (
            <select className="p-3 rounded-xl glass-card custom-field" value={p.billPeriodMarker} onChange={(e) => p.setBillPeriodMarker(Number(e.target.value))}>
              {(p.billPeriodType === 'month' ? Array.from({ length: 12 }, (_, i) => i + 1) : [1, 2, 3, 4]).map((item) => <option key={item} value={item}>{p.billPeriodType === 'month' ? `${p.pText.month} ${item}` : `${p.pText.quarter} ${item}`}</option>)}
            </select>
          ) : <div />}
          <select className="p-3 rounded-xl glass-card custom-field" value={p.billLineGranularity} onChange={(e) => p.setBillLineGranularity(e.target.value as LineGranularity)}><option value="day">{p.pText.byDay}</option><option value="month">{p.pText.byMonth}</option></select>
        </div>
      </div>

      <div className="md:col-span-3 grid grid-cols-1 gap-8">
        <PieChartCard title={p.pText.billPie} data={p.billPieData} currency darkMode={p.selectedState === 'sleep'} />
        <LineChartCard title={p.pText.billLine} data={p.billLineData} currency darkMode={p.selectedState === 'sleep'} />
        <LineChartCard title={p.pText.billLineByCategory} series={p.billCategoryLineSeries} currency darkMode={p.selectedState === 'sleep'} />
      </div>
    </motion.div>
  );
}
