import type { LanguageCode } from '@/lib/i18n';

import { BILL_CATEGORY_CUSTOM } from './ui-constants';
import { parseStatusSystemMessage, stateLabel } from './ui-helpers';

const STATIC_TEXT_BY_KEY: Record<string, Record<LanguageCode, string>> = {
  newBillPublished: { 'zh-CN': '新账单已发布', 'zh-TW': '新帳單已發布', fr: 'Nouvelle facture publiée', en: 'New bill published' },
  billPaymentStatusUpdated: { 'zh-CN': '账单支付状态更新', 'zh-TW': '帳單支付狀態更新', fr: 'Statut de paiement mis à jour', en: 'Bill payment status updated' },
  billPaymentReverted: { 'zh-CN': '账单支付已撤销', 'zh-TW': '帳單支付已撤銷', fr: 'Paiement de facture annulé', en: 'Bill payment reverted' },
  billFullyPaid: { 'zh-CN': '账单已全部支付', 'zh-TW': '帳單已全部支付', fr: 'Facture entièrement payée', en: 'Bill fully paid' },
  billAllParticipantsPaid: { 'zh-CN': '该账单所有参与成员已完成支付', 'zh-TW': '該帳單所有參與成員已完成支付', fr: 'Tous les participants ont payé cette facture', en: 'All participants have completed payment' },
  dutyPublished: { 'zh-CN': '值日安排已发布', 'zh-TW': '值日安排已發布', fr: 'Corvée assignée', en: 'Duty assignment published' },
  dutyRestored: { 'zh-CN': '值日状态已恢复', 'zh-TW': '值日狀態已恢復', fr: 'Statut de corvée rétabli', en: 'Duty status restored' },
  dutyCompleted: { 'zh-CN': '值日任务已完成', 'zh-TW': '值日任務已完成', fr: 'Corvée terminée', en: 'Duty completed' },
  dormInfoUpdated: { 'zh-CN': '宿舍信息已更新', 'zh-TW': '宿舍資訊已更新', fr: 'Informations du dortoir mises à jour', en: 'Dorm info updated' },
  leaderRightsTransferred: { 'zh-CN': '舍长权限已移交', 'zh-TW': '舍長權限已移交', fr: 'Droits du chef transférés', en: 'Leader rights transferred' },
  memberMarkedPaid: { 'zh-CN': '有成员标记了已支付', 'zh-TW': '有成員標記了已支付', fr: 'Un membre a marqué comme payé', en: 'A member marked as paid' },
  memberRevertedPaid: { 'zh-CN': '有成员撤销了已支付', 'zh-TW': '有成員撤銷了已支付', fr: 'Un membre a annulé le paiement', en: 'A member reverted payment' },
  memberReopenedDuty: { 'zh-CN': '有成员将值日恢复为未完成', 'zh-TW': '有成員將值日恢復為未完成', fr: 'Un membre a rouvert une corvée', en: 'A member reopened a duty' },
  memberCompletedDuty: { 'zh-CN': '有成员完成了值日任务', 'zh-TW': '有成員完成了值日任務', fr: 'Un membre a terminé une corvée', en: 'A member completed a duty' },
  untitledBill: { 'zh-CN': '未命名账单', 'zh-TW': '未命名帳單', fr: 'Facture sans titre', en: 'Untitled bill' },
};

const SOURCE_TO_KEY: Record<string, string> = {
  '新账单已发布': 'newBillPublished',
  '账单支付状态更新': 'billPaymentStatusUpdated',
  '账单支付已撤销': 'billPaymentReverted',
  '账单已全部支付': 'billFullyPaid',
  '该账单所有参与成员已完成支付': 'billAllParticipantsPaid',
  '值日安排已发布': 'dutyPublished',
  '值日状态已恢复': 'dutyRestored',
  '值日任务已完成': 'dutyCompleted',
  '宿舍信息已更新': 'dormInfoUpdated',
  '舍长权限已移交': 'leaderRightsTransferred',
  '有成员标记了已支付': 'memberMarkedPaid',
  '有成员撤销了已支付': 'memberRevertedPaid',
  '有成员将值日恢复为未完成': 'memberReopenedDuty',
  '有成员完成了值日任务': 'memberCompletedDuty',
  '未命名账单': 'untitledBill',
};

const CATEGORY_CODE_MAP: Record<string, string> = {
  electricity: 'electricity',
  电费: 'electricity',
  water: 'water',
  水费: 'water',
  internet: 'internet',
  网费: 'internet',
  supplies: 'supplies',
  日用品: 'supplies',
  other: 'other',
  其他: 'other',
  [BILL_CATEGORY_CUSTOM]: BILL_CATEGORY_CUSTOM,
};

