import type { LanguageCode } from '@/lib/i18n';

import { BILL_CATEGORY_CUSTOM } from './constants';
import { parseStatusSystemMessage, stateLabel } from './helpers';

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

export function categoryLabel(lang: LanguageCode, category: string): string {
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
  return category === BILL_CATEGORY_CUSTOM ? '自定义' : category;
}

function localizeStructuredMessage(lang: LanguageCode, text: string): string | null {
  const statusChanged = parseStatusSystemMessage(text);
  if (statusChanged) {
    const { userName, state } = statusChanged;
    if (lang === 'en') return `${userName} is now ${stateLabel(lang, state)}`;
    if (lang === 'fr') return `${userName} est maintenant en mode ${stateLabel(lang, state)}`;
    if (lang === 'zh-TW') return `${userName} 現在是 ${stateLabel(lang, state)} 狀態`;
    return `${userName}现在是${stateLabel(lang, state)}状态`;
  }

  const renamedDorm = text.match(/^宿舍名称已改为 (.+)$/);
  if (renamedDorm && lang !== 'zh-CN') {
    const name = renamedDorm[1];
    if (lang === 'en') return `Dorm name changed to ${name}`;
    if (lang === 'fr') return `Nom du dortoir changé en ${name}`;
    return `宿舍名稱已改為 ${name}`;
  }

  const transferLeader = text.match(/^(.+) 已将舍长权限移交给 (.+)$/);
  if (transferLeader && lang !== 'zh-CN') {
    const from = transferLeader[1];
    const to = transferLeader[2];
    if (lang === 'en') return `${from} transferred leader rights to ${to}`;
    if (lang === 'fr') return `${from} a transféré les droits de chef à ${to}`;
    return `${from} 已將舍長權限移交給 ${to}`;
  }

  const assignDuty = text.match(/^已安排 (.+) 的值日任务$/);
  if (assignDuty && lang !== 'zh-CN') {
    const date = assignDuty[1];
    if (lang === 'en') return `Duty assigned for ${date}`;
    if (lang === 'fr') return `Corvée assignée pour ${date}`;
    return `已安排 ${date} 的值日任務`;
  }

  const chatTitle = text.match(/^(.+) 发来新消息$/);
  if (chatTitle && lang !== 'zh-CN') {
    const userName = chatTitle[1];
    if (lang === 'en') return `New message from ${userName}`;
    if (lang === 'fr') return `Nouveau message de ${userName}`;
    return `${userName} 發來新訊息`;
  }

  return null;
}

export function localizeServerText(lang: LanguageCode, text: string): string {
  const key = SOURCE_TO_KEY[text];
  if (key && STATIC_TEXT_BY_KEY[key]) return STATIC_TEXT_BY_KEY[key][lang];
  return localizeStructuredMessage(lang, text) || text;
}