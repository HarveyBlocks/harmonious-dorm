import React from 'react';
import { createPortal } from 'react-dom';

import type { ChatContextMenuProps } from './types';

export const ChatContextMenu = React.memo(function ChatContextMenu(props: ChatContextMenuProps) {
  if (!props.contextMenu || typeof document === 'undefined') return null;

  const menu = props.contextMenu;
  const privateForBot = props.isPrivate(menu.messageId);

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
          props.onClose();
          props.onToggle(menu.messageId);
        }}
        disabled={privateForBot}
        title={privateForBot ? props.setPrivateText : undefined}
        style={privateForBot ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      >
        {props.isSelected(menu.messageId) ? props.removeText : props.addText}
      </button>
      <button
        type="button"
        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100/15 text-sm font-bold"
        onClick={() => {
          props.onClose();
          props.onTogglePrivacy(menu.messageId);
        }}
      >
        {privateForBot ? props.unsetPrivateText : props.setPrivateText}
      </button>
    </div>,
    document.body,
  );
});
