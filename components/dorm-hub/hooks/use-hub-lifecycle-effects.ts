import { useTabAutoRead } from '@/components/dorm-hub/hooks/use-tab-auto-read';
import { useTabPrefetch } from '@/components/dorm-hub/hooks/use-tab-prefetch';
import { useChatTabSync } from '@/components/dorm-hub/hooks/use-chat-tab-sync';
import { useSocket } from '@/components/dorm-hub/hooks/use-socket';
import { useSettingsAutoSave } from '@/components/dorm-hub/hooks/use-settings-auto-save';

export function useHubLifecycleEffects(options: {
  activeTab: any;
  socketOptions: Parameters<typeof useSocket>[0];
  settingsAutoSaveOptions: Parameters<typeof useSettingsAutoSave>[0];
  chatTabSyncOptions: Parameters<typeof useChatTabSync>[0];
  tabAutoReadOptions: Parameters<typeof useTabAutoRead>[0];
  tabPrefetchOptions: Omit<Parameters<typeof useTabPrefetch>[0], 'activeTab'>;
}) {
  const { activeTab, socketOptions, settingsAutoSaveOptions, chatTabSyncOptions, tabAutoReadOptions, tabPrefetchOptions } = options;

  useSocket(socketOptions);
  useSettingsAutoSave(settingsAutoSaveOptions);
  useChatTabSync(chatTabSyncOptions);
  useTabAutoRead(tabAutoReadOptions);
  useTabPrefetch({ ...tabPrefetchOptions, activeTab });
}
