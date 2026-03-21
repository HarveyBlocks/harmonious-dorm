import { motion } from 'motion/react';
import type React from 'react';

import { ChatComposer } from './chat-composer';
import { ChatContextMenu } from './chat-context-menu';
import { ChatMessagesPane } from './chat-messages-pane';
import type { ChatTabProps, ContextMenuState } from './types';

type Props = ChatTabProps & {
  contextMenu: ContextMenuState;
  setContextMenu: (value: ContextMenuState) => void;
  onSubmitChat: (draft: string) => boolean;
  onMessageContextMenu: (event: React.MouseEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchStart: (event: React.TouchEvent<HTMLDivElement>, messageId: number) => void;
  onMessageTouchMove: () => void;
  onMessageTouchEnd: () => void;
};

export function ChatTabPanel(props: Props) {
  return (
    <motion.div key="chat" animate={{ opacity: 1 }} className="glass-card sleep-depth-mid rounded-2xl overflow-hidden flex flex-col h-[78vh] shadow-2xl relative">
      <div className="h-8 border-b border-white/10 bg-gradient-to-b from-white/12 via-white/6 to-transparent backdrop-blur-[2px]" />

      <ChatMessagesPane
        t={props.t}
        meId={props.meId}
        lastPositionChatId={props.lastPositionChatId}
        unreadChatCount={props.unreadChatCount}
        jumpToLastPosition={props.jumpToLastPosition}
        chatScrollRef={props.chatScrollRef}
        onChatListScroll={props.onChatListScroll}
        renderedLiveMessages={props.renderedLiveMessages}
        chatMessageRefs={props.chatMessageRefs}
        chatEndRef={props.chatEndRef}
        isChatContextSelected={props.isChatContextSelected}
        isChatMessagePrivateForBot={props.isChatMessagePrivateForBot}
        stopGeneratingText={props.stopGeneratingText}
        onAbortBotStream={props.onAbortBotStream}
        onMessageContextMenu={props.onMessageContextMenu}
        onMessageTouchStart={props.onMessageTouchStart}
        onMessageTouchMove={props.onMessageTouchMove}
        onMessageTouchEnd={props.onMessageTouchEnd}
      />

      {props.newChatHintCount > 0 ? (
        <button type="button" onClick={props.jumpToFirstNewChat} className="absolute right-5 bottom-24 z-20 flex flex-col items-center group" aria-label="new chat messages">
          <span className="w-12 h-12 rounded-full accent-bg text-white font-black text-sm flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
            {props.newChatHintCount > 99 ? '99+' : props.newChatHintCount}
          </span>
          <span className="w-0 h-0 border-l-[9px] border-r-[9px] border-t-[13px] border-l-transparent border-r-transparent border-t-[var(--accent)] -mt-[2px]" />
        </button>
      ) : null}

      <ChatContextMenu
        contextMenu={props.contextMenu}
        isSelected={props.isChatContextSelected}
        isPrivate={props.isChatMessagePrivateForBot}
        addText={props.addRobotMemoryText}
        removeText={props.removeRobotMemoryText}
        setPrivateText={props.setPrivateText}
        unsetPrivateText={props.unsetPrivateText}
        onClose={() => props.setContextMenu(null)}
        onToggle={props.onToggleChatContextMessage}
        onTogglePrivacy={props.onToggleChatPrivacy}
      />

      <ChatComposer chatInputRef={props.chatInputRef} placeholder={props.t.inputMessage} onSubmit={props.onSubmitChat} />
    </motion.div>
  );
}
