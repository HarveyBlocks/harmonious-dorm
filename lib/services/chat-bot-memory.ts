import { prisma } from '@/lib/db';

type MemoryQueryInput = {
  dormId: number;
  anchorMessageId?: number;
  botMemoryWindow: number;
  statusTokenPrefix: string;
  abortedTokenPrefix: string;
  batchSize?: number;
};

export async function fetchRecentMessagesForBotMemory(input: MemoryQueryInput) {
  const result: Array<{
    id: number;
    content: string;
    user: { id: number; name: string };
  }> = [];
  const batchSize = input.batchSize ?? 80;
  let cursorId = Number.isFinite(input.anchorMessageId) ? Number(input.anchorMessageId) : Number.MAX_SAFE_INTEGER;

  while (result.length < input.botMemoryWindow) {
    const rows = await prisma.chatMessage.findMany({
      where: {
        dormId: input.dormId,
        isPrivateForBot: false,
        id: { lt: cursorId },
        NOT: [
          { content: { startsWith: input.statusTokenPrefix } },
          { content: { startsWith: input.abortedTokenPrefix } },
        ],
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
