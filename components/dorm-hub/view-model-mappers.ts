import { LIMITS } from '@/lib/limits';
import type { LanguageCode } from '@/lib/i18n';
import type { BillSummary } from '@/lib/types';
import { allocateAmounts } from '@/lib/share-allocation';
import type { ChartPoint, LineSeries } from './ui-types';

import { monthHeader, weekStartLabel } from './ui-helpers';
import { categoryLabel } from './i18n-adapter';

type LangMap = Record<LanguageCode, string>;

type ErrorText = {
  chooseMember: string;
  invalidDate: string;
  amountRequired: string;
  amountNotNumber: string;
  amountGtZero: string;
  amountMax: string;
  amountDecimal: string;
  participantsRequired: string;
  customCategoryRequired: string;
  messageRequired: string;
  messageTooLong: string;
  nameTooLong: string;
  dormNameTooLong: string;
  billDescTooLong: string;
  customCategoryTooLong: string;
  memberDescriptionTooLong: string;
  botNameTooLong: string;
  botSettingKeyTooLong: string;
  botSettingValueTooLong: string;
  botOtherTooLong: string;
  botSettingsTooMany: string;
  dormNameRequired: string;
  transferTargetRequired: string;
  avatarRequired: string;
  avatarUploadFailed: string;
  dutyTaskRequired: string;
  dutyTaskTooLong: string;
  weightInvalid: string;
  weightTooLarge: string;
  weightAllZero: string;
};

type PanelText = {
  month: string;
  quarter: string;
  year: string;
  byMonth: string;
  byDay: string;
  billPie: string;
  billLine: string;
  billLineByCategory: string;
  unpaidBills: string;
  paidBills: string;
  dutyPie: string;
  dutyByMemberPie: string;
  dutyLine: string;
  dutyLineByMember: string;
  doneList: string;
  showMore: string;
  showLess: string;
  pendingTasks: string;
  popupNewNotice: string;
  splitEqual: string;
  splitWeight: string;
  billWeight: string;
  dutyTaskPlaceholder: string;
};

type SettingsText = {
  changeAvatarTitle: string;
  botLabel: string;
  botNamePlaceholder: string;
  changeBotAvatarTitle: string;
  botSettingsLabel: string;
  memberDescLabel: string;
  memberDescPlaceholder: string;
  botOtherContentLabel: string;
  botOtherContentPlaceholder: string;
  botSettingKeyLabel: string;
  botSettingValueLabel: string;
  addFieldLabel: string;
  removeFieldLabel: string;
  noFieldsYet: string;
};

const DEFAULT_LANG: LanguageCode = 'zh-CN';

function pick(lang: LanguageCode | undefined, map: LangMap): string {
  return map[lang || DEFAULT_LANG] || map[DEFAULT_LANG];
}

function perLang(value: string): LangMap {
  return { 'zh-CN': value, 'zh-TW': value, fr: value, en: value };
}

