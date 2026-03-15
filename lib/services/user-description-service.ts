import { prisma } from '@/lib/db';

export interface UserDescriptionItem {
  userId: number;
  description: string;
}

async function ensureUserDescriptionsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS user_descriptions (
      user_id INTEGER PRIMARY KEY,
      description TEXT NOT NULL DEFAULT '',
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function listDormUserDescriptions(dormId: number): Promise<Map<number, string>> {
  await ensureUserDescriptionsTable();
  const rows = await prisma.$queryRawUnsafe<Array<{ userId: number; description: string | null }>>(
    `
      SELECT u.id AS userId, d.description AS description
      FROM users u
      LEFT JOIN user_descriptions d ON d.user_id = u.id
      WHERE u.dorm_id = ?
    `,
    dormId,
  );
  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(Number(row.userId), (row.description || '').trim());
  }
  return map;
}

export async function upsertUserDescriptions(items: UserDescriptionItem[]): Promise<void> {
  if (items.length === 0) return;
  await ensureUserDescriptionsTable();
  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO user_descriptions (user_id, description, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id)
          DO UPDATE SET description = excluded.description, updated_at = CURRENT_TIMESTAMP
        `,
        item.userId,
        item.description,
      );
    }
  });
}
