
import { BookMarked, Send } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from 'react-dom';
import { MarkdownRenderer } from '@/components/dorm-hub/markdown-renderer';

export function ChatTab(props: {
  t: any;
  dormName: string;
  meId: number | null;
  lastPositionChatId: number | null;
  unreadChatCount: number;
  jumpToLastPosition: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onChatListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  renderedLiveMessages: any[];
  chatMessageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  newChatHintCount: number;
  jumpToFirstNewChat: () => void;
  chatEndRef: React.RefObject<HTMLDivElement>;
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  onSendChat: (content: string) => void;
  messageTooLongText: string;
  maxInputLength: number;
  isChatContextSelected: (messageId: number) => boolean;
  onToggleChatContextMessage: (messageId: number) => void;
}) {
  const p = props;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);
  const [draft, setDraft] = useState('');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const openContextMenu = (x: number, y: number, messageId: number) => {
    const menuWidth = 240;
    const menuHeight = 56;
    const margin = 8;
    const left = Math.min(Math.max(margin, x + 6), window.innerWidth - menuWidth - margin);
    const top = Math.min(Math.max(margin, y + 6), window.innerHeight - menuHeight - margin);
    flushSync(() => setContextMenu({ x: left, y: top, messageId }));
  };

  const sendCurrentDraft = () => {
    const text = draft.trim();
    if (text.length > p.maxInputLength) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: p.messageTooLongText } }));
      return;
    }
    p.onSendChat(draft);
    setDraft('');
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleWindowClick = () => setContextMenu(null);
    const handleWindowScroll = () => setContextMenu(null);
    window.addEventListener('click', handleWindowClick);
    window.addEventListener('scroll', handleWindowScroll, true);
    return () => {
      window.removeEventListener('click', handleWindowClick);
      window.removeEventListener('scroll', handleWindowScroll, true);
    };
  }, [contextMenu]);

  return (
    <motion.div key="chat" animate={{ opacity: 1 }} className="glass-card sleep-depth-mid rounded-2xl overflow-hidden flex flex-col h-[78vh] shadow-2xl relative">
      <div className="h-8 border-b border-white/10 bg-gradient-to-b from-white/12 via-white/6 to-transparent backdrop-blur-[2px]" />
      <ChatMessagesPane
        t={p.t}
        meId={p.meId}
        lastPositionChatId={p.lastPositionChatId}
        unreadChatCount={p.unreadChatCount}
        jumpToLastPosition={p.jumpToLastPosition}
        chatScrollRef={p.chatScrollRef}
        onChatListScroll={p.onChatListScroll}
        renderedLiveMessages={p.renderedLiveMessages}
        chatMessageRefs={p.chatMessageRefs}
        chatEndRef={p.chatEndRef}
        isChatContextSelected={p.isChatContextSelected}
        onMessageContextMenu={(event, messageId) => {
          event.preventDefault();
          openContextMenu(event.clientX, event.clientY, messageId);
        }}
        onMessageTouchStart={(event, messageId) => {
          const touch = event.touches[0];
          if (!touch) return;
          clearLongPressTimer();
          longPressTimerRef.current = setTimeout(() => {
            openContextMenu(touch.clientX, touch.clientY, messageId);
          }, 460);
        }}
        onMessageTouchMove={clearLongPressTimer}
        onMessageTouchEnd={clearLongPressTimer}
      />

      {p.newChatHintCount > 0 ? (
        <button
          type="button"
          onClick={p.jumpToFirstNewChat}
          className="absolute right-5 bottom-24 z-20 flex flex-col items-center group"
          aria-label="new chat messages"
        >
          <span className="w-12 h-12 rounded-full accent-bg text-white font-black text-sm flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
            {p.newChatHintCount > 99 ? '99+' : p.newChatHintCount}
          </span>
          <span className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[13px] border-l-transparent border-r-transparent border-t-[var(--accent)] -mt-[2px]" />
        </button>
      ) : null}

          {contextMenu && typeof document !== 'undefined'
        ? createPortal(
            <div
              key={`${contextMenu.messageId}-${contextMenu.x}-${contextMenu.y}`}
              className="fixed z-[120] min-w-[220px] rounded-xl glass-card p-2 shadow-2xl transition-none"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold"
                onClick={() => {
                  flushSync(() => setContextMenu(null));
                  p.onToggleChatContextMessage(contextMenu.messageId);
                }}
              >
                {p.isChatContextSelected(contextMenu.messageId) ? p.t.removeFromContext : p.t.addToContext}
              </button>
            </div>,
            document.body,
          )
        : null}

      <ChatComposer
        chatInputRef={p.chatInputRef}
        draft={draft}
        setDraft={setDraft}
        placeholder={p.t.inputMessage}
        onSend={sendCurrentDraft}
      />
    </motion.div>
  );
}

