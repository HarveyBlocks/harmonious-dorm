export type DormState = '学习' | '睡觉' | '游戏' | '外出';

export interface SessionUser {
  userId: number;
  dormId: number;
  isLeader: boolean;
}

export interface LoginResult {
  userId: number;
  dormId: number;
  isLeader: boolean;
  inviteCode: string;
}

export interface DutyItem {
  dutyId: number;
  date: string;
  userId: number;
  userName: string;
  completed: boolean;
  imageUrl: string | null;
}

export interface BillSummary {
  id: number;
  total: number;
  description: string | null;
  category: string;
  customCategory: string | null;
  createdAt: string;
  paidCount: number;
  totalCount: number;
  myPaid: boolean;
}

export interface DormMember {
  id: number;
  email?: string;
  name: string;
  avatarPath?: string | null;
  isLeader: boolean;
}

export interface MePayload {
  id: number;
  email: string;
  name: string;
  avatarPath: string | null;
  language: 'zh-CN' | 'zh-TW' | 'fr' | 'en';
  dormId: number;
  dormName: string;
  isLeader: boolean;
  inviteCode: string;
  members: DormMember[];
}

export interface NotificationPayload {
  id: number;
  type: string;
  title: string;
  content: string;
  targetPath: string | null;
  isRead: boolean;
  unreadCount: number;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: number | null;
}