const PANEL_TEXT_MAP: Record<keyof PanelText, LangMap> = {
  month: { 'zh-CN': '月份', 'zh-TW': '月份', fr: 'Mois', en: 'Month' },
  quarter: { 'zh-CN': '季度', 'zh-TW': '季度', fr: 'Trimestre', en: 'Quarter' },
  year: { 'zh-CN': '年份', 'zh-TW': '年份', fr: 'Annee', en: 'Year' },
  byMonth: { 'zh-CN': '按月', 'zh-TW': '按月', fr: 'Par mois', en: 'By month' },
  byDay: { 'zh-CN': '按日', 'zh-TW': '按日', fr: 'Par jour', en: 'By day' },
  billPie: { 'zh-CN': '分类占比', 'zh-TW': '分類占比', fr: 'Part des categories', en: 'Category Share' },
  billLine: { 'zh-CN': '金额趋势', 'zh-TW': '金額趨勢', fr: 'Tendance des montants', en: 'Amount Trend' },
  billLineByCategory: { 'zh-CN': '分类金额趋势', 'zh-TW': '分類金額趨勢', fr: 'Tendance par categorie', en: 'Category Amount Trend' },
  unpaidBills: { 'zh-CN': '待支付账单', 'zh-TW': '待支付帳單', fr: 'Factures a payer', en: 'Pending Payment Bills' },
  paidBills: { 'zh-CN': '已支付账单', 'zh-TW': '已支付帳單', fr: 'Factures payees', en: 'Paid Bills' },
  dutyPie: { 'zh-CN': '任务状态占比', 'zh-TW': '任務狀態占比', fr: 'Part des statuts de tache', en: 'Task Status Share' },
  dutyByMemberPie: { 'zh-CN': '完成人占比', 'zh-TW': '完成者占比', fr: 'Taches terminees par membre', en: 'Completed By Member' },
  dutyLine: { 'zh-CN': '任务趋势', 'zh-TW': '任務趨勢', fr: 'Tendance des taches', en: 'Task Trend' },
  dutyLineByMember: { 'zh-CN': '成员完成趋势', 'zh-TW': '成員完成趨勢', fr: 'Tendance de completion par membre', en: 'Member Completion Trend' },
  doneList: { 'zh-CN': '完成列表', 'zh-TW': '完成列表', fr: 'Liste terminee', en: 'Completed List' },
  showMore: { 'zh-CN': '显示全部', 'zh-TW': '顯示全部', fr: 'Tout afficher', en: 'Show all' },
  showLess: { 'zh-CN': '收起', 'zh-TW': '收起', fr: 'Replier', en: 'Collapse' },
  pendingTasks: { 'zh-CN': '待完成任务', 'zh-TW': '待完成任務', fr: 'Taches en attente', en: 'Pending Tasks' },
  popupNewNotice: { 'zh-CN': '新通知', 'zh-TW': '新通知', fr: 'Nouvelle notification', en: 'New notification' },
  splitEqual: { 'zh-CN': '平均分摊', 'zh-TW': '平均分攤', fr: 'Partage egal', en: 'Split equally' },
  splitWeight: { 'zh-CN': '按权重分摊', 'zh-TW': '按權重分攤', fr: 'Partage par poids', en: 'Split by weight' },
  billWeight: { 'zh-CN': '权重', 'zh-TW': '權重', fr: 'Poids', en: 'Weight' },
  dutyTaskPlaceholder: { 'zh-CN': '值日任务（例如：拖地）', 'zh-TW': '值日任務（例如：拖地）', fr: 'Tache (ex: laver le sol)', en: 'Duty task (e.g. mop floor)' },
};

export function buildPanelText(language: LanguageCode | undefined): PanelText {
  return Object.fromEntries(
    Object.entries(PANEL_TEXT_MAP).map(([key, map]) => [key, pick(language, map)]),
  ) as PanelText;
}

