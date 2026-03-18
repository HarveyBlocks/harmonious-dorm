import type { LanguageCode, MultiLangText } from './types';

export const BACKEND_MESSAGES: Record<string, MultiLangText> = {
  "请求体 JSON 格式错误": {
    "zh-CN": "请求体 JSON 格式错误",
    "zh-TW": "請求 JSON 格式錯誤",
    "fr": "Format JSON invalide",
    "en": "Invalid JSON body"
  },
  "服务器内部错误": {
    "zh-CN": "服务器内部错误",
    "zh-TW": "伺服器內部錯誤",
    "fr": "Erreur interne du serveur",
    "en": "Internal server error"
  },
  "请先登录": {
    "zh-CN": "请先登录",
    "zh-TW": "請先登入",
    "fr": "Veuillez vous connecter",
    "en": "Please log in first"
  },
  "动态接口": {
    "zh-CN": "动态接口",
    "zh-TW": "動態介面",
    "fr": "API dynamique",
    "en": "Dynamic API"
  },
  "缺少头像文件": {
    "zh-CN": "缺少头像文件",
    "zh-TW": "缺少頭像檔案",
    "fr": "Fichier avatar manquant",
    "en": "Avatar file is required"
  },
  "头像文件大小必须在 0-5MB": {
    "zh-CN": "头像文件大小必须在 0-5MB",
    "zh-TW": "頭像檔案大小需在 0-5MB",
    "fr": "La taille de l’avatar doit être entre 0 et 5MB",
    "en": "Avatar size must be between 0 and 5MB"
  },
  "头像仅支持 PNG/JPG/WEBP": {
    "zh-CN": "头像仅支持 PNG/JPG/WEBP",
    "zh-TW": "頭像僅支援 PNG/JPG/WEBP",
    "fr": "Avatar: PNG/JPG/WEBP uniquement",
    "en": "Avatar only supports PNG/JPG/WEBP"
  },
  "账单金额必须大于 0": {
    "zh-CN": "账单金额必须大于 0",
    "zh-TW": "帳單金額必須大於 0",
    "fr": "Le montant doit être supérieur à 0",
    "en": "Bill amount must be greater than 0"
  },
  "账单金额最多保留两位小数": {
    "zh-CN": "账单金额最多保留两位小数",
    "zh-TW": "帳單金額最多保留兩位小數",
    "fr": "Le montant accepte au plus 2 décimales",
    "en": "Amount can have at most 2 decimal places"
  },
  "至少选择一位参与人": {
    "zh-CN": "至少选择一位参与人",
    "zh-TW": "至少選擇一位參與人",
    "fr": "Sélectionnez au moins un participant",
    "en": "Please select at least one participant"
  },
  "消息不能为空": {
    "zh-CN": "消息不能为空",
    "zh-TW": "訊息不能為空",
    "fr": "Le message ne peut pas être vide",
    "en": "Message cannot be empty"
  },
  "请求参数校验失败": {
    "zh-CN": "请求参数校验失败",
    "zh-TW": "請求參數驗證失敗",
    "fr": "Validation des paramètres échouée",
    "en": "Request validation failed"
  },
  "登录状态失效，请重新登录": {
    "zh-CN": "登录状态失效，请重新登录",
    "zh-TW": "登入狀態失效，請重新登入",
    "fr": "Session expirée, veuillez vous reconnecter",
    "en": "Session expired, please sign in again"
  },
  "week 参数格式错误，应为 YYYY-MM-DD": {
    "zh-CN": "week 参数格式错误，应为 YYYY-MM-DD",
    "zh-TW": "week 參數格式錯誤，應為 YYYY-MM-DD",
    "fr": "Paramètre week invalide, format YYYY-MM-DD requis",
    "en": "Invalid week parameter, expected YYYY-MM-DD"
  },
  "参与人必须属于当前宿舍": {
    "zh-CN": "参与人必须属于当前宿舍",
    "zh-TW": "參與人必須屬於目前宿舍",
    "fr": "Les participants doivent appartenir au dortoir courant",
    "en": "Participants must belong to the current dorm"
  },
  "只能标记自己的支付状态": {
    "zh-CN": "只能标记自己的支付状态",
    "zh-TW": "只能標記自己的支付狀態",
    "fr": "Vous ne pouvez modifier que votre propre statut de paiement",
    "en": "You can only update your own payment status"
  },
  "账单不存在": {
    "zh-CN": "账单不存在",
    "zh-TW": "帳單不存在",
    "fr": "Facture introuvable",
    "en": "Bill not found"
  },
  "你不在该账单参与列表中": {
    "zh-CN": "你不在该账单参与列表中",
    "zh-TW": "你不在該帳單參與列表中",
    "fr": "Vous ne faites pas partie de cette facture",
    "en": "You are not a participant of this bill"
  },
  "只有舍长可以分配值日": {
    "zh-CN": "只有舍长可以分配值日",
    "zh-TW": "只有舍長可以分配值日",
    "fr": "Seul le chef peut affecter les corvées",
    "en": "Only the leader can assign duties"
  },
  "被分配用户不在当前宿舍": {
    "zh-CN": "被分配用户不在当前宿舍",
    "zh-TW": "被分配使用者不在目前宿舍",
    "fr": "L’utilisateur assigné n’appartient pas au dortoir",
    "en": "Assigned user is not in the current dorm"
  },
  "值日记录不存在": {
    "zh-CN": "值日记录不存在",
    "zh-TW": "值日紀錄不存在",
    "fr": "Corvée introuvable",
    "en": "Duty record not found"
  },
  "值日 ID 无效": {
    "zh-CN": "值日 ID 无效",
    "zh-TW": "值日 ID 無效",
    "fr": "ID de corvée invalide",
    "en": "Invalid duty ID"
  },
  "只能完成自己的值日任务": {
    "zh-CN": "只能完成自己的值日任务",
    "zh-TW": "只能完成自己的值日任務",
    "fr": "Vous ne pouvez terminer que vos propres corvées",
    "en": "You can only complete your own duty"
  },
  "只有舍长可以删除值日任务": {
    "zh-CN": "只有舍长可以删除值日任务",
    "zh-TW": "只有舍長可以刪除值日任務",
    "fr": "Seul le chef peut supprimer une corvée",
    "en": "Only the leader can delete duty tasks"
  },
  "只有舍长可以修改宿舍名称": {
    "zh-CN": "只有舍长可以修改宿舍名称",
    "zh-TW": "只有舍長可以修改宿舍名稱",
    "fr": "Seul le chef peut modifier le nom du dortoir",
    "en": "Only the leader can change dorm name"
  },
  "只有舍长可以移交权限": {
    "zh-CN": "只有舍长可以移交权限",
    "zh-TW": "只有舍長可以移交權限",
    "fr": "Seul le chef peut transférer les droits",
    "en": "Only the leader can transfer leadership"
  },
  "目标用户不存在": {
    "zh-CN": "目标用户不存在",
    "zh-TW": "目標使用者不存在",
    "fr": "Utilisateur cible introuvable",
    "en": "Target user not found"
  },
  "不能移交给自己": {
    "zh-CN": "不能移交给自己",
    "zh-TW": "不能移交給自己",
    "fr": "Impossible de transférer à vous-même",
    "en": "Cannot transfer to yourself"
  },
  "status 参数错误": {
    "zh-CN": "status 参数错误",
    "zh-TW": "status 參數錯誤",
    "fr": "Paramètre status invalide",
    "en": "Invalid status parameter"
  },
  "批量操作 action 无效": {
    "zh-CN": "批量操作 action 无效",
    "zh-TW": "批量操作 action 無效",
    "fr": "Action de traitement par lot invalide",
    "en": "Invalid batch action"
  },
  "selectAll 参数错误": {
    "zh-CN": "selectAll 参数错误",
    "zh-TW": "selectAll 參數錯誤",
    "fr": "Paramètre selectAll invalide",
    "en": "Invalid selectAll parameter"
  },
  "types 参数错误": {
    "zh-CN": "types 参数错误",
    "zh-TW": "types 參數錯誤",
    "fr": "Paramètre types invalide",
    "en": "Invalid types parameter"
  },
  "只有舍长可以设置机器人": {
    "zh-CN": "只有舍长可以设置机器人",
    "zh-TW": "只有舍長可以設定機器人",
    "fr": "Seul le chef peut configurer le robot",
    "en": "Only the leader can configure the bot"
  },
  "仅舍长可以修改其他成员描述": {
    "zh-CN": "仅舍长可以修改其他成员描述",
    "zh-TW": "僅舍長可以修改其他成員描述",
    "fr": "Seul le chef peut modifier la description des autres membres",
    "en": "Only the leader can edit other members descriptions"
  },
  "账单 ID 无效": {
    "zh-CN": "账单 ID 无效",
    "zh-TW": "帳單 ID 無效",
    "fr": "ID de facture invalide",
    "en": "Invalid bill ID"
  },
  "通知 ID 无效": {
    "zh-CN": "通知 ID 无效",
    "zh-TW": "通知 ID 無效",
    "fr": "ID de notification invalide",
    "en": "Invalid notification ID"
  },
  "用户不存在": {
    "zh-CN": "用户不存在",
    "zh-TW": "使用者不存在",
    "fr": "Utilisateur introuvable",
    "en": "User not found"
  },
  "缺少可更新字段": {
    "zh-CN": "缺少可更新字段",
    "zh-TW": "缺少可更新欄位",
    "fr": "Aucun champ à mettre à jour",
    "en": "No updatable field provided"
  },
  "该昵称在宿舍内已被使用": {
    "zh-CN": "该昵称在宿舍内已被使用",
    "zh-TW": "該暱稱在宿舍內已被使用",
    "fr": "Ce pseudo est déjà utilisé dans le dortoir",
    "en": "This nickname is already used in the dorm"
  },
  "邀请码生成失败，请重试": {
    "zh-CN": "邀请码生成失败，请重试",
    "zh-TW": "邀請碼生成失敗，請重試",
    "fr": "Échec de génération du code d’invitation, réessayez",
    "en": "Failed to generate invite code, please retry"
  },
  "昵称不能为空": {
    "zh-CN": "昵称不能为空",
    "zh-TW": "暱稱不能為空",
    "fr": "Le pseudo ne peut pas être vide",
    "en": "Nickname cannot be empty"
  },
  "邮箱不能为空": {
    "zh-CN": "邮箱不能为空",
    "zh-TW": "電子郵箱不能為空",
    "fr": "L’email ne peut pas être vide",
    "en": "Email cannot be empty"
  },
  "邮箱格式错误": {
    "zh-CN": "邮箱格式错误",
    "zh-TW": "電子郵箱格式錯誤",
    "fr": "Format email invalide",
    "en": "Invalid email format"
  },
  "请使用学校邮箱": {
    "zh-CN": "请使用学校邮箱",
    "zh-TW": "請使用學校郵箱",
    "fr": "Veuillez utiliser un email scolaire",
    "en": "Please use a school email"
  },
  "该邮箱未注册，请先注册": {
    "zh-CN": "该邮箱未注册，请先注册",
    "zh-TW": "該郵箱未註冊，請先註冊",
    "fr": "Cet email n’est pas inscrit, veuillez vous inscrire",
    "en": "This email is not registered, please register first"
  },
  "邀请码不存在": {
    "zh-CN": "邀请码不存在",
    "zh-TW": "邀請碼不存在",
    "fr": "Code invitation introuvable",
    "en": "Invite code does not exist"
  },
  "昵称最多 20 字": {
    "zh-CN": "昵称最多 20 字",
    "zh-TW": "暱稱最多 20 字",
    "fr": "Le pseudo doit contenir au plus 20 caractères",
    "en": "Nickname must be at most 20 characters"
  },
  "日期格式必须为 YYYY-MM-DD": {
    "zh-CN": "日期格式必须为 YYYY-MM-DD",
    "zh-TW": "日期格式必須為 YYYY-MM-DD",
    "fr": "Le format de date doit être YYYY-MM-DD",
    "en": "Date format must be YYYY-MM-DD"
  },
  "时间参数错误": {
    "zh-CN": "时间参数错误",
    "zh-TW": "時間參數錯誤",
    "fr": "Paramètre de temps invalide",
    "en": "Invalid time parameter"
  },
  "账单金额无效": {
    "zh-CN": "账单金额无效",
    "zh-TW": "帳單金額無效",
    "fr": "Montant de facture invalide",
    "en": "Invalid bill amount"
  },
  "账单金额不能超过 1000000": {
    "zh-CN": "账单金额不能超过 1000000",
    "zh-TW": "帳單金額不能超過 1000000",
    "fr": "Le montant ne peut pas dépasser 1000000",
    "en": "Amount cannot exceed 1000000"
  },
  "账单描述最多 120 字": {
    "zh-CN": "账单描述最多 120 字",
    "zh-TW": "帳單描述最多 120 字",
    "fr": "La description doit contenir au plus 120 caractères",
    "en": "Bill description must be at most 120 characters"
  },
  "消费类型不能为空": {
    "zh-CN": "消费类型不能为空",
    "zh-TW": "消費類型不能為空",
    "fr": "La catégorie ne peut pas être vide",
    "en": "Category cannot be empty"
  },
  "消费类型过长": {
    "zh-CN": "消费类型过长",
    "zh-TW": "消費類型過長",
    "fr": "Catégorie trop longue",
    "en": "Category is too long"
  },
  "自定义类型最多 30 字": {
    "zh-CN": "自定义类型最多 30 字",
    "zh-TW": "自訂類型最多 30 字",
    "fr": "La catégorie personnalisée doit contenir au plus 30 caractères",
    "en": "Custom category must be at most 30 characters"
  },
  "参与人 ID 无效": {
    "zh-CN": "参与人 ID 无效",
    "zh-TW": "參與人 ID 無效",
    "fr": "ID de participant invalide",
    "en": "Invalid participant ID"
  },
  "参与人数过多": {
    "zh-CN": "参与人数过多",
    "zh-TW": "參與人數過多",
    "fr": "Trop de participants",
    "en": "Too many participants"
  },
  "参与人不能重复选择": {
    "zh-CN": "参与人不能重复选择",
    "zh-TW": "參與人不能重複選擇",
    "fr": "Les participants ne peuvent pas être dupliqués",
    "en": "Participants cannot be duplicated"
  },
  "消费类型不在允许范围内": {
    "zh-CN": "消费类型不在允许范围内",
    "zh-TW": "消費類型不在允許範圍內",
    "fr": "La catégorie n’est pas autorisée",
    "en": "Category is not allowed"
  },
  "自定义类型不能为空": {
    "zh-CN": "自定义类型不能为空",
    "zh-TW": "自訂類型不能為空",
    "fr": "La catégorie personnalisée ne peut pas être vide",
    "en": "Custom category cannot be empty"
  },
  "宿舍名不能为空": {
    "zh-CN": "宿舍名不能为空",
    "zh-TW": "宿舍名不能為空",
    "fr": "Le nom du dortoir ne peut pas être vide",
    "en": "Dorm name cannot be empty"
  },
  "任务内容不能为空": {
    "zh-CN": "任务内容不能为空",
    "zh-TW": "任務內容不能為空",
    "fr": "Le contenu de la tâche ne peut pas être vide",
    "en": "Task content cannot be empty"
  },
  "相同日期和任务已存在": {
    "zh-CN": "相同日期和任务已存在",
    "zh-TW": "相同日期和任務已存在",
    "fr": "Une tâche identique existe déjà à cette date",
    "en": "A duty with the same date and task already exists"
  },
  "至少一位成员需要支付": {
    "zh-CN": "至少一位成员需要支付",
    "zh-TW": "至少一位成員需要支付",
    "fr": "Au moins un membre doit payer",
    "en": "At least one member must pay"
  },
  "权重不能小于 0": {
    "zh-CN": "权重不能小于 0",
    "zh-TW": "權重不能小於 0",
    "fr": "Le poids ne peut pas être inférieur à 0",
    "en": "Weight cannot be less than 0"
  },
  "权重必须是数字": {
    "zh-CN": "权重必须是数字",
    "zh-TW": "權重必須是數字",
    "fr": "Le poids doit être un nombre",
    "en": "Weight must be a number"
  },
  "权重用户必须在参与人列表中": {
    "zh-CN": "权重用户必须在参与人列表中",
    "zh-TW": "權重使用者必須在參與人列表中",
    "fr": "Les utilisateurs pondérés doivent être dans la liste des participants",
    "en": "Weighted users must exist in participant list"
  },
  "权重用户不能重复": {
    "zh-CN": "权重用户不能重复",
    "zh-TW": "權重使用者不能重複",
    "fr": "Les utilisateurs pondérés ne peuvent pas être dupliqués",
    "en": "Weighted users cannot be duplicated"
  }
};

export function translateBackendMessage(lang: LanguageCode, message: string): string {
  return BACKEND_MESSAGES[message]?.[lang] || message;
}
