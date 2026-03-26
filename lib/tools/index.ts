import { BOT_TOOL_REGISTRY } from './registry';
import { executeTool } from './executor';
import { getDormToolPermissionMap, listDormToolRows, setDormToolPermissions } from './catalog';

import type { ToolDescriptor, ToolExecutionContext, ToolPermission } from './types';

export type { ToolDescriptor, ToolExecutionContext, ToolPermission } from './types';

export function listAllowedTools(permissionMap: Record<string, ToolPermission>): ToolDescriptor[] {
  return BOT_TOOL_REGISTRY.filter((item) => (permissionMap[item.name] || 'deny') === 'allow');
}

export { executeTool, getDormToolPermissionMap, listDormToolRows, setDormToolPermissions };

