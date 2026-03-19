import { normalizeBillCategory } from '@/lib/domain-codes';
import type { LanguageCode } from '@/lib/i18n';
import { decodeMessageToken } from '@/lib/i18n/message-token';

import { BILL_CATEGORY_CUSTOM } from './ui-constants';
import { parseStatusSystemMessage, stateLabel } from './ui-helpers';

type LangText = Record<LanguageCode, string>;

const CATEGORY_LABEL_MAP: Record<LanguageCode, Record<string, string>> = {
  en: { electricity: 'Electricity', water: 'Water', internet: 'Internet', supplies: 'Daily Supplies', other: 'Other', [BILL_CATEGORY_CUSTOM]: 'Custom' },
  fr: { electricity: 'Électricité', water: 'Eau', internet: 'Internet', supplies: 'Articles courants', other: 'Autre', [BILL_CATEGORY_CUSTOM]: 'Personnalisée' },
  'zh-TW': { electricity: '電費', water: '水費', internet: '網費', supplies: '日用品', other: '其他', [BILL_CATEGORY_CUSTOM]: '自訂' },
  'zh-CN': { electricity: '电费', water: '水费', internet: '网费', supplies: '日用品', other: '其他', [BILL_CATEGORY_CUSTOM]: '自定义' },
};

const STATIC_NOTICE_TEXT: Record<string, LangText> = {
  'notice.newBillPublished': { 'zh-CN': '新账单已发布', 'zh-TW': '新帳單已發布', fr: 'Nouvelle facture publiée', en: 'New bill published' },
  'notice.billPaymentStatusUpdated': { 'zh-CN': '账单支付状态更新', 'zh-TW': '帳單支付狀態更新', fr: 'Statut de paiement mis à jour', en: 'Bill payment status updated' },
  'notice.billPaymentReverted': { 'zh-CN': '账单支付已撤销', 'zh-TW': '帳單支付已撤銷', fr: 'Paiement de facture annulé', en: 'Bill payment reverted' },
  'notice.billFullyPaid': { 'zh-CN': '账单已全部支付', 'zh-TW': '帳單已全部支付', fr: 'Facture entièrement payée', en: 'Bill fully paid' },
  'notice.billAllParticipantsPaid': { 'zh-CN': '该账单所有参与成员已完成支付', 'zh-TW': '該帳單所有參與成員已完成支付', fr: 'Tous les participants ont payé cette facture', en: 'All participants have completed payment' },
  'notice.memberMarkedPaid': { 'zh-CN': '有成员标记了已支付', 'zh-TW': '有成員標記了已支付', fr: 'Un membre a marqué comme payé', en: 'A member marked as paid' },
  'notice.memberRevertedPaid': { 'zh-CN': '有成员撤销了已支付', 'zh-TW': '有成員撤銷了已支付', fr: 'Un membre a annulé le paiement', en: 'A member reverted payment' },
  'notice.dutyPublished': { 'zh-CN': '值日安排已发布', 'zh-TW': '值日安排已發布', fr: 'Corvée assignée', en: 'Duty assignment published' },
  'notice.dutyRestored': { 'zh-CN': '值日状态已恢复', 'zh-TW': '值日狀態已恢復', fr: 'Statut de corvée rétabli', en: 'Duty status restored' },
  'notice.dutyCompleted': { 'zh-CN': '值日任务已完成', 'zh-TW': '值日任務已完成', fr: 'Corvée terminée', en: 'Duty completed' },
  'notice.memberReopenedDuty': { 'zh-CN': '有成员将值日恢复为未完成', 'zh-TW': '有成員將值日恢復為未完成', fr: 'Un membre a rouvert une corvée', en: 'A member reopened a duty' },
  'notice.memberCompletedDuty': { 'zh-CN': '有成员完成了值日任务', 'zh-TW': '有成員完成了值日任務', fr: 'Un membre a terminé une corvée', en: 'A member completed a duty' },
  'notice.dormInfoUpdated': { 'zh-CN': '宿舍信息已更新', 'zh-TW': '宿舍資訊已更新', fr: 'Informations du dortoir mises à jour', en: 'Dorm info updated' },
  'notice.leaderRightsTransferred': { 'zh-CN': '舍长权限已移交', 'zh-TW': '舍長權限已移交', fr: 'Droits du chef transférés', en: 'Leader rights transferred' },
  'notice.untitledBill': { 'zh-CN': '未命名账单', 'zh-TW': '未命名帳單', fr: 'Facture sans titre', en: 'Untitled bill' },
  'notice.botRepliedDormInfo': { 'zh-CN': '机器人已回复宿舍信息', 'zh-TW': '機器人已回覆宿舍資訊', fr: 'Le robot a répondu avec les infos du dortoir', en: 'Bot replied with dorm information' },
  'notice.botNameUpdated': { 'zh-CN': '宿舍机器人名称已更新', 'zh-TW': '宿舍機器人名稱已更新', fr: 'Nom du robot mis à jour', en: 'Dorm bot name updated' },
  'notice.profileDescriptionUpdated': { 'zh-CN': '个人描述已更新', 'zh-TW': '個人描述已更新', fr: 'Description personnelle mise à jour', en: 'Profile description updated' },
  'notice.profileDescriptionUpdatedByLeader': { 'zh-CN': '你的个人描述已被舍长更新', 'zh-TW': '你的個人描述已被舍長更新', fr: 'Votre description a été mise à jour par le chef', en: 'Your profile description was updated by the leader' },
};

