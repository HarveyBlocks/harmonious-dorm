
import { useCallback } from 'react';

type TryApplyLimitedInput = (
  key: string,
  value: string,
  max: number,
  message: string,
  apply: (safeValue: string) => void,
) => boolean;

export function useChatInput(options: {
  chatInput: string;
  setChatInput: (value: string) => void;
  maxLength: number;
  tooLongMessage: string;
  tryApplyLimitedInput: TryApplyLimitedInput;
  onSend: () => void;
}) {
  const { chatInput, setChatInput, maxLength, tooLongMessage, tryApplyLimitedInput, onSend } = options;

  const onChatInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key !== 'Enter') return;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const target = event.currentTarget;
        const start = target.selectionStart ?? chatInput.length;
        const end = target.selectionEnd ?? chatInput.length;
        const next = `${chatInput.slice(0, start)}\n${chatInput.slice(end)}`;
        tryApplyLimitedInput('chat_input', next, maxLength, tooLongMessage, (safeValue) => {
          setChatInput(safeValue);
          requestAnimationFrame(() => {
            target.selectionStart = start + 1;
            target.selectionEnd = start + 1;
          });
        });
        return;
      }
      event.preventDefault();
      onSend();
    },
    [chatInput, maxLength, onSend, setChatInput, tooLongMessage, tryApplyLimitedInput],
  );

  const onChatInputChange = useCallback(
    (value: string) => {
      tryApplyLimitedInput('chat_input', value, maxLength, tooLongMessage, setChatInput);
    },
    [maxLength, setChatInput, tooLongMessage, tryApplyLimitedInput],
  );

  return { onChatInputKeyDown, onChatInputChange };
}
