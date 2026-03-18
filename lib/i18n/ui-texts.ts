import type { LanguageCode, MultiLangText } from './types';

export const UI_TEXTS: Record<string, MultiLangText> = {
  "home": {
    "zh-CN": "首页",
    "zh-TW": "首頁",
    "fr": "Accueil",
    "en": "Home"
  },
  "duty": {
    "zh-CN": "值日",
    "zh-TW": "值日",
    "fr": "Corvées",
    "en": "Duty"
  },
  "bills": {
    "zh-CN": "账单",
    "zh-TW": "帳單",
    "fr": "Factures",
    "en": "Bills"
  },
  "chat": {
    "zh-CN": "聊天",
    "zh-TW": "聊天",
    "fr": "Chat",
    "en": "Chat"
  },
  "notifications": {
    "zh-CN": "通知中心",
    "zh-TW": "通知中心",
    "fr": "Notifications",
    "en": "Notifications"
  },
  "settings": {
    "zh-CN": "设置",
    "zh-TW": "設定",
    "fr": "Paramètres",
    "en": "Settings"
  },
  "monthTotal": {
    "zh-CN": "本月账单总额",
    "zh-TW": "本月帳單總額",
    "fr": "Total mensuel",
    "en": "Monthly Total"
  },
  "welcomeBack": {
    "zh-CN": "欢迎回来",
    "zh-TW": "歡迎回來",
    "fr": "Bon retour",
    "en": "Welcome back"
  },
  "dormTitle": {
    "zh-CN": "和睦寝室",
    "zh-TW": "和睦寢室",
    "fr": "Harmonious Dorm",
    "en": "Harmonious Dorm"
  },
  "loginTitle": {
    "zh-CN": "和睦寝室",
    "zh-TW": "和睦寢室",
    "fr": "Harmonious Dorm",
    "en": "Harmonious Dorm"
  },
  "loginSubTitle": {
    "zh-CN": "校园宿舍生活可视化协调平台",
    "zh-TW": "校園宿舍生活可視化協調平台",
    "fr": "Plateforme de coordination de dortoir",
    "en": "Dorm collaboration platform"
  },
  "nickname": {
    "zh-CN": "昵称",
    "zh-TW": "暱稱",
    "fr": "Pseudo",
    "en": "Nickname"
  },
  "schoolEmail": {
    "zh-CN": "邮箱",
    "zh-TW": "郵箱",
    "fr": "Email",
    "en": "Email"
  },
  "inviteCodeOptional": {
    "zh-CN": "宿舍邀请码（可选）",
    "zh-TW": "宿舍邀請碼（可選）",
    "fr": "Code invitation (optionnel)",
    "en": "Invite code (optional)"
  },
  "inviteCodeForRegister": {
    "zh-CN": "宿舍邀请码（仅注册时填写，可选）",
    "zh-TW": "宿舍邀請碼（僅註冊時填寫，可選）",
    "fr": "Code invitation (inscription uniquement, optionnel)",
    "en": "Invite code (register only, optional)"
  },
  "loginMode": {
    "zh-CN": "登录",
    "zh-TW": "登入",
    "fr": "Connexion",
    "en": "Login"
  },
  "registerMode": {
    "zh-CN": "注册",
    "zh-TW": "註冊",
    "fr": "Inscription",
    "en": "Register"
  },
  "switchToLogin": {
    "zh-CN": "已有账号？去登录",
    "zh-TW": "已有帳號？去登入",
    "fr": "Déjà un compte ? Se connecter",
    "en": "Already have an account? Login"
  },
  "switchToRegister": {
    "zh-CN": "没有账号？去注册",
    "zh-TW": "沒有帳號？去註冊",
    "fr": "Pas de compte ? S’inscrire",
    "en": "No account? Register"
  },
  "enterDorm": {
    "zh-CN": "进入宿舍",
    "zh-TW": "進入宿舍",
    "fr": "Entrer",
    "en": "Enter Dorm"
  },
  "entering": {
    "zh-CN": "进入中...",
    "zh-TW": "進入中...",
    "fr": "Connexion...",
    "en": "Entering..."
  },
  "loginFailed": {
    "zh-CN": "登录失败",
    "zh-TW": "登入失敗",
    "fr": "Échec de connexion",
    "en": "Login failed"
  },
  "createDormHint": {
    "zh-CN": "不填则创建新宿舍",
    "zh-TW": "不填則建立新宿舍",
    "fr": "Vide = créer un nouveau dortoir",
    "en": "Leave empty to create a new dorm"
  },
  "inputNickname": {
    "zh-CN": "请输入昵称",
    "zh-TW": "請輸入暱稱",
    "fr": "Entrez un pseudo",
    "en": "Enter nickname"
  },
  "notifyRealtimeDesc": {
    "zh-CN": "通知与聊天支持实时推送",
    "zh-TW": "通知與聊天支援即時推送",
    "fr": "Notifications et chat en temps réel",
    "en": "Realtime notifications and chat"
  },
  "memberActivity": {
    "zh-CN": "成员动态",
    "zh-TW": "成員動態",
    "fr": "Activité des membres",
    "en": "Member Activity"
  },
  "leaderTag": {
    "zh-CN": "舍长",
    "zh-TW": "舍長",
    "fr": "Chef",
    "en": "Leader"
  },
  "dutyBoard": {
    "zh-CN": "本周值日看板",
    "zh-TW": "本週值日看板",
    "fr": "Planning des corvées",
    "en": "Weekly Duty Board"
  },
  "dutyAssign": {
    "zh-CN": "值日分配",
    "zh-TW": "值日分配",
    "fr": "Affectation",
    "en": "Assign Duty"
  },
  "leaderOnlyDutyAssign": {
    "zh-CN": "仅舍长可分配值日",
    "zh-TW": "僅舍長可分配值日",
    "fr": "Réservé au chef",
    "en": "Leader only"
  },
  "complete": {
    "zh-CN": "完成",
    "zh-TW": "完成",
    "fr": "Terminer",
    "en": "Complete"
  },
  "resetUnfinished": {
    "zh-CN": "恢复未完成",
    "zh-TW": "恢復未完成",
    "fr": "Rouvrir",
    "en": "Reopen"
  },
  "assignDuty": {
    "zh-CN": "分配值日",
    "zh-TW": "分配值日",
    "fr": "Affecter",
    "en": "Assign"
  },
  "chooseMember": {
    "zh-CN": "请选择值日成员",
    "zh-TW": "請選擇值日成員",
    "fr": "Choisissez un membre",
    "en": "Please choose a member"
  },
  "invalidDate": {
    "zh-CN": "值日日期格式错误",
    "zh-TW": "值日日期格式錯誤",
    "fr": "Date invalide",
    "en": "Invalid date format"
  },
  "chatRoom": {
    "zh-CN": "聊天",
    "zh-TW": "聊天",
    "fr": "Chat",
    "en": "Chat"
  },
  "inputMessage": {
    "zh-CN": "输入消息...",
    "zh-TW": "輸入訊息...",
    "fr": "Tapez un message...",
    "en": "Type a message..."
  },
  "billDetail": {
    "zh-CN": "账单明细",
    "zh-TW": "帳單明細",
    "fr": "Détails des factures",
    "en": "Bill Details"
  },
  "billCount": {
    "zh-CN": "账单数量",
    "zh-TW": "帳單數量",
    "fr": "Nombre",
    "en": "Bill Count"
  },
  "pendingPayment": {
    "zh-CN": "待支付",
    "zh-TW": "待支付",
    "fr": "En attente",
    "en": "Pending"
  },
  "markPaid": {
    "zh-CN": "标记支付",
    "zh-TW": "標記支付",
    "fr": "Marquer payé",
    "en": "Mark Paid"
  },
  "resetUnpaid": {
    "zh-CN": "恢复未支付",
    "zh-TW": "恢復未支付",
    "fr": "Annuler paiement",
    "en": "Reset Unpaid"
  },
  "quickBill": {
    "zh-CN": "快速记账",
    "zh-TW": "快速記帳",
    "fr": "Facture rapide",
    "en": "Quick Bill"
  },
  "billDesc": {
    "zh-CN": "账单说明",
    "zh-TW": "帳單說明",
    "fr": "Description",
    "en": "Description"
  },
  "billAmount": {
    "zh-CN": "金额",
    "zh-TW": "金額",
    "fr": "Montant",
    "en": "Amount"
  },
  "customCategory": {
    "zh-CN": "自定义类型",
    "zh-TW": "自訂類型",
    "fr": "Catégorie personnalisée",
    "en": "Custom Category"
  },
  "publish": {
    "zh-CN": "确认发布",
    "zh-TW": "確認發布",
    "fr": "Publier",
    "en": "Publish"
  },
  "all": {
    "zh-CN": "全部",
    "zh-TW": "全部",
    "fr": "Tous",
    "en": "All"
  },
  "unread": {
    "zh-CN": "未读",
    "zh-TW": "未讀",
    "fr": "Non lus",
    "en": "Unread"
  },
  "read": {
    "zh-CN": "已读",
    "zh-TW": "已讀",
    "fr": "Lus",
    "en": "Read"
  },
  "jumpTo": {
    "zh-CN": "前往",
    "zh-TW": "前往",
    "fr": "Ouvrir",
    "en": "Open"
  },
  "markRead": {
    "zh-CN": "已读",
    "zh-TW": "已讀",
    "fr": "Lu",
    "en": "Read"
  },
  "markAllRead": {
    "zh-CN": "全部已读",
    "zh-TW": "全部已讀",
    "fr": "Tout marquer comme lu",
    "en": "Mark all as read"
  },
  "jumpToLastPosition": {
    "zh-CN": "到上次位置",
    "zh-TW": "到上次位置",
    "fr": "Aller à la dernière position",
    "en": "Jump to last position"
  },
  "moreActions": {
    "zh-CN": "更多操作",
    "zh-TW": "更多操作",
    "fr": "Plus d’actions",
    "en": "More actions"
  },
  "deleteSelected": {
    "zh-CN": "删除选中",
    "zh-TW": "刪除選中",
    "fr": "Supprimer la sélection",
    "en": "Delete selected"
  },
  "markSelectedRead": {
    "zh-CN": "已读选中",
    "zh-TW": "已讀選中",
    "fr": "Marquer la sélection comme lue",
    "en": "Mark selected as read"
  },
  "selectAll": {
    "zh-CN": "全选",
    "zh-TW": "全選",
    "fr": "Tout sélectionner",
    "en": "Select all"
  },
  "clearSelection": {
    "zh-CN": "取消选择",
    "zh-TW": "取消選擇",
    "fr": "Effacer la sélection",
    "en": "Clear selection"
  },
  "selectedCount": {
    "zh-CN": "已选",
    "zh-TW": "已選",
    "fr": "Sélectionnés",
    "en": "Selected"
  },
  "userInfo": {
    "zh-CN": "用户信息",
    "zh-TW": "使用者資訊",
    "fr": "Profil",
    "en": "User Info"
  },
  "dormInfo": {
    "zh-CN": "宿舍信息",
    "zh-TW": "宿舍資訊",
    "fr": "Dortoir",
    "en": "Dorm Info"
  },
  "saveUserSettings": {
    "zh-CN": "保存用户配置",
    "zh-TW": "儲存使用者設定",
    "fr": "Sauvegarder profil",
    "en": "Save User Settings"
  },
  "saveDormName": {
    "zh-CN": "保存宿舍名称",
    "zh-TW": "儲存宿舍名稱",
    "fr": "Sauvegarder dortoir",
    "en": "Save Dorm Name"
  },
  "transferLeader": {
    "zh-CN": "移交舍长",
    "zh-TW": "移交舍長",
    "fr": "Transférer chef",
    "en": "Transfer Leader"
  },
  "dormName": {
    "zh-CN": "宿舍名称",
    "zh-TW": "宿舍名稱",
    "fr": "Nom du dortoir",
    "en": "Dorm Name"
  },
  "inviteCodeLabel": {
    "zh-CN": "宿舍邀请码",
    "zh-TW": "宿舍邀請碼",
    "fr": "Code invitation",
    "en": "Invite Code"
  },
  "copy": {
    "zh-CN": "复制",
    "zh-TW": "複製",
    "fr": "Copier",
    "en": "Copy"
  },
  "inviteCodeCopied": {
    "zh-CN": "邀请码已复制",
    "zh-TW": "邀請碼已複製",
    "fr": "Code invitation copié",
    "en": "Invite code copied"
  },
  "accountSecurity": {
    "zh-CN": "账户安全",
    "zh-TW": "帳戶安全",
    "fr": "Sécurité du compte",
    "en": "Account Security"
  },
  "changeStatusTipNormal": {
    "zh-CN": "常规模式",
    "zh-TW": "常規模式",
    "fr": "Mode normal",
    "en": "Normal mode"
  },
  "changeStatusTipStudy": {
    "zh-CN": "学习模式",
    "zh-TW": "學習模式",
    "fr": "Mode étude",
    "en": "Study mode"
  },
  "changeStatusTipSleep": {
    "zh-CN": "睡眠模式",
    "zh-TW": "睡眠模式",
    "fr": "Mode nuit",
    "en": "Sleep mode"
  },
  "changeStatusTipParty": {
    "zh-CN": "聚会模式",
    "zh-TW": "派對模式",
    "fr": "Mode fête",
    "en": "Party mode"
  },
  "uploadAvatar": {
    "zh-CN": "上传头像",
    "zh-TW": "上傳頭像",
    "fr": "Téléverser avatar",
    "en": "Upload Avatar"
  },
  "logout": {
    "zh-CN": "退出登录",
    "zh-TW": "登出",
    "fr": "Se déconnecter",
    "en": "Log Out"
  },
  "deleteAccount": {
    "zh-CN": "注销账号",
    "zh-TW": "註銷帳號",
    "fr": "Supprimer le compte",
    "en": "Delete Account"
  },
  "logoutConfirm": {
    "zh-CN": "确定退出登录吗？",
    "zh-TW": "確定要登出嗎？",
    "fr": "Voulez-vous vous déconnecter ?",
    "en": "Are you sure you want to log out?"
  },
  "deleteAccountConfirm": {
    "zh-CN": "确定注销账号吗？此操作不可恢复。",
    "zh-TW": "確定要註銷帳號嗎？此操作無法復原。",
    "fr": "Supprimer le compte ? Cette action est irréversible.",
    "en": "Delete this account? This action cannot be undone."
  },
  "languageLabel": {
    "zh-CN": "语言",
    "zh-TW": "語言",
    "fr": "Langue",
    "en": "Language"
  },
  "networkError": {
    "zh-CN": "网络请求失败，请稍后重试",
    "zh-TW": "網路請求失敗，請稍後重試",
    "fr": "Erreur réseau, veuillez réessayer",
    "en": "Network request failed, please try again later"
  },
  "requestFailed": {
    "zh-CN": "请求失败",
    "zh-TW": "請求失敗",
    "fr": "Échec de la requête",
    "en": "Request failed"
  }
};

export type UiTextKey = keyof typeof UI_TEXTS;

export function getUiText(lang: LanguageCode): Record<UiTextKey, string> {
  const entries = Object.entries(UI_TEXTS).map(([key, value]) => [key, value[lang] || value['zh-CN']]);
  return Object.fromEntries(entries) as Record<UiTextKey, string>;
}