export function buildErrorText(language: LanguageCode | undefined, t: any): ErrorText {
  const staticMap: Omit<ErrorText, 'chooseMember' | 'invalidDate' | 'messageTooLong' | 'nameTooLong' | 'dormNameTooLong' | 'billDescTooLong' | 'customCategoryTooLong' | 'memberDescriptionTooLong' | 'botNameTooLong' | 'botSettingKeyTooLong' | 'botSettingValueTooLong' | 'botOtherTooLong' | 'botSettingsTooMany' | 'dutyTaskTooLong' | 'weightTooLarge'> = {
    amountRequired: pick(language, { 'zh-CN': '请输入账单金额', 'zh-TW': '請輸入帳單金額', fr: 'Veuillez saisir le montant', en: 'Please enter bill amount' }),
    amountNotNumber: pick(language, { 'zh-CN': '账单金额必须是数字', 'zh-TW': '帳單金額必須是數字', fr: 'Le montant doit être un nombre', en: 'Bill amount must be a number' }),
    amountGtZero: pick(language, { 'zh-CN': '账单金额必须大于 0', 'zh-TW': '帳單金額必須大於 0', fr: 'Le montant doit être supérieur à 0', en: 'Bill amount must be greater than 0' }),
    amountMax: pick(language, { 'zh-CN': '账单金额不能超过 1000000', 'zh-TW': '帳單金額不能超過 1000000', fr: 'Le montant ne peut pas dépasser 1000000', en: 'Amount cannot exceed 1000000' }),
    amountDecimal: pick(language, { 'zh-CN': '账单金额最多保留两位小数', 'zh-TW': '帳單金額最多保留兩位小數', fr: 'Le montant accepte au plus 2 décimales', en: 'Amount can have at most 2 decimal places' }),
    participantsRequired: pick(language, { 'zh-CN': '至少选择一位参与成员', 'zh-TW': '至少選擇一位參與成員', fr: 'Sélectionnez au moins un participant', en: 'Please select at least one participant' }),
    customCategoryRequired: pick(language, { 'zh-CN': '请输入自定义消费类型', 'zh-TW': '請輸入自訂消費類型', fr: 'Veuillez saisir une catégorie personnalisée', en: 'Please enter custom category' }),
    messageRequired: pick(language, { 'zh-CN': '消息不能为空', 'zh-TW': '訊息不能為空', fr: 'Le message ne peut pas être vide', en: 'Message cannot be empty' }),
    dormNameRequired: pick(language, { 'zh-CN': '宿舍名称不能为空', 'zh-TW': '宿舍名稱不能為空', fr: 'Le nom du dortoir est requis', en: 'Dorm name cannot be empty' }),
    transferTargetRequired: pick(language, { 'zh-CN': '请选择移交对象', 'zh-TW': '請選擇移交對象', fr: 'Veuillez choisir un utilisateur', en: 'Please choose a target user' }),
    avatarRequired: pick(language, { 'zh-CN': '请选择头像文件', 'zh-TW': '請選擇頭像檔案', fr: 'Veuillez choisir un fichier avatar', en: 'Please choose an avatar file' }),
    avatarUploadFailed: pick(language, { 'zh-CN': '头像上传失败', 'zh-TW': '頭像上傳失敗', fr: 'Échec du téléversement de l’avatar', en: 'Avatar upload failed' }),
    dutyTaskRequired: pick(language, { 'zh-CN': '请输入值日任务', 'zh-TW': '請輸入值日任務', fr: 'Veuillez saisir la tâche', en: 'Please input duty task' }),
    weightInvalid: pick(language, { 'zh-CN': '权重必须是大于等于 0 的数字', 'zh-TW': '權重必須是大於等於 0 的數字', fr: 'Le poids doit être un nombre non négatif', en: 'Weight must be a non-negative number' }),
    weightAllZero: pick(language, { 'zh-CN': '至少需要一位成员支付', 'zh-TW': '至少需要一位成員支付', fr: 'Au moins un participant doit payer', en: 'At least one participant must pay' }),
  };

  return {
    chooseMember: t.chooseMember,
    invalidDate: t.invalidDate,
    messageTooLong: pick(language, { 'zh-CN': `消息不能超过 ${LIMITS.CHAT_USER_CONTENT} 字`, 'zh-TW': `訊息不能超過 ${LIMITS.CHAT_USER_CONTENT} 字`, fr: `Le message ne peut pas dépasser ${LIMITS.CHAT_USER_CONTENT} caractères`, en: `Message cannot exceed ${LIMITS.CHAT_USER_CONTENT} characters` }),
    nameTooLong: pick(language, { 'zh-CN': `昵称不能超过 ${LIMITS.USER_NAME} 字`, 'zh-TW': `暱稱不能超過 ${LIMITS.USER_NAME} 字`, fr: `Le pseudo ne peut pas dépasser ${LIMITS.USER_NAME} caractères`, en: `Nickname cannot exceed ${LIMITS.USER_NAME} characters` }),
    dormNameTooLong: pick(language, { 'zh-CN': `宿舍名称不能超过 ${LIMITS.DORM_NAME} 字`, 'zh-TW': `宿舍名稱不能超過 ${LIMITS.DORM_NAME} 字`, fr: `Le nom du dortoir ne peut pas dépasser ${LIMITS.DORM_NAME} caractères`, en: `Dorm name cannot exceed ${LIMITS.DORM_NAME} characters` }),
    billDescTooLong: pick(language, { 'zh-CN': `账单说明不能超过 ${LIMITS.BILL_DESCRIPTION} 字`, 'zh-TW': `帳單說明不能超過 ${LIMITS.BILL_DESCRIPTION} 字`, fr: `La description de la facture ne peut pas dépasser ${LIMITS.BILL_DESCRIPTION} caractères`, en: `Bill description cannot exceed ${LIMITS.BILL_DESCRIPTION} characters` }),
    customCategoryTooLong: pick(language, { 'zh-CN': `自定义账单类型不能超过 ${LIMITS.BILL_CUSTOM_CATEGORY} 字`, 'zh-TW': `自訂類型不能超過 ${LIMITS.BILL_CUSTOM_CATEGORY} 字`, fr: `La catégorie personnalisée ne peut pas dépasser ${LIMITS.BILL_CUSTOM_CATEGORY} caractères`, en: `Custom category cannot exceed ${LIMITS.BILL_CUSTOM_CATEGORY} characters` }),
    memberDescriptionTooLong: pick(language, { 'zh-CN': `成员描述不能超过 ${LIMITS.MEMBER_DESCRIPTION} 字`, 'zh-TW': `成員描述不能超過 ${LIMITS.MEMBER_DESCRIPTION} 字`, fr: `La description du membre ne peut pas dépasser ${LIMITS.MEMBER_DESCRIPTION} caractères`, en: `Member description cannot exceed ${LIMITS.MEMBER_DESCRIPTION} characters` }),
    botNameTooLong: pick(language, { 'zh-CN': `机器人名称不能超过 ${LIMITS.BOT_NAME} 字`, 'zh-TW': `機器人名稱不能超過 ${LIMITS.BOT_NAME} 字`, fr: `Le nom du robot ne peut pas dépasser ${LIMITS.BOT_NAME} caractères`, en: `Bot name cannot exceed ${LIMITS.BOT_NAME} characters` }),
    botSettingKeyTooLong: pick(language, { 'zh-CN': `机器人设定键不能超过 ${LIMITS.BOT_SETTING_KEY} 字`, 'zh-TW': `機器人設定鍵不能超過 ${LIMITS.BOT_SETTING_KEY} 字`, fr: `La clé du paramètre du robot ne peut pas dépasser ${LIMITS.BOT_SETTING_KEY} caractères`, en: `Bot setting key cannot exceed ${LIMITS.BOT_SETTING_KEY} characters` }),
    botSettingValueTooLong: pick(language, { 'zh-CN': `机器人设定值不能超过 ${LIMITS.BOT_SETTING_VALUE} 字`, 'zh-TW': `機器人設定值不能超過 ${LIMITS.BOT_SETTING_VALUE} 字`, fr: `La valeur du paramètre du robot ne peut pas dépasser ${LIMITS.BOT_SETTING_VALUE} caractères`, en: `Bot setting value cannot exceed ${LIMITS.BOT_SETTING_VALUE} characters` }),
    botOtherTooLong: pick(language, { 'zh-CN': `机器人的其他内容不能超过 ${LIMITS.BOT_OTHER_CONTENT} 字`, 'zh-TW': `機器人的其他內容不能超過 ${LIMITS.BOT_OTHER_CONTENT} 字`, fr: `Le contenu supplémentaire du robot ne peut pas dépasser ${LIMITS.BOT_OTHER_CONTENT} caractères`, en: `Bot extra content cannot exceed ${LIMITS.BOT_OTHER_CONTENT} characters` }),
    botSettingsTooMany: pick(language, { 'zh-CN': `机器人设定不能超过 ${LIMITS.BOT_SETTINGS_ITEMS} 条`, 'zh-TW': `機器人設定不能超過 ${LIMITS.BOT_SETTINGS_ITEMS} 條`, fr: `Les paramètres du robot ne peuvent pas dépasser ${LIMITS.BOT_SETTINGS_ITEMS} éléments`, en: `Bot settings cannot exceed ${LIMITS.BOT_SETTINGS_ITEMS} items` }),
    dutyTaskTooLong: pick(language, { 'zh-CN': `值日任务不能超过 ${LIMITS.DUTY_TASK} 字`, 'zh-TW': `值日任務不能超過 ${LIMITS.DUTY_TASK} 字`, fr: `La tâche ne peut pas dépasser ${LIMITS.DUTY_TASK} caractères`, en: `Duty task cannot exceed ${LIMITS.DUTY_TASK} characters` }),
    weightTooLarge: pick(language, { 'zh-CN': `权重不能超过 ${LIMITS.BILL_WEIGHT}`, 'zh-TW': `權重不能超過 ${LIMITS.BILL_WEIGHT}`, fr: `Le poids ne peut pas dépasser ${LIMITS.BILL_WEIGHT}`, en: `Weight cannot exceed ${LIMITS.BILL_WEIGHT}` }),
    ...staticMap,
    amountRequired: staticMap.amountRequired,
    amountNotNumber: staticMap.amountNotNumber,
    amountGtZero: staticMap.amountGtZero,
    amountMax: staticMap.amountMax,
    amountDecimal: staticMap.amountDecimal,
    participantsRequired: staticMap.participantsRequired,
    customCategoryRequired: staticMap.customCategoryRequired,
    messageRequired: staticMap.messageRequired,
    dormNameRequired: staticMap.dormNameRequired,
    transferTargetRequired: staticMap.transferTargetRequired,
    avatarRequired: staticMap.avatarRequired,
    avatarUploadFailed: staticMap.avatarUploadFailed,
    dutyTaskRequired: staticMap.dutyTaskRequired,
    weightInvalid: staticMap.weightInvalid,
    weightAllZero: staticMap.weightAllZero,
  };
}

