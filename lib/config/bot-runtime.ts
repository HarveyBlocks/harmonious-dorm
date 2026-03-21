function readPositiveInt(keys: string[], fallback: number): number {
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    return Math.floor(parsed);
  }
  return fallback;
}

export const BOT_RUNTIME_CONFIG = {
  memoryFetchBatchSize: readPositiveInt(['BOT_MEMORY_FETCH_BATCH_SIZE'], 80),
  streamPersistIntervalMs: readPositiveInt(['BOT_STREAM_PERSIST_INTERVAL_MS'], 600),
  streamPersistMinGrowth: readPositiveInt(['BOT_STREAM_PERSIST_MIN_GROWTH'], 120),
} as const;
