import { prisma } from '@/lib/db';
import { BOT_RUNTIME_CONFIG } from '@/lib/config/bot-runtime';

type MemoryQueryInput = {
  dormId: number;
  anchorMessageId?: number;
  botMemoryWindow: number;
  batchSize?: number;
};

export async function fetchRecentMessagesForBotMemory(input: MemoryQueryInput) {
  const result: Array<{
    id: number;
    content: string;
    user: { id: number; name: string };
  }> = [];
  const batchSize = input.batchSize ?? BOT_RUNTIME_CONFIG.memoryFetchBatchSize;
  let cursorId = Number.isFinite(input.anchorMessageId) ? Number(input.anchorMessageId) : Number.MAX_SAFE_INTEGER;

  while (result.length < input.botMemoryWindow) {
    const rows = await prisma.chatMessage.findMany({
      where: {
        dormId: input.dormId,
        isPrivateForBot: false,
        excludeFromBotMemory: false,
        id: { lt: cursorId },
      },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { id: 'desc' },
      take: batchSize,
    });
    if (!rows.length) break;
    result.push(...rows);
    cursorId = rows[rows.length - 1].id;
  }

  return result
    .slice(0, input.botMemoryWindow)
    .sort((a, b) => a.id - b.id)
    .map((item) => ({ userId: item.user.id, userName: item.user.name, content: item.content }));
}
