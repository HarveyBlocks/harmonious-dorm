export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'sleeping';
  role: 'leader' | 'member';
}

export interface Duty {
  id: string;
  task: string;
  userId: string;
  date: string;
  completed: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  payerId: string;
  participants: string[];
  date: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success';
  timestamp: string;
  read: boolean;
}

export type DormMode = 'normal' | 'study' | 'sleep' | 'party';
