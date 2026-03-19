import type { LanguageCode } from './types';
import type { MessageToken } from './message-token';

export enum NoticeMessageKey {
  NewBillPublished = 'notice.newBillPublished',
  BillPaymentStatusUpdated = 'notice.billPaymentStatusUpdated',
  BillPaymentReverted = 'notice.billPaymentReverted',
  BillFullyPaid = 'notice.billFullyPaid',
  BillAllParticipantsPaid = 'notice.billAllParticipantsPaid',
  MemberMarkedPaid = 'notice.memberMarkedPaid',
  MemberRevertedPaid = 'notice.memberRevertedPaid',
  DutyPublished = 'notice.dutyPublished',
  DutyRestored = 'notice.dutyRestored',
  DutyCompleted = 'notice.dutyCompleted',
  MemberReopenedDuty = 'notice.memberReopenedDuty',
  MemberCompletedDuty = 'notice.memberCompletedDuty',
  DormInfoUpdated = 'notice.dormInfoUpdated',
  LeaderRightsTransferred = 'notice.leaderRightsTransferred',
  UntitledBill = 'notice.untitledBill',
  BotRepliedDormInfo = 'notice.botRepliedDormInfo',
  BotNameUpdated = 'notice.botNameUpdated',
  ProfileDescriptionUpdated = 'notice.profileDescriptionUpdated',
  ProfileDescriptionUpdatedByLeader = 'notice.profileDescriptionUpdatedByLeader',
  ChatStatusChanged = 'notice.chatStatusChanged',
  BillSummary = 'notice.billSummary',
  ChatFrom = 'notice.chatFrom',
  DormNameChanged = 'notice.dormNameChanged',
  LeaderTransferContent = 'notice.leaderTransferContent',
  DutyAssignedContent = 'notice.dutyAssignedContent',
  BotNameChanged = 'notice.botNameChanged',
}

type MultiLangText = Record<LanguageCode, string>;
type TokenParams = Record<string, string | number | boolean | null | undefined>;
type LangFormatter = Record<LanguageCode, (params: TokenParams) => string>;