const SETTINGS_TEXT_MAP: Record<keyof SettingsText, LangMap> = {
  changeAvatarTitle: { 'zh-CN': '更换头像', 'zh-TW': '更換頭像', fr: 'Changer l’avatar', en: 'Change avatar' },
  botLabel: { 'zh-CN': '宿舍机器人', 'zh-TW': '宿舍機器人', fr: 'Robot du dortoir', en: 'Dorm Bot' },
  botNamePlaceholder: { 'zh-CN': '机器人名称', 'zh-TW': '機器人名稱', fr: 'Nom du robot', en: 'Bot name' },
  changeBotAvatarTitle: { 'zh-CN': '更换机器人头像', 'zh-TW': '更換機器人頭像', fr: 'Changer l’avatar du robot', en: 'Change bot avatar' },
  botSettingsLabel: { 'zh-CN': '机器人设定', 'zh-TW': '機器人設定', fr: 'Paramètres du robot', en: 'Bot Settings' },
  memberDescLabel: { 'zh-CN': '成员描述', 'zh-TW': '成員描述', fr: 'Description des membres', en: 'Member Description' },
  memberDescPlaceholder: { 'zh-CN': '写一段自我介绍...', 'zh-TW': '寫一段自我介紹...', fr: 'Écrivez une courte présentation...', en: 'Write a short self-introduction...' },
  botOtherContentLabel: { 'zh-CN': '机器人的其他内容', 'zh-TW': '機器人的其他內容', fr: 'Autres contenus du robot', en: 'Bot Other Content' },
  botOtherContentPlaceholder: { 'zh-CN': '输入机器人的额外内容...', 'zh-TW': '輸入機器人的額外內容...', fr: 'Saisissez du contenu supplémentaire du robot...', en: 'Input additional bot content...' },
  botSettingKeyLabel: { 'zh-CN': '字段名', 'zh-TW': '欄位名', fr: 'Nom du champ', en: 'Field name' },
  botSettingValueLabel: { 'zh-CN': '字段值', 'zh-TW': '欄位值', fr: 'Valeur du champ', en: 'Field value' },
  addFieldLabel: { 'zh-CN': '新增字段', 'zh-TW': '新增欄位', fr: 'Ajouter un champ', en: 'Add field' },
  removeFieldLabel: { 'zh-CN': '删除', 'zh-TW': '刪除', fr: 'Supprimer', en: 'Remove' },
  noFieldsYet: { 'zh-CN': '暂无字段', 'zh-TW': '暫無欄位', fr: 'Aucun champ', en: 'No fields yet' },
};

