import React, { useCallback, useState } from 'react';
import { Send } from 'lucide-react';

import type { ChatComposerProps } from './types';

export const ChatComposer = React.memo(function ChatComposer(props: ChatComposerProps) {
  const [draft, setDraft] = useState('');

  const onSend = useCallback(() => {
    const ok = props.onSubmit(draft);
    if (ok) setDraft('');
  }, [draft, props]);

  return (
    <div className="p-3 chat-composer-surface">
      <div className="flex gap-2">
        <textarea
          ref={props.chatInputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key !== 'Enter') return;
            if (event.ctrlKey || event.metaKey) return;
            event.preventDefault();
            onSend();
          }}
          rows={1}
          className="flex-1 p-3 rounded-xl glass-card custom-field outline-none focus:accent-border font-medium text-lg resize-none min-h-[46px] leading-6"
          placeholder={props.placeholder}
        />
        <button onClick={onSend} className="p-3 accent-bg rounded-xl shadow-lg hover:scale-105 transition-transform">
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
});