const CATEGORY_LABEL_MAP: Record<LanguageCode, Record<string, string>> = {
  en: {
    electricity: 'Electricity',
    water: 'Water',
    internet: 'Internet',
    supplies: 'Daily Supplies',
    other: 'Other',
    [BILL_CATEGORY_CUSTOM]: 'Custom',
  },
  fr: {
    electricity: 'Electricite',
    water: 'Eau',
    internet: 'Internet',
    supplies: 'Articles courants',
    other: 'Autre',
    [BILL_CATEGORY_CUSTOM]: 'Personnalisee',
  },
  'zh-TW': {
    electricity: '電費',
    water: '水費',
    internet: '網費',
    supplies: '日用品',
    other: '其他',
    [BILL_CATEGORY_CUSTOM]: '自訂',
  },
  'zh-CN': {
    electricity: '电费',
    water: '水费',
    internet: '网费',
    supplies: '日用品',
    other: '其他',
    [BILL_CATEGORY_CUSTOM]: '自定义',
  },
};

const STATUS_MESSAGE_FORMATTER: Record<LanguageCode, (userName: string, state: string) => string> = {
  en: (userName, state) => `${userName} is now ${state}`,
  fr: (userName, state) => `${userName} est maintenant en mode ${state}`,
  'zh-TW': (userName, state) => `${userName} 現在是 ${state} 狀態`,
  'zh-CN': (userName, state) => `${userName}现在是${state}状态`,
};

const RENAME_DORM_FORMATTER: Record<Exclude<LanguageCode, 'zh-CN'>, (name: string) => string> = {
  en: (name) => `Dorm name changed to ${name}`,
  fr: (name) => `Nom du dortoir changé en ${name}`,
  'zh-TW': (name) => `宿舍名稱已改為 ${name}`,
};

const TRANSFER_LEADER_FORMATTER: Record<Exclude<LanguageCode, 'zh-CN'>, (from: string, to: string) => string> = {
  en: (from, to) => `${from} transferred leader rights to ${to}`,
  fr: (from, to) => `${from} a transféré les droits de chef à ${to}`,
  'zh-TW': (from, to) => `${from} 已將舍長權限移交給 ${to}`,
};

const ASSIGN_DUTY_FORMATTER: Record<Exclude<LanguageCode, 'zh-CN'>, (date: string) => string> = {
  en: (date) => `Duty assigned for ${date}`,
  fr: (date) => `Corvée assignée pour ${date}`,
  'zh-TW': (date) => `已安排 ${date} 的值日任務`,
};

const CHAT_TITLE_FORMATTER: Record<Exclude<LanguageCode, 'zh-CN'>, (userName: string) => string> = {
  en: (userName) => `New message from ${userName}`,
  fr: (userName) => `Nouveau message de ${userName}`,
  'zh-TW': (userName) => `${userName} 發來新訊息`,
};

export function categoryLabel(lang: LanguageCode, category: string): string {
  const c = (category || '').trim();
  const code = CATEGORY_CODE_MAP[c] || c;
  const map = CATEGORY_LABEL_MAP[lang] || CATEGORY_LABEL_MAP['zh-CN'];
  return map[code] || category;
}

function localizeStructuredMessage(lang: LanguageCode, text: string): string | null {
  const statusChanged = parseStatusSystemMessage(text);
  if (statusChanged) {
    const { userName, state } = statusChanged;
    return (STATUS_MESSAGE_FORMATTER[lang] || STATUS_MESSAGE_FORMATTER['zh-CN'])(userName, stateLabel(lang, state));
  }

  const renamedDorm = text.match(/^宿舍名称已改为 (.+)$/);
  if (renamedDorm) {
    if (lang === 'zh-CN') return text;
    const format = RENAME_DORM_FORMATTER[lang as Exclude<LanguageCode, 'zh-CN'>];
    return format ? format(renamedDorm[1]) : text;
  }

  const transferLeader = text.match(/^(.+) 已将舍长权限移交给 (.+)$/);
  if (transferLeader) {
    if (lang === 'zh-CN') return text;
    const format = TRANSFER_LEADER_FORMATTER[lang as Exclude<LanguageCode, 'zh-CN'>];
    return format ? format(transferLeader[1], transferLeader[2]) : text;
  }

  const assignDuty = text.match(/^已安排 (.+) 的值日任务$/);
  if (assignDuty) {
    if (lang === 'zh-CN') return text;
    const format = ASSIGN_DUTY_FORMATTER[lang as Exclude<LanguageCode, 'zh-CN'>];
    return format ? format(assignDuty[1]) : text;
  }

  const chatTitle = text.match(/^(.+) 发来新消息$/);
  if (chatTitle) {
    if (lang === 'zh-CN') return text;
    const format = CHAT_TITLE_FORMATTER[lang as Exclude<LanguageCode, 'zh-CN'>];
    return format ? format(chatTitle[1]) : text;
  }

  return null;
}

export function localizeServerText(lang: LanguageCode, text: string): string {
  const key = SOURCE_TO_KEY[text];
  if (key && STATIC_TEXT_BY_KEY[key]) return STATIC_TEXT_BY_KEY[key][lang];
  return localizeStructuredMessage(lang, text) || text;
}