export function buildSettingsText(language: LanguageCode | undefined): SettingsText {
  return Object.fromEntries(
    Object.entries(SETTINGS_TEXT_MAP).map(([key, map]) => [key, pick(language, map)]),
  ) as SettingsText;
}

export function calcMonthTotal(billsRows: BillSummary[]): number {
  return billsRows.reduce((sum, item) => {
    const date = new Date(item.createdAt);
    const now = new Date();
    if (date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) return sum;
    return sum + item.total;
  }, 0);
}

export function calcPreviewAmounts(
  billTotal: string,
  participants: number[],
  participantWeights: Record<number, string>,
): Map<number, number> {
  const total = Number(billTotal);
  if (!Number.isFinite(total) || total <= 0 || participants.length === 0) return new Map<number, number>();
  const rows = participants.map((userId) => {
    const raw = participantWeights[userId];
    const parsed = raw == null || raw === '' ? 1 : Number(raw);
    return { userId, weight: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0 };
  });
  return allocateAmounts(total, participants, rows);
}

export function groupBillsByMonth(bills: BillSummary[], paid: boolean): Array<[string, BillSummary[]]> {
  const map = new Map<string, BillSummary[]>();
  bills
    .filter((bill) => bill.myPaid === paid)
    .forEach((bill) => {
      const key = monthHeader(bill.createdAt);
      map.set(key, [...(map.get(key) || []), bill]);
    });
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function splitDutyLists<T extends { completed: boolean }>(rows: T[]) {
  const pending = rows.filter((item) => !item.completed);
  const done = rows.filter((item) => item.completed);
  return { pending, done };
}

export function groupDutiesByWeek<T extends { date: string }>(items: T[]): Array<[string, T[]]> {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = weekStartLabel(item.date);
    map.set(key, [...(map.get(key) || []), item]);
  });
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

