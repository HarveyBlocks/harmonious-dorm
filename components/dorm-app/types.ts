export type ActiveTab = 'dashboard' | 'duty' | 'wallet' | 'chat' | 'notifications' | 'settings';
export type SettingsSectionKey = 'user' | 'dorm' | 'member' | 'bot' | 'security';

export type ChatMessage = {
  id: number;
  userId: number;
  userName: string;
  content: string;
  createdAt: string;
};

export type RenderedChatMessage = ChatMessage & {
  isStatusMessage: boolean;
  isBotMessage: boolean;
  localizedContent: string;
  avatar: string;
};

export type NotificationFilter = 'all' | 'unread' | 'read';
export type PeriodType = 'month' | 'quarter' | 'year';
export type LineGranularity = 'month' | 'day';

export type ChartPoint = { label: string; value: number };
export type LineSeries = { name: string; points: ChartPoint[] };