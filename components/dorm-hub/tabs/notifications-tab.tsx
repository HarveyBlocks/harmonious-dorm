
import { Check, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import type { LanguageCode } from '@/lib/i18n';

import { localizeServerText } from '../i18n-adapter';
import type { NotificationFilter } from '../ui-types';
import React from "react";

type NoticeItem = {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  unreadCount: number;
  targetPath?: string | null;
};

export function NotificationsTab(props: {
  t: any;
  language: LanguageCode;
  selectedNoticeCount: number;
  notificationMenuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSelectAll: () => void;
  onMarkSelectedRead: () => void;
  onDeleteSelected: () => void;
  markSelectedDisabled: boolean;
  deleteSelectedDisabled: boolean;
  notificationFilter: NotificationFilter;
  onFilterChange: (f: NotificationFilter) => void;
  notificationListRef: React.RefObject<HTMLDivElement>;
  onNoticeListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  notices: NoticeItem[];
  onOpenNotice: (notice: NoticeItem) => void;
  onToggleSelect: (id: number) => void;
  isChecked: (id: number) => boolean;
}) {
  const {
    t,
    language,
    selectedNoticeCount,
    notificationMenuOpen,
    onToggleMenu,
    onCloseMenu,
    onSelectAll,
    onMarkSelectedRead,
    onDeleteSelected,
    markSelectedDisabled,
    deleteSelectedDisabled,
    notificationFilter,
    onFilterChange,
    notificationListRef,
    onNoticeListScroll,
    notices,
    onOpenNotice,
    onToggleSelect,
    isChecked,
  } = props;

  return (
    <motion.div key="notice" animate={{ opacity: 1 }} className="glass-card sleep-depth-mid p-8 rounded-2xl">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h3 className="text-2xl font-black">{t.notifications}</h3>
        <div className="flex items-center gap-2 relative">
          <span className="text-xs font-bold text-muted">{t.selectedCount}: {selectedNoticeCount}</span>
          <button type="button" onClick={onToggleMenu} className="w-10 h-10 rounded-xl glass-card flex items-center justify-center" title={t.moreActions}>
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {notificationMenuOpen ? (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-xl glass-card p-2 shadow-2xl space-y-1 floating-menu">
              <button type="button" onClick={() => { onSelectAll(); onCloseMenu(); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold">{t.selectAll}</button>
              <button type="button" disabled={markSelectedDisabled} onClick={() => { onMarkSelectedRead(); onCloseMenu(); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold disabled:opacity-50">{t.markSelectedRead}</button>
              <button type="button" disabled={deleteSelectedDisabled} onClick={() => { onDeleteSelected(); onCloseMenu(); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold text-rose-500 disabled:opacity-50">{t.deleteSelected}</button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all', 'unread', 'read'] as NotificationFilter[]).map((item) => (
          <button key={item} onClick={() => onFilterChange(item)} className={`px-4 py-2 rounded-xl font-bold ${item === notificationFilter ? 'accent-bg' : 'glass-card'}`}>
            {item === 'all' ? t.all : item === 'unread' ? t.unread : t.read}
          </button>
        ))}
      </div>

      <div ref={notificationListRef} className="space-y-3 max-h-[64vh] overflow-y-auto pr-1" onScroll={onNoticeListScroll}>
        {notices.map((notice) => (
          <article key={notice.id} className="mx-4 glass-card p-4 rounded-2xl flex items-start justify-between gap-4 cursor-pointer hover:scale-[1.01]" onClick={() => onOpenNotice(notice)}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelect(notice.id);
                }}
                className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isChecked(notice.id) ? 'accent-bg border-transparent text-white' : 'border-slate-300/60 text-transparent'}`}
                aria-label="select"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <div>
                <p className="font-black">{localizeServerText(language, notice.title)} {notice.unreadCount > 1 ? `(${notice.unreadCount})` : ''}</p>
                <p className="text-sm text-muted mt-1">{localizeServerText(language, notice.content)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </motion.div>
  );
}