const ChatMessagesPane = React.memo(function ChatMessagesPane(props: {
  t: any;
  meId: number | null;
  lastPositionChatId: number | null;
  unreadChatCount: number;
  jumpToLastPosition: () => void;
  chatScrollRef: React.RefObject<HTMLDivElement>;
  onChatListScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  renderedLiveMessages: any[];
  chatMessageRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  isChatContextSelected: (messageId: number) => boolean;
  onMessageContextMenu: (event: React.MouseEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchStart: (event: React.TouchEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchMove: () => void;
  onMessageTouchEnd: () => void;
}) {
  const p = props;
  const isEchoPreview = (text: string) => text.startsWith('### Echo HTTP Request');
  return (
    <div ref={p.chatScrollRef} onScroll={p.onChatListScroll} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
      {p.lastPositionChatId && p.unreadChatCount > 20 ? (
        <div className="flex justify-end">
          <button type="button" onClick={p.jumpToLastPosition} className="px-3 py-2 rounded-xl glass-card text-xs font-bold">
            {p.t.jumpToLastPosition}{p.unreadChatCount > 0 ? ` (${p.unreadChatCount})` : ''}
          </button>
        </div>
      ) : null}
      {p.renderedLiveMessages.map((msg) => (
        <div key={msg.id} ref={(node) => { p.chatMessageRefs.current[msg.id] = node; }}>
          {msg.isStatusMessage ? (
            <div className="flex justify-center">
              <p className="px-4 py-1.5 rounded-full bg-slate-500/15 text-xs font-bold text-muted">{msg.localizedContent}</p>
            </div>
          ) : (
            <div
              className={`flex gap-3 ${msg.userId === p.meId ? 'justify-end' : ''}`}
            >
              {msg.userId !== p.meId ? <img src={msg.avatar} className="w-10 h-10 rounded-full shadow-md" alt="" /> : null}
              <div className={`max-w-[70%] min-w-0 ${msg.userId === p.meId ? 'items-end' : 'items-start'} flex flex-col`}>
                <p className={`text-base text-muted mb-1 px-1 ${msg.userId === p.meId ? 'text-right' : 'text-left'}`}>{msg.userName}</p>
                <div className={`flex items-start gap-2 max-w-full min-w-0 ${msg.userId === p.meId ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`max-w-full min-w-0 p-4 rounded-3xl shadow-sm ${msg.userId === p.meId ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}
                    onContextMenu={(event) => p.onMessageContextMenu(event, msg.id)}
                    onTouchStart={(event) => p.onMessageTouchStart(event, msg.id)}
                    onTouchMove={p.onMessageTouchMove}
                    onTouchEnd={p.onMessageTouchEnd}
                    onTouchCancel={p.onMessageTouchEnd}
                  >
                    {msg.isBotMessage ? (
                      <div className={`bot-markdown text-lg leading-relaxed max-w-full min-w-0 ${isEchoPreview(msg.content) ? 'echo-preview-markdown' : ''}`}>
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ) : (
                      <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>
                    )}
                  </div>
                  {(p.isChatContextSelected(msg.id) || (msg.isBotMessage && msg.isStreaming)) ? (
                    <div className="mt-1 flex flex-col items-center gap-1 min-w-5">
                      {p.isChatContextSelected(msg.id) ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/90 text-white">
                          <BookMarked className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                      {msg.isBotMessage && msg.isStreaming ? <span className="bot-stream-spinner" aria-hidden="true" /> : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={p.chatEndRef} />
    </div>
  );
});

const ChatComposer = React.memo(function ChatComposer(props: {
  chatInputRef: React.RefObject<HTMLTextAreaElement>;
  draft: string;
  setDraft: (value: string) => void;
  placeholder: string;
  onSend: () => void;
}) {
  const p = props;
  return (
    <div className="p-3 bg-white/20 border-t border-slate-200/20">
      <div className="flex gap-2">
        <textarea
          ref={p.chatInputRef}
          value={p.draft}
          onChange={(e) => p.setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key !== 'Enter') return;
            if (event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            p.onSend();
          }}
          rows={1}
          className="flex-1 p-3 rounded-xl glass-card custom-field outline-none focus:accent-border font-medium text-lg resize-none min-h-[46px] leading-6"
          placeholder={p.placeholder}
        />
        <button onClick={p.onSend} className="p-3 accent-bg rounded-xl shadow-lg hover:scale-105 transition-transform">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});