export function mapBillChartViewModel(
  language: LanguageCode | undefined,
  data: { pieData?: ChartPoint[]; lineData?: ChartPoint[]; categoryLineSeries?: LineSeries[] } | undefined,
) {
  return {
    billPieData: (data?.pieData || []).map((item) => ({ label: categoryLabel(language || 'zh-CN', item.label), value: item.value })),
    billLineData: data?.lineData || [],
    billCategoryLineSeries: (data?.categoryLineSeries || []).map((line) => ({
      name: categoryLabel(language || 'zh-CN', line.name),
      points: line.points,
    })),
  };
}

export function mapDutyChartViewModel(
  language: LanguageCode | undefined,
  data: { pieData?: ChartPoint[]; memberPieData?: ChartPoint[]; lineData?: ChartPoint[]; memberLineSeries?: LineSeries[] } | undefined,
) {
  const dutyStateLabelMap: Record<'completed' | 'pending', LangMap> = {
    completed: { 'zh-CN': '已完成', 'zh-TW': '已完成', fr: 'Termine', en: 'Completed' },
    pending: { 'zh-CN': '未完成', 'zh-TW': '未完成', fr: 'En attente', en: 'Pending' },
  };
  return {
    dutyPieData: (data?.pieData || []).map((item) => ({
      label: item.label === 'completed'
        ? pick(language, dutyStateLabelMap.completed)
        : pick(language, dutyStateLabelMap.pending),
      value: item.value,
    })),
    dutyLineData: data?.lineData || [],
    dutyByMemberPieData: data?.memberPieData || [],
    dutyMemberLineSeries: data?.memberLineSeries || [],
  };
}
