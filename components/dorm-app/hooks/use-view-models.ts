import { useMemo } from 'react';

import type { DormState, DutyItem, MePayload } from '@/lib/types';
import { localizeServerText } from '@/components/dorm-app/localization';
import type { ChartPoint, ChatMessage, LineSeries, RenderedChatMessage } from '@/components/dorm-app/types';
import { parseStatusSystemMessage, resolveAvatar } from '@/components/dorm-app/helpers';
import {
  calcMonthTotal,
  calcPreviewAmounts,
  groupBillsByMonth,
  groupDutiesByWeek,
  mapBillChartViewModel,
  mapDutyChartViewModel,
  splitDutyLists,
} from '@/components/dorm-app/view-models';

type BillStats = {
  pieData?: ChartPoint[];
  lineData?: ChartPoint[];
  categoryLineSeries?: LineSeries[];
};

type DutyStats = {
  pieData?: ChartPoint[];
  memberPieData?: ChartPoint[];
  lineData?: ChartPoint[];
  memberLineSeries?: LineSeries[];
};

export function useViewModels(options: {
  me: MePayload | undefined;
  statusRows: Array<{ userId: number; state: DormState }> | undefined;
  selectedState: DormState;
  billsPages: Array<{ items: any[] }> | undefined;
  dutyPages: Array<{ items: DutyItem[] }> | undefined;
  notificationPages: Array<{ items: any[] }> | undefined;
  notificationsUnreadItems: Array<{ unreadCount?: number }> | undefined;
  liveMessages: ChatMessage[];
  billStats: BillStats | undefined;
  dutyStats: DutyStats | undefined;
  billTotal: string;
  participants: number[];
  participantWeights: Record<number, string>;
  showAllDoneDuty: boolean;
}) {
  const {
    me,
    statusRows,
    selectedState,
    billsPages,
    dutyPages,
    notificationPages,
    notificationsUnreadItems,
    liveMessages,
    billStats,
    dutyStats,
    billTotal,
    participants,
    participantWeights,
    showAllDoneDuty,
  } = options;

  const displayUsers = useMemo(() => {
    const statusMap = new Map((statusRows || []).map((item) => [item.userId, item.state as DormState]));
    return (me?.members || []).map((member) => ({
      id: member.id,
      name: member.name,
      avatar: resolveAvatar(member.avatarPath, member.id),
      role: member.isLeader ? 'leader' : 'member',
      state: statusMap.get(member.id) || 'out',
      status: member.isLeader ? 'online' : 'busy',
    }));
  }, [me, statusRows]);

  const memberAvatarMap = useMemo(() => {
    const map = new Map<number, string>();
    (me?.members || []).forEach((member) => {
      map.set(member.id, resolveAvatar(member.avatarPath, member.id));
    });
    return map;
  }, [me?.members]);

  const themeClass = useMemo(() => {
    let classes = selectedState === 'sleep' ? 'dark-mode' : '';
    if (selectedState === 'study') classes += ' study-mode';
    if (selectedState === 'game') classes += ' party-mode';
    return classes;
  }, [selectedState]);

  const billsRows = useMemo(() => billsPages?.flatMap((page) => page.items) || [], [billsPages]);
  const dutyRows = useMemo(() => dutyPages?.flatMap((page) => page.items) || [], [dutyPages]);
  const billListRows = useMemo(
    () => [...billsRows].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [billsRows],
  );
  const dutyListRows = useMemo(
    () => [...dutyRows].sort((a, b) => (a.date === b.date ? b.dutyId - a.dutyId : b.date.localeCompare(a.date))),
    [dutyRows],
  );
  const notificationRows = useMemo(() => notificationPages?.flatMap((page) => page.items) || [], [notificationPages]);
  const unreadNoticeCount = useMemo(
    () => (notificationsUnreadItems || []).reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [notificationsUnreadItems],
  );

  const renderedLiveMessages = useMemo<RenderedChatMessage[]>(() => {
    const lang = me?.language || 'zh-CN';
    return liveMessages.map((msg) => {
      const isStatusMessage = Boolean(parseStatusSystemMessage(msg.content));
      const isBotMessage = Boolean(me?.botId && msg.userId === me.botId);
      return {
        ...msg,
        isStatusMessage,
        isBotMessage,
        localizedContent: localizeServerText(lang, msg.content),
        avatar: isBotMessage
          ? resolveAvatar(me?.botAvatarPath, msg.userId)
          : memberAvatarMap.get(msg.userId) || resolveAvatar(null, msg.userId),
      };
    });
  }, [liveMessages, me?.botAvatarPath, me?.botId, me?.language, memberAvatarMap]);

  const monthTotal = useMemo(() => calcMonthTotal(billsRows), [billsRows]);
  const previewAmounts = useMemo(
    () => calcPreviewAmounts(billTotal, participants, participantWeights),
    [billTotal, participantWeights, participants],
  );

  const { billPieData, billLineData, billCategoryLineSeries } = useMemo(
    () => mapBillChartViewModel(me?.language, billStats),
    [billStats, me?.language],
  );

  const { pending: pendingDutyList, done: doneDutyList } = useMemo(() => splitDutyLists(dutyListRows), [dutyListRows]);
  const effectiveDoneLimit = showAllDoneDuty ? doneDutyList.length : 5;
  const doneDutyPreview = useMemo(() => doneDutyList.slice(0, effectiveDoneLimit), [doneDutyList, effectiveDoneLimit]);
  const groupedUnpaidBills = useMemo(() => groupBillsByMonth(billListRows, false), [billListRows]);
  const unpaidBillCount = useMemo(() => groupedUnpaidBills.reduce((sum, [, items]) => sum + items.length, 0), [groupedUnpaidBills]);
  const groupedPaidBills = useMemo(() => groupBillsByMonth(billListRows, true), [billListRows]);
  const groupedPendingDuties = useMemo(() => groupDutiesByWeek(pendingDutyList), [pendingDutyList]);
  const groupedDoneDuties = useMemo(() => groupDutiesByWeek(doneDutyPreview), [doneDutyPreview]);

  const { dutyPieData, dutyLineData, dutyByMemberPieData, dutyMemberLineSeries } = useMemo(
    () => mapDutyChartViewModel(me?.language, dutyStats),
    [dutyStats, me?.language],
  );

  return {
    displayUsers,
    themeClass,
    billsRows,
    notificationRows,
    unreadNoticeCount,
    renderedLiveMessages,
    monthTotal,
    previewAmounts,
    billPieData,
    billLineData,
    billCategoryLineSeries,
    pendingDutyList,
    doneDutyList,
    groupedUnpaidBills,
    unpaidBillCount,
    groupedPaidBills,
    groupedPendingDuties,
    groupedDoneDuties,
    dutyPieData,
    dutyLineData,
    dutyByMemberPieData,
    dutyMemberLineSeries,
  };
}

