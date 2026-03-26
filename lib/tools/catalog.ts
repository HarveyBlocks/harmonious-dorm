import { prisma } from '@/lib/db';

import { BOT_TOOL_REGISTRY, TOOL_DESCRIPTOR_MAP } from './registry';
import type { ToolDescriptor, ToolPermission } from './types';

export type DormToolRow = ToolDescriptor & { permission: ToolPermission };

function resolveDormToolPermission(storedPermission: string | undefined): ToolPermission {
  return storedPermission === 'allow' ? 'allow' : 'deny';
}

async function upsertToolDefinitions(): Promise<void> {
  for (const tool of BOT_TOOL_REGISTRY) {
    await prisma.toolDefinition.upsert({
      where: { name: tool.name },
      update: {
        displayName: tool.displayName,
        description: tool.description,
        argumentSchema: JSON.stringify(tool.argumentSchema),
        operationScope: tool.operationScope,
      },
      create: {
        name: tool.name,
        displayName: tool.displayName,
        description: tool.description,
        argumentSchema: JSON.stringify(tool.argumentSchema),
        operationScope: tool.operationScope,
      },
    });
  }
}

export async function listDormToolRows(dormId: number): Promise<DormToolRow[]> {
  await upsertToolDefinitions();

  const tools = await prisma.toolDefinition.findMany({
    orderBy: [{ id: 'asc' }],
    include: {
      botPermissions: {
        where: { dormId },
        select: { permission: true },
        take: 1,
      },
    },
  });

  return tools
    .map((item) => {
      const descriptor = TOOL_DESCRIPTOR_MAP.get(item.name);
      if (!descriptor) return null;
      return {
        ...descriptor,
        permission: resolveDormToolPermission(item.botPermissions[0]?.permission),
      };
    })
    .filter(Boolean) as DormToolRow[];
}

export async function getDormToolPermissionMap(dormId: number): Promise<Record<string, ToolPermission>> {
  const rows = await listDormToolRows(dormId);
  return Object.fromEntries(rows.map((item) => [item.name, item.permission] as const));
}

export async function setDormToolPermissions(
  dormId: number,
  toolPermissions: Record<string, ToolPermission>,
): Promise<Array<{ tool: string; permission: ToolPermission }>> {
  await upsertToolDefinitions();

  const tools = await prisma.toolDefinition.findMany({ select: { id: true, name: true } });
  const toolMap = new Map(tools.map((item) => [item.name, item.id] as const));
  const normalized = Object.entries(toolPermissions)
    .map(([tool, permission]) => ({
      tool: tool.trim(),
      permission: (permission === 'allow' ? 'allow' : 'deny') as ToolPermission,
    }))
    .filter((item) => Boolean(item.tool) && toolMap.has(item.tool));

  const targetRows = normalized.map((item) => ({
    toolId: toolMap.get(item.tool)!,
    permission: item.permission,
  }));

  await prisma.$transaction(async (tx) => {
    if (targetRows.length === 0) return;

    const toolIds = targetRows.map((item) => item.toolId);
    await tx.dormBotToolPermission.deleteMany({
      where: {
        dormId,
        toolId: { in: toolIds },
      },
    });

    await tx.dormBotToolPermission.createMany({
      data: targetRows.map((item) => ({
        dormId,
        toolId: item.toolId,
        permission: item.permission,
      })),
    });
  });

  const rows = await listDormToolRows(dormId);
  return rows.map((item) => ({ tool: item.name, permission: item.permission }));
}