const STATUS_MESSAGE_FORMATTER: Record<LanguageCode, (userName: string, state: string) => string> = {
  en: (userName, state) => `${userName} is now ${state}`,
  fr: (userName, state) => `${userName} est maintenant en mode ${state}`,
  'zh-TW': (userName, state) => `${userName} 現在是 ${state} 狀態`,
  'zh-CN': (userName, state) => `${userName}现在是${state}状态`,
};

function pickText(lang: LanguageCode, map: LangText): string {
  return map[lang] || map['zh-CN'];
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function localizeTokenText(lang: LanguageCode, text: string): string | null {
  const token = decodeMessageToken(text);
  if (!token) return null;
  if (STATIC_NOTICE_TEXT[token.key]) return pickText(lang, STATIC_NOTICE_TEXT[token.key]);
  const params = token.params || {};
  if (token.key === 'notice.billSummary') {
    const name = asString(params.name) || pickText(lang, STATIC_NOTICE_TEXT['notice.untitledBill']);
    const amount = asString(params.amount);
    return `${name} · ¥${amount}`;
  }
  if (token.key === 'notice.chatFrom') {
    const userName = asString(params.userName);
    if (lang === 'en') return `New message from ${userName}`;
    if (lang === 'fr') return `Nouveau message de ${userName}`;
    if (lang === 'zh-TW') return `${userName} 發來新訊息`;
    return `${userName} 发来新消息`;
  }
  if (token.key === 'notice.dormNameChanged') {
    const name = asString(params.name);
    if (lang === 'en') return `Dorm name changed to ${name}`;
    if (lang === 'fr') return `Nom du dortoir changé en ${name}`;
    if (lang === 'zh-TW') return `宿舍名稱已改為 ${name}`;
    return `宿舍名称已改为 ${name}`;
  }
  if (token.key === 'notice.leaderTransferContent') {
    const from = asString(params.from);
    const to = asString(params.to);
    if (lang === 'en') return `${from} transferred leader rights to ${to}`;
    if (lang === 'fr') return `${from} a transféré les droits de chef à ${to}`;
    if (lang === 'zh-TW') return `${from} 已將舍長權限移交給 ${to}`;
    return `${from} 已将舍长权限移交给 ${to}`;
  }
  if (token.key === 'notice.dutyAssignedContent') {
    const date = asString(params.date);
    const task = asString(params.task);
    if (lang === 'en') return `Duty assigned for ${date}: ${task}`;
    if (lang === 'fr') return `Corvée assignée pour ${date} : ${task}`;
    if (lang === 'zh-TW') return `已安排 ${date} 的值日任務：${task}`;
    return `已安排 ${date} 的值日任务：${task}`;
  }
  if (token.key === 'notice.botNameChanged') {
    const name = asString(params.name);
    if (lang === 'en') return `Bot name changed to ${name}`;
    if (lang === 'fr') return `Nom du robot changé en ${name}`;
    if (lang === 'zh-TW') return `機器人名稱已改為 ${name}`;
    return `机器人名称已改为 ${name}`;
  }
  return text;
}

export function categoryLabel(lang: LanguageCode, category: string): string {
  const c = (category || '').trim();
  const code = c === BILL_CATEGORY_CUSTOM ? BILL_CATEGORY_CUSTOM : normalizeBillCategory(c);
  const map = CATEGORY_LABEL_MAP[lang] || CATEGORY_LABEL_MAP['zh-CN'];
  return map[code] || category;
}

export function localizeServerText(lang: LanguageCode, text: string): string {
  const tokenText = localizeTokenText(lang, text);
  if (tokenText !== null) return tokenText;
  const statusChanged = parseStatusSystemMessage(text);
  if (!statusChanged) return text;
  const format = STATUS_MESSAGE_FORMATTER[lang] || STATUS_MESSAGE_FORMATTER['zh-CN'];
  return format(statusChanged.userName, stateLabel(lang, statusChanged.state));
}
