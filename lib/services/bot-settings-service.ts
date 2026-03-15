import { prisma } from '@/lib/db';

export interface BotSettingPair {
  key: string;
  value: string;
}

export const BOT_OTHER_CONTENT_KEY = '__bot_other_content__';

async function ensureBotSettingsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS dorm_bot_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dorm_id INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      order_no INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function listDormBotSettingsSafe(dormId: number): Promise<BotSettingPair[]> {
  try {
    await ensureBotSettingsTable();
    const rows = await prisma.$queryRawUnsafe<Array<{ key: string; value: string }>>(
      `SELECT key, value FROM dorm_bot_settings WHERE dorm_id = ? ORDER BY order_no ASC, id ASC`,
      dormId,
    );
    return rows.map((item) => ({ key: item.key, value: item.value }));
  } catch {
    return [];
  }
}

export async function replaceDormBotSettingsSafe(dormId: number, settings: BotSettingPair[]): Promise<void> {
  await ensureBotSettingsTable();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM dorm_bot_settings WHERE dorm_id = ?`, dormId);
    for (let index = 0; index < settings.length; index += 1) {
      const item = settings[index];
      await tx.$executeRawUnsafe(
        `INSERT INTO dorm_bot_settings (dorm_id, key, value, order_no) VALUES (?, ?, ?, ?)`,
        dormId,
        item.key,
        item.value,
        index,
      );
    }
  });
}
