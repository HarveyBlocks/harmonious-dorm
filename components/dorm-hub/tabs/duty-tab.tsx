
import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { LineChartCard, PieChartCard } from '../charts';
import type { LineGranularity, PeriodType } from '../ui-types';
import React from "react";

export function DutyTab(props: {
  t: any;
  pText: any;
  me: any;
  meId?: number;
  selectedState: string;
  groupedPendingDuties: Array<[string, any[]]>;
  groupedDoneDuties: Array<[string, any[]]>;
  doneDutyList: any[];
  showAllDoneDuty: boolean;
  setShowAllDoneDuty: React.Dispatch<React.SetStateAction<boolean>>;
  onPendingDutyScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onDoneDutyScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  toggleDutyMutation: any;
  deleteDutyMutation: any;
  assignUserId: number | null;
  setAssignUserId: (v: number) => void;
  assignDate: string;
  setAssignDate: (v: string) => void;
  dutyTask: string;
  setDutyTask: (v: string) => void;
  tryApplyLimitedInput: (key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => boolean;
  eText: any;
  LIMITS: any;
  assignMutation: any;
  dutyPeriodType: PeriodType;
  setDutyPeriodType: (v: PeriodType) => void;
  dutyYear: string;
  setDutyYear: (v: string) => void;
  dutyPeriodMarker: number;
  setDutyPeriodMarker: (v: number) => void;
  dutyLineGranularity: LineGranularity;
  setDutyLineGranularity: (v: LineGranularity) => void;
  dutyPieData: any[];
  dutyByMemberPieData: any[];
  dutyLineData: any[];
  dutyMemberLineSeries: any[];
}) {
  const p = props;

  return (
    <motion.div key="duty" animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={`${p.me?.isLeader ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
        <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
          <h3 className="text-2xl font-black mb-4">{p.t.dutyBoard}</h3>
          <p className="font-black mb-3">{p.pText.pendingTasks}</p>
          <div className="space-y-4 max-h-[34vh] overflow-y-auto pr-1" onScroll={p.onPendingDutyScroll}>
            {p.groupedPendingDuties.map(([weekKey, items]) => (
              <div key={weekKey} className="space-y-3">
                <p className="text-xs font-black text-muted">{weekKey}</p>
                {items.map((item) => (
                  <div key={item.dutyId} className={`flex items-center justify-between p-4 glass-card rounded-2xl ${item.userId === p.meId ? 'cursor-pointer hover:scale-[1.01]' : ''}`} onClick={() => { if (item.userId === p.meId) p.toggleDutyMutation.mutate({ dutyId: item.dutyId, completed: true }); }}>
                    <div>
                      <p className="font-black">{item.date}</p>
                      <p className="text-sm text-muted">{item.userName}</p>
                      <p className="text-sm font-semibold mt-1">{item.task || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Circle className="w-5 h-5 text-amber-500" />
                      {p.me?.isLeader ? <button onClick={(e) => { e.stopPropagation(); p.deleteDutyMutation.mutate(item.dutyId); }} className="p-2 rounded-lg glass-card text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button> : null}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card sleep-depth-mid p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black">{p.pText.doneList}</p>
            {p.doneDutyList.length > 5 ? <button className="text-xs font-bold accent-text" onClick={() => p.setShowAllDoneDuty((v) => !v)}>{p.showAllDoneDuty ? p.pText.showLess : p.pText.showMore}</button> : null}
          </div>
          <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1" onScroll={p.onDoneDutyScroll}>
            {p.groupedDoneDuties.map(([weekKey, items]) => (
              <div key={weekKey} className="space-y-3">
                <p className="text-xs font-black text-muted">{weekKey}</p>
                {items.map((item) => (
                  <div key={item.dutyId} className={`flex items-center justify-between p-4 glass-card rounded-2xl ${item.userId === p.meId ? 'cursor-pointer hover:scale-[1.01]' : ''}`} onClick={() => { if (item.userId === p.meId) p.toggleDutyMutation.mutate({ dutyId: item.dutyId, completed: false }); }}>
                    <div>
                      <p className="font-black">{item.date}</p>
                      <p className="text-sm text-muted">{item.userName}</p>
                      <p className="text-sm font-semibold mt-1">{item.task || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      {p.me?.isLeader ? <button onClick={(e) => { e.stopPropagation(); p.deleteDutyMutation.mutate(item.dutyId); }} className="p-2 rounded-lg glass-card text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button> : null}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {p.me?.isLeader ? (
        <div className="glass-card sleep-depth-mid p-6 rounded-2xl">
          <h3 className="text-xl font-black mb-6">{p.t.dutyAssign}</h3>
          <div className="space-y-4">
            <select className="w-full p-4 rounded-2xl glass-card outline-none custom-field" value={p.assignUserId ?? ''} onChange={(event) => p.setAssignUserId(Number(event.target.value))}>{(p.me?.members || []).map((member: any) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
            <input type="date" className="w-full p-4 rounded-2xl glass-card outline-none custom-field" value={p.assignDate} onChange={(event) => p.setAssignDate(event.target.value)} />
            <input type="text" className="w-full p-4 rounded-2xl glass-card outline-none custom-field" value={p.dutyTask} onChange={(event) => p.tryApplyLimitedInput('duty_task', event.target.value, p.LIMITS.DUTY_TASK, p.eText.dutyTaskTooLong, p.setDutyTask)} placeholder={p.pText.dutyTaskPlaceholder} />
            <button onClick={() => p.assignMutation.mutate()} className="w-full py-4 accent-bg rounded-2xl font-black shadow-xl">{p.t.assignDuty}</button>
            {p.assignMutation.error ? <p className="text-rose-500 text-sm">{(p.assignMutation.error as Error).message}</p> : null}
          </div>
        </div>
      ) : null}

      <div className="lg:col-span-3 glass-card sleep-depth-deep p-6 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="p-3 rounded-xl glass-card custom-field" value={p.dutyPeriodType} onChange={(e) => p.setDutyPeriodType(e.target.value as PeriodType)}><option value="month">{p.pText.month}</option><option value="quarter">{p.pText.quarter}</option><option value="year">{p.pText.year}</option></select>
          <input className="p-3 rounded-xl glass-card custom-field" type="number" value={p.dutyYear} onChange={(e) => p.setDutyYear(e.target.value)} />
          {p.dutyPeriodType !== 'year' ? (
            <select className="p-3 rounded-xl glass-card custom-field" value={p.dutyPeriodMarker} onChange={(e) => p.setDutyPeriodMarker(Number(e.target.value))}>
              {(p.dutyPeriodType === 'month' ? Array.from({ length: 12 }, (_, i) => i + 1) : [1, 2, 3, 4]).map((item) => <option key={item} value={item}>{p.dutyPeriodType === 'month' ? `${p.pText.month} ${item}` : `${p.pText.quarter} ${item}`}</option>)}
            </select>
          ) : <div />}
          <select className="p-3 rounded-xl glass-card custom-field" value={p.dutyLineGranularity} onChange={(e) => p.setDutyLineGranularity(e.target.value as LineGranularity)}><option value="day">{p.pText.byDay}</option><option value="month">{p.pText.byMonth}</option></select>
        </div>
      </div>

      <div className="lg:col-span-3 grid grid-cols-1 gap-6">
        <PieChartCard title={p.pText.dutyPie} data={p.dutyPieData} darkMode={p.selectedState === 'sleep'} />
        <PieChartCard title={p.pText.dutyByMemberPie} data={p.dutyByMemberPieData} darkMode={p.selectedState === 'sleep'} />
        <LineChartCard title={p.pText.dutyLine} data={p.dutyLineData} darkMode={p.selectedState === 'sleep'} />
        <LineChartCard title={p.pText.dutyLineByMember} series={p.dutyMemberLineSeries} darkMode={p.selectedState === 'sleep'} />
      </div>
    </motion.div>
  );
}
