import { prisma } from '@/lib/db';

export interface BotSettingPair {
  key: string;
  value: string;
}

export const BOT_OTHER_CONTENT_KEY = '__bot_other_content__';
export const BOT_MEMORY_WINDOW_KEY = '__bot_memory_window__';
export const BOT_MEMORY_WINDOW_MIN = 1;
export const BOT_MEMORY_WINDOW_MAX = 35;
export const BOT_MEMORY_WINDOW_DEFAULT = 10;

export type BotToolPermission = 'allow' | 'deny';



export function normalizeToolPermission(raw: unknown): BotToolPermission {
  return String(raw || '').trim().toLowerCase() === 'allow' ? 'allow' : 'deny';
}

export function normalizeBotMemoryWindow(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return BOT_MEMORY_WINDOW_DEFAULT;
  const normalized = Math.floor(parsed);
  if (normalized < BOT_MEMORY_WINDOW_MIN) return BOT_MEMORY_WINDOW_MIN;
  if (normalized > BOT_MEMORY_WINDOW_MAX) return BOT_MEMORY_WINDOW_MAX;
  return normalized;
}

export async function listDormBotSettingsSafe(dormId: number): Promise<BotSettingPair[]> {
  try {
    const rows = await prisma.dormBotSetting.findMany({
      where: { dormId },
      orderBy: [{ orderNo: 'asc' }, { id: 'asc' }],
      select: { key: true, value: true },
    });
    return rows;
  } catch {
    return [];
  }
}

export async function replaceDormBotSettingsSafe(dormId: number, settings: BotSettingPair[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.dormBotSetting.deleteMany({ where: { dormId } });
    const now = new Date();
    for (let index = 0; index < settings.length; index += 1) {
      const item = settings[index];
      await tx.dormBotSetting.create({
        data: {
          dormId,
          key: item.key,
          value: item.value,
          orderNo: index,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  });
}