const STATIC_TEXT: Record<NoticeMessageKey, MultiLangText> = {
  [NoticeMessageKey.NewBillPublished]: { 'zh-CN': '新账单已发布', 'zh-TW': '新帳單已發布', fr: 'Nouvelle facture publiée', en: 'New bill published' },
  [NoticeMessageKey.BillPaymentStatusUpdated]: { 'zh-CN': '账单支付状态更新', 'zh-TW': '帳單支付狀態更新', fr: 'Statut de paiement mis à jour', en: 'Bill payment status updated' },
  [NoticeMessageKey.BillPaymentReverted]: { 'zh-CN': '账单支付已撤销', 'zh-TW': '帳單支付已撤銷', fr: 'Paiement de facture annulé', en: 'Bill payment reverted' },
  [NoticeMessageKey.BillFullyPaid]: { 'zh-CN': '账单已全部支付', 'zh-TW': '帳單已全部支付', fr: 'Facture entièrement payée', en: 'Bill fully paid' },
  [NoticeMessageKey.BillAllParticipantsPaid]: { 'zh-CN': '该账单所有参与成员已完成支付', 'zh-TW': '該帳單所有參與成員已完成支付', fr: 'Tous les participants ont payé cette facture', en: 'All participants have completed payment' },
  [NoticeMessageKey.MemberMarkedPaid]: { 'zh-CN': '有成员标记了已支付', 'zh-TW': '有成員標記了已支付', fr: 'Un membre a marqué comme payé', en: 'A member marked as paid' },
  [NoticeMessageKey.MemberRevertedPaid]: { 'zh-CN': '有成员撤销了已支付', 'zh-TW': '有成員撤銷了已支付', fr: 'Un membre a annulé le paiement', en: 'A member reverted payment' },
  [NoticeMessageKey.DutyPublished]: { 'zh-CN': '值日安排已发布', 'zh-TW': '值日安排已發布', fr: 'Corvée assignée', en: 'Duty assignment published' },
  [NoticeMessageKey.DutyRestored]: { 'zh-CN': '值日状态已恢复', 'zh-TW': '值日狀態已恢復', fr: 'Statut de corvée rétabli', en: 'Duty status restored' },
  [NoticeMessageKey.DutyCompleted]: { 'zh-CN': '值日任务已完成', 'zh-TW': '值日任務已完成', fr: 'Corvée terminée', en: 'Duty completed' },
  [NoticeMessageKey.MemberReopenedDuty]: { 'zh-CN': '有成员将值日恢复为未完成', 'zh-TW': '有成員將值日恢復為未完成', fr: 'Un membre a rouvert une corvée', en: 'A member reopened a duty' },
  [NoticeMessageKey.MemberCompletedDuty]: { 'zh-CN': '有成员完成了值日任务', 'zh-TW': '有成員完成了值日任務', fr: 'Un membre a terminé une corvée', en: 'A member completed a duty' },
  [NoticeMessageKey.DormInfoUpdated]: { 'zh-CN': '宿舍信息已更新', 'zh-TW': '宿舍資訊已更新', fr: 'Informations du dortoir mises à jour', en: 'Dorm info updated' },
  [NoticeMessageKey.LeaderRightsTransferred]: { 'zh-CN': '舍长权限已移交', 'zh-TW': '舍長權限已移交', fr: 'Droits du chef transférés', en: 'Leader rights transferred' },
  [NoticeMessageKey.UntitledBill]: { 'zh-CN': '未命名账单', 'zh-TW': '未命名帳單', fr: 'Facture sans titre', en: 'Untitled bill' },
  [NoticeMessageKey.BotRepliedDormInfo]: { 'zh-CN': '机器人已回复宿舍信息', 'zh-TW': '機器人已回覆宿舍資訊', fr: 'Le robot a répondu avec les infos du dortoir', en: 'Bot replied with dorm information' },
  [NoticeMessageKey.BotNameUpdated]: { 'zh-CN': '宿舍机器人名称已更新', 'zh-TW': '宿舍機器人名稱已更新', fr: 'Nom du robot mis à jour', en: 'Dorm bot name updated' },
  [NoticeMessageKey.ProfileDescriptionUpdated]: { 'zh-CN': '个人描述已更新', 'zh-TW': '個人描述已更新', fr: 'Description personnelle mise à jour', en: 'Profile description updated' },
  [NoticeMessageKey.ProfileDescriptionUpdatedByLeader]: { 'zh-CN': '你的个人描述已被舍长更新', 'zh-TW': '你的個人描述已被舍長更新', fr: 'Votre description a été mise à jour par le chef', en: 'Your profile description was updated by the leader' },
  [NoticeMessageKey.ChatStatusChanged]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.BillSummary]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.ChatFrom]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.DormNameChanged]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.LeaderTransferContent]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.DutyAssignedContent]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
  [NoticeMessageKey.BotNameChanged]: { 'zh-CN': '', 'zh-TW': '', fr: '', en: '' },
};

const STATE_LABEL: Record<LanguageCode, Record<string, string>> = {
  en: { study: 'Studying', sleep: 'Sleeping', game: 'Gaming', out: 'Out' },
  fr: { study: 'Etude', sleep: 'Sommeil', game: 'Jeu', out: 'Sorti' },
  'zh-TW': { study: '學習', sleep: '睡覺', game: '遊戲', out: '外出' },
  'zh-CN': { study: '学习', sleep: '睡觉', game: '游戏', out: '外出' },
};

const MESSAGE_FORMATTER_MAP: Partial<Record<NoticeMessageKey, LangFormatter>> = {
  [NoticeMessageKey.BillSummary]: {
    en: (params) => {
      const name = (params.name as string) || getNoticeStaticText('en', NoticeMessageKey.UntitledBill);
      const amount = String(params.amount || '');
      return `${name} · ¥${amount}`;
    },
    fr: (params) => {
      const name = (params.name as string) || getNoticeStaticText('fr', NoticeMessageKey.UntitledBill);
      const amount = String(params.amount || '');
      return `${name} · ¥${amount}`;
    },
    'zh-TW': (params) => {
      const name = (params.name as string) || getNoticeStaticText('zh-TW', NoticeMessageKey.UntitledBill);
      const amount = String(params.amount || '');
      return `${name} · ¥${amount}`;
    },
    'zh-CN': (params) => {
      const name = (params.name as string) || getNoticeStaticText('zh-CN', NoticeMessageKey.UntitledBill);
      const amount = String(params.amount || '');
      return `${name} · ¥${amount}`;
    },
  },
  [NoticeMessageKey.ChatFrom]: {
    en: (params) => `New message from ${String(params.userName || '')}`,
    fr: (params) => `Nouveau message de ${String(params.userName || '')}`,
    'zh-TW': (params) => `${String(params.userName || '')} 發來新訊息`,
    'zh-CN': (params) => `${String(params.userName || '')} 发来新消息`,
  },
  [NoticeMessageKey.DormNameChanged]: {
    en: (params) => `Dorm name changed to ${String(params.name || '')}`,
    fr: (params) => `Nom du dortoir changé en ${String(params.name || '')}`,
    'zh-TW': (params) => `宿舍名稱已改為 ${String(params.name || '')}`,
    'zh-CN': (params) => `宿舍名称已改为 ${String(params.name || '')}`,
  },
  [NoticeMessageKey.LeaderTransferContent]: {
    en: (params) => `${String(params.fromUserName || '')} transferred leader rights to ${String(params.toUserName || '')}`,
    fr: (params) => `${String(params.fromUserName || '')} a transféré les droits de chef à ${String(params.toUserName || '')}`,
    'zh-TW': (params) => `${String(params.fromUserName || '')} 已將舍長權限移交給 ${String(params.toUserName || '')}`,
    'zh-CN': (params) => `${String(params.fromUserName || '')} 已将舍长权限移交给 ${String(params.toUserName || '')}`,
  },
  [NoticeMessageKey.DutyAssignedContent]: {
    en: (params) => `Duty assigned for ${String(params.date || '')}: ${String(params.task || '')}`,
    fr: (params) => `Corvée assignée pour ${String(params.date || '')} : ${String(params.task || '')}`,
    'zh-TW': (params) => `已安排 ${String(params.date || '')} 的值日任務：${String(params.task || '')}`,
    'zh-CN': (params) => `已安排 ${String(params.date || '')} 的值日任务：${String(params.task || '')}`,
  },
  [NoticeMessageKey.BotNameChanged]: {
    en: (params) => `Bot name changed to ${String(params.name || '')}`,
    fr: (params) => `Nom du robot changé en ${String(params.name || '')}`,
    'zh-TW': (params) => `機器人名稱已改為 ${String(params.name || '')}`,
    'zh-CN': (params) => `机器人名称已改为 ${String(params.name || '')}`,
  },
  [NoticeMessageKey.ChatStatusChanged]: {
    en: (params) => `${String(params.userName || '')} is now ${STATE_LABEL.en[String(params.state || '')] || ''}`,
    fr: (params) => `${String(params.userName || '')} est maintenant en mode ${STATE_LABEL.fr[String(params.state || '')] || ''}`,
    'zh-TW': (params) => `${String(params.userName || '')} 現在是 ${STATE_LABEL['zh-TW'][String(params.state || '')] || ''} 狀態`,
    'zh-CN': (params) => `${String(params.userName || '')}现在是${STATE_LABEL['zh-CN'][String(params.state || '')] || ''}状态`,
  },
};

function isNoticeMessageKey(value: string): value is NoticeMessageKey {
  return Object.values(NoticeMessageKey).includes(value as NoticeMessageKey);
}

export function getNoticeStaticText(lang: LanguageCode, key: NoticeMessageKey): string {
  return STATIC_TEXT[key][lang] || STATIC_TEXT[key]['zh-CN'];
}

export function localizeNoticeToken(lang: LanguageCode, token: MessageToken): string | null {
  if (!isNoticeMessageKey(token.key)) return null;
  const formatter = MESSAGE_FORMATTER_MAP[token.key]?.[lang] || MESSAGE_FORMATTER_MAP[token.key]?.['zh-CN'];
  if (formatter) return formatter(token.params || {});
  return getNoticeStaticText(lang, token.key);
}
