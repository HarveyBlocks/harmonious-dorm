import React from 'react';
import { BookMarked, EyeOff, Pause } from 'lucide-react';

import { MarkdownRenderer } from '@/components/dorm-hub/markdown-renderer';
import type { ChatMessagesPaneProps } from './types';

function isEchoPreview(text: string): boolean {
  return text.startsWith('### Echo HTTP Request');
}

function isI18nToken(text: string): boolean {
  return text.startsWith('__i18n__:');
}

export const ChatMessagesPane = React.memo(function ChatMessagesPane(props: ChatMessagesPaneProps) {
  return (
    <div ref={props.chatScrollRef} onScroll={props.onChatListScroll} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/30">
      {props.lastPositionChatId && props.unreadChatCount > 20 ? (
        <div className="flex justify-end">
          <button type="button" onClick={props.jumpToLastPosition} className="px-3 py-2 rounded-xl glass-card text-xs font-bold">
            {props.t.jumpToLastPosition}{props.unreadChatCount > 0 ? ` (${props.unreadChatCount})` : ''}
          </button>
        </div>
      ) : null}

      {props.renderedLiveMessages.map((msg) => (
        <div key={msg.id} ref={(node) => { props.chatMessageRefs.current[msg.id] = node; }}>
          {msg.isStatusMessage ? (
            <div className="flex justify-center">
              <p className="px-4 py-1.5 rounded-full bg-slate-500/15 text-xs font-bold text-muted">{msg.localizedContent}</p>
            </div>
          ) : (
            <ChatMessageRow message={msg} {...props} />
          )}
        </div>
      ))}

      <div ref={props.chatEndRef} />
    </div>
  );
});

function ChatMessageRow(props: ChatMessagesPaneProps & { message: ChatMessagesPaneProps['renderedLiveMessages'][number] }) {
  const { message: msg } = props;
  const isSelf = msg.userId === props.meId;
  const showAbort = Boolean(msg.isBotMessage && msg.isStreaming && msg.abortableByUserId === props.meId);
  const hasMarks = props.isChatContextSelected(msg.id) || props.isChatMessagePrivateForBot(msg.id) || msg.isStreaming || showAbort;

  return (
    <div className={`flex gap-3 ${isSelf ? 'justify-end' : ''}`}>
      {!isSelf ? <img src={msg.avatar} className="w-10 h-10 rounded-full shadow-md" alt="" /> : null}
      <div className={`max-w-[70%] min-w-0 ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
        <p className={`text-base text-muted mb-1 px-1 ${isSelf ? 'text-right' : 'text-left'}`}>{msg.userName}</p>
        <div className={`flex items-stretch gap-2 max-w-full min-w-0 ${isSelf ? 'flex-row-reverse' : ''}`}>
          <div
            className={`max-w-full min-w-0 p-4 rounded-3xl shadow-sm ${isSelf ? 'accent-bg rounded-tr-none' : 'glass-card rounded-tl-none'}`}
            onContextMenu={(event) => props.onMessageContextMenu(event, msg.id)}
            onTouchStart={(event) => props.onMessageTouchStart(event, msg.id)}
            onTouchMove={props.onMessageTouchMove}
            onTouchEnd={props.onMessageTouchEnd}
            onTouchCancel={props.onMessageTouchEnd}
          >
            <ChatMessageBody t={props.t} message={msg} />
          </div>

          {hasMarks ? <MessageMarks {...props} message={msg} showAbort={showAbort} /> : null}
        </div>
      </div>
    </div>
  );
}

function progressCountToPercentage(count?: number): number {
  return count ? (1 - Math.exp(-count / 1000)) * 100 : 0;
}

function formatProgressPercentage(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const fixed = safe.toFixed(3);
  const [intPart, fracPart] = fixed.split('.');
  return `${intPart.padStart(2, '0')}.${fracPart}`;
}

function phaseText(t: any, phase?: string): string {
  if (phase === 'tool_calling') return t.botToolCalling || '思考完成，正在调用工具...';
  if (phase === 'tool_result_thinking') return t.botToolDoneThinking || '工具执行完成，正在整理最终回复...';
  if (phase === 'thinking') return t.botThinking || '机器人正在认真思考中...';
  return t.botRequesting || '正在为你发起请求，请稍候...';
}

function ChatMessageBody(props: { t: any; message: ChatMessagesPaneProps['renderedLiveMessages'][number] }) {
  const msg = props.message;
  if (!msg.isBotMessage) {
    return <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>;
  }
  if (isI18nToken(msg.content)) {
    return <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap break-words">{msg.localizedContent}</p>;
  }

  if (msg.isStreaming && !msg.content) {
    const safeCount = Number.isFinite(msg.reasoningCount) ? Number(msg.reasoningCount) : 0;
    const title = phaseText(props.t, msg.streamPhase);

    if (msg.streamPhase === 'tool_calling') {
      return <p className="text-sm font-medium leading-relaxed text-muted whitespace-pre-wrap break-words">{title}</p>;
    }

    if (safeCount <= 0) {
      const requesting = props.t.botRequesting || '正在为你发起请求，请稍候...';
      return <p className="text-sm font-medium leading-relaxed text-muted whitespace-pre-wrap break-words">{requesting}</p>;
    }

    const progress = progressCountToPercentage(safeCount);
    return (
      <p className="text-sm font-medium leading-relaxed text-muted whitespace-pre-wrap break-words">
        {title} {props.t.thinkingProgress || '思考进度'}: {formatProgressPercentage(progress)} %
      </p>
    );
  }

  return (
    <div className={`bot-markdown text-lg leading-relaxed max-w-full min-w-0 ${isEchoPreview(msg.content) ? 'echo-preview-markdown' : ''}`}>
      <MarkdownRenderer content={msg.content} />
    </div>
  );
}

function MessageMarks(props: ChatMessagesPaneProps & { message: ChatMessagesPaneProps['renderedLiveMessages'][number]; showAbort: boolean }) {
  const msg = props.message;
  return (
    <div className="mt-1 min-w-6 flex flex-col items-end h-full">
      <div className="flex flex-col items-end gap-1">
        {props.isChatContextSelected(msg.id) ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/90 text-white">
            <BookMarked className="w-3.5 h-3.5" />
          </span>
        ) : null}
        {props.isChatMessagePrivateForBot(msg.id) ? (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-700/90 text-white">
            <EyeOff className="w-3.5 h-3.5" />
          </span>
        ) : null}
        {msg.isBotMessage && msg.isStreaming ? <span className="bot-stream-spinner" aria-hidden="true" /> : null}
      </div>
      {props.showAbort ? (
        <button
          type="button"
          aria-label={props.stopGeneratingText}
          title={props.stopGeneratingText}
          onClick={() => props.onAbortBotStream(msg.id)}
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
  );
}