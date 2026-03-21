import { ChatTabPanel } from './chat/chat-tab-panel';
import { useChatTabController } from './chat/use-chat-tab-controller';
import type { ChatTabProps } from './chat/types';

export function ChatTab(props: ChatTabProps) {
  const controller = useChatTabController(props);
  return <ChatTabPanel {...props} {...controller} />;
}
