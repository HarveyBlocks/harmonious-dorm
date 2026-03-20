
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import React from "react";
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
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onChatInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSendChat: () => void;
}) {
  const p = props;
  const isEchoPreview = (text: string) => text.startsWith('### Echo HTTP Request');

  return (
    <motion.div key="chat" animate={{ opacity: 1 }} className="glass-card sleep-depth-mid rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-2xl relative">
      <div ref={p.chatScrollRef} onScroll={p.onChatListScroll} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
        {p.lastPositionChatId && p.unreadChatCount > 20 ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={p.jumpToLastPosition}
              className="px-3 py-2 rounded-xl glass-card text-xs font-bold"
            >
              {p.t.jumpToLastPosition}{p.unreadChatCount > 0 ? ` (${p.unreadChatCount})` : ''}
            </button>
          </div>
        ) : null}
        {p.renderedLiveMessages.map((msg) => (
          <div
            key={msg.id}
            ref={(node) => {
              p.chatMessageRefs.current[msg.id] = node;
            }}
          >
            {msg.isStatusMessage ? (
              <div className="flex justify-center">
                <p className="px-4 py-1.5 rounded-full bg-slate-500/15 text-xs font-bold text-muted">
                  {msg.localizedContent}
                </p>
              </div>
            ) : (
              <div className={`flex gap-3 ${msg.userId === p.meId ? 'justify-end' : ''}`}>
                {msg.userId !== p.meId && (
                  <img
                    src={msg.avatar}
                    className="w-10 h-10 rounded-full shadow-md"
                    alt=""
                  />
                )}
                <div className={`max-w-[70%] ${msg.userId === p.meId ? 'items-end' : 'items-start'} flex flex-col`}>
                  <p className={`text-xs text-muted mb-1 px-1 ${msg.userId === p.meId ? 'text-right' : 'text-left'}`}>{msg.userName}</p>
                  <div className={`w-full p-4 rounded-3xl shadow-sm ${msg.userId === p.meId ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}>
                    {msg.isBotMessage ? (
                      <div className={`bot-markdown text-sm leading-relaxed ${isEchoPreview(msg.content) ? 'echo-preview-markdown' : ''}`}>
                        {msg.isStreaming ? (
                          <span className="bot-stream-spinner mb-2" aria-hidden="true" />
                        ) : null}
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    ) : (
                      <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={p.chatEndRef} />
      </div>

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

      <div className="p-3 bg-white/20 border-t border-slate-200/20">
        <div className="flex gap-2">
          <textarea
            ref={p.chatInputRef}
            value={p.chatInput}
            onChange={(e) => p.onChatInputChange(e.target.value)}
            onKeyDown={p.onChatInputKeyDown}
            rows={1}
            className="flex-1 p-3 rounded-xl glass-card custom-field outline-none focus:accent-border font-medium resize-none min-h-[44px] leading-5"
            placeholder={p.t.inputMessage}
          />
          <button onClick={p.onSendChat} className="p-3 accent-bg rounded-xl shadow-lg hover:scale-105 transition-transform"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </motion.div>
  );
}
