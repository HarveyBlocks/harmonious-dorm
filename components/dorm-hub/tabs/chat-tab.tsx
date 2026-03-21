
import { BookMarked, EyeOff, Pause, Send } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from 'react-dom';
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
  isChatMessagePrivateForBot: (messageId: number) => boolean;
  onToggleChatPrivacy: (messageId: number) => void;
  addRobotMemoryText: string;
  removeRobotMemoryText: string;
  setPrivateText: string;
  unsetPrivateText: string;
  stopGeneratingText: string;
  onAbortBotStream: (messageId: number) => void;
}) {
  const p = props;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendChatRef = useRef(p.onSendChat);
  const maxInputLengthRef = useRef(p.maxInputLength);
  const messageTooLongTextRef = useRef(p.messageTooLongText);

  useEffect(() => {
    sendChatRef.current = p.onSendChat;
  }, [p.onSendChat]);

  useEffect(() => {
    maxInputLengthRef.current = p.maxInputLength;
    messageTooLongTextRef.current = p.messageTooLongText;
  }, [p.maxInputLength, p.messageTooLongText]);

  const clearLongPressTimer = () => {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const openContextMenu = (x: number, y: number, messageId: number) => {
    const menuWidth = 240;
    const menuHeight = 104;
    const margin = 8;
    const left = Math.min(Math.max(margin, x + 6), window.innerWidth - menuWidth - margin);
    const top = Math.min(Math.max(margin, y + 6), window.innerHeight - menuHeight - margin);
    setContextMenu({ x: left, y: top, messageId });
  };

  const onSubmitChat = useCallback((draft: string) => {
    const text = draft.trim();
    if (text.length > maxInputLengthRef.current) {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: messageTooLongTextRef.current } }));
      return false;
    }
    sendChatRef.current(draft);
    return true;
  }, []);

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
        isChatMessagePrivateForBot={p.isChatMessagePrivateForBot}
        stopGeneratingText={p.stopGeneratingText}
        onAbortBotStream={p.onAbortBotStream}
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

      <ChatContextMenu
        contextMenu={contextMenu}
        isSelected={p.isChatContextSelected}
        isPrivate={p.isChatMessagePrivateForBot}
        addText={p.addRobotMemoryText}
        removeText={p.removeRobotMemoryText}
        setPrivateText={p.setPrivateText}
        unsetPrivateText={p.unsetPrivateText}
        onClose={() => setContextMenu(null)}
        onToggle={p.onToggleChatContextMessage}
        onTogglePrivacy={p.onToggleChatPrivacy}
      />

      <ChatComposer
        chatInputRef={p.chatInputRef}
        placeholder={p.t.inputMessage}
        onSubmit={onSubmitChat}
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
  isChatMessagePrivateForBot: (messageId: number) => boolean;
  stopGeneratingText: string;
  onAbortBotStream: (messageId: number) => void;
  onMessageContextMenu: (event: React.MouseEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchStart: (event: React.TouchEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchMove: () => void;
  onMessageTouchEnd: () => void;
}) {
  const p = props;
  const isEchoPreview = (text: string) => text.startsWith('### Echo HTTP Request');
  const isI18nToken = (text: string) => text.startsWith('__i18n__:');
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
                <div className={`flex items-stretch gap-2 max-w-full min-w-0 ${msg.userId === p.meId ? 'flex-row-reverse' : ''}`}>
                  <div
                    className={`max-w-full min-w-0 p-4 rounded-3xl shadow-sm ${msg.userId === p.meId ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}
                    onContextMenu={(event) => p.onMessageContextMenu(event, msg.id)}
                    onTouchStart={(event) => p.onMessageTouchStart(event, msg.id)}
                    onTouchMove={p.onMessageTouchMove}
                    onTouchEnd={p.onMessageTouchEnd}
                    onTouchCancel={p.onMessageTouchEnd}
                  >
                    {msg.isBotMessage ? (
                      isI18nToken(msg.content) ? (
                        <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>
                      ) : (msg.isStreaming && !msg.content) ? (
                        <p className="text-sm font-medium leading-relaxed text-muted whitespace-pre-wrap break-words">
                          {p.t.thinkingProgress}: {Number.isFinite(msg.reasoningCount) ? msg.reasoningCount : 0}
                        </p>
                      ) : (
                        <div className={`bot-markdown text-lg leading-relaxed max-w-full min-w-0 ${isEchoPreview(msg.content) ? 'echo-preview-markdown' : ''}`}>
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )
                    ) : (
                      <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>
                    )}
                  </div>
                  {(p.isChatContextSelected(msg.id)
                    || p.isChatMessagePrivateForBot(msg.id)
                    || (msg.isBotMessage && msg.isStreaming)
                    || (msg.isBotMessage && msg.isStreaming && msg.abortableByUserId === p.meId)) ? (
                    <div className="mt-1 min-w-6 flex flex-col items-end h-full">
                      <div className="flex flex-col items-end gap-1">
                        {p.isChatContextSelected(msg.id) ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/90 text-white">
                            <BookMarked className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                        {p.isChatMessagePrivateForBot(msg.id) ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700/90 text-white">
                            <EyeOff className="w-3.5 h-3.5" />
                          </span>
                        ) : null}
                        {msg.isBotMessage && msg.isStreaming ? <span className="bot-stream-spinner" aria-hidden="true" /> : null}
                      </div>
                      {msg.isBotMessage && msg.isStreaming && msg.abortableByUserId === p.meId ? (
                        <button
                          type="button"
                          aria-label={p.stopGeneratingText}
                          title={p.stopGeneratingText}
                          onClick={() => p.onAbortBotStream(msg.id)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full border transition-colors shadow-sm mt-auto"
                          style={{
                            borderColor: 'color-mix(in srgb, var(--accent) 48%, transparent)',
                            color: 'var(--accent)',
                            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--bg-main) 88%)',
                          }}
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
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
  placeholder: string;
  onSubmit: (text: string) => boolean;
}) {
  const p = props;
  const [draft, setDraft] = useState('');
  const onSend = useCallback(() => {
    const ok = p.onSubmit(draft);
    if (ok) setDraft('');
  }, [draft, p.onSubmit]);
  return (
    <div className="p-3 bg-white/20 border-t border-slate-200/20">
      <div className="flex gap-2">
        <textarea
          ref={p.chatInputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key !== 'Enter') return;
            if (event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            onSend();
          }}
          rows={1}
          className="flex-1 p-3 rounded-xl glass-card custom-field outline-none focus:accent-border font-medium text-lg resize-none min-h-[46px] leading-6"
          placeholder={p.placeholder}
        />
        <button onClick={onSend} className="p-3 accent-bg rounded-xl shadow-lg hover:scale-105 transition-transform">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});

const ChatContextMenu = React.memo(function ChatContextMenu(props: {
  contextMenu: { x: number; y: number; messageId: number } | null;
  isSelected: (messageId: number) => boolean;
  isPrivate: (messageId: number) => boolean;
  addText: string;
  removeText: string;
  setPrivateText: string;
  unsetPrivateText: string;
  onClose: () => void;
  onToggle: (messageId: number) => void;
  onTogglePrivacy: (messageId: number) => void;
}) {
  const p = props;
  if (!p.contextMenu || typeof document === 'undefined') return null;
  const menu = p.contextMenu;
  const privateForBot = p.isPrivate(menu.messageId);
  return createPortal(
    <div
      key={`${menu.messageId}-${menu.x}-${menu.y}`}
      className="fixed z-[120] min-w-[220px] rounded-xl glass-card p-2 shadow-2xl transition-none"
      style={{ left: menu.x, top: menu.y }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold"
        onClick={() => {
          p.onClose();
          p.onToggle(menu.messageId);
        }}
        disabled={privateForBot}
        title={privateForBot ? p.setPrivateText : undefined}
        style={privateForBot ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      >
        {p.isSelected(menu.messageId) ? p.removeText : p.addText}
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold"
        onClick={() => {
          p.onClose();
          p.onTogglePrivacy(menu.messageId);
        }}
      >
        {privateForBot ? p.unsetPrivateText : p.setPrivateText}
      </button>
    </div>,
    document.body,
  );
});
