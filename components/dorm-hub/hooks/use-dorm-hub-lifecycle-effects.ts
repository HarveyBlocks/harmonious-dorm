import { useTabAutoRead } from '@/components/dorm-hub/hooks/use-tab-auto-read';
import { useTabPrefetch } from '@/components/dorm-hub/hooks/use-tab-prefetch';
import { useChatTabSync } from '@/components/dorm-hub/hooks/use-chat-tab-sync';
import { useDormSocket } from '@/components/dorm-hub/hooks/use-dorm-socket';
import { useSettingsAutoSave } from '@/components/dorm-hub/hooks/use-settings-auto-save';

export function useDormHubLifecycleEffects(options: {
  activeTab: any;
  socketOptions: Parameters<typeof useDormSocket>[0];
  settingsAutoSaveOptions: Parameters<typeof useSettingsAutoSave>[0];
  chatTabSyncOptions: Parameters<typeof useChatTabSync>[0];
  tabAutoReadOptions: Parameters<typeof useTabAutoRead>[0];
  tabPrefetchOptions: Omit<Parameters<typeof useTabPrefetch>[0], 'activeTab'>;
}) {
  const { activeTab, socketOptions, settingsAutoSaveOptions, chatTabSyncOptions, tabAutoReadOptions, tabPrefetchOptions } = options;

  useDormSocket(socketOptions);
  useSettingsAutoSave(settingsAutoSaveOptions);
  useChatTabSync(chatTabSyncOptions);
  useTabAutoRead(tabAutoReadOptions);
  useTabPrefetch({ ...tabPrefetchOptions, activeTab });
}
