import fs from 'node:fs';
import path from 'node:path';

const LOG_FILE_PATH = path.join(process.cwd(), 'logs', 'backend.log');

function writeLog(line: string) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true });
    fs.appendFileSync(LOG_FILE_PATH, `${line}\n`, 'utf8');
  } catch {
    // fallback silently; console output still available
  }
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    level: 'info',
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
  });
  console.log(line);
  writeLog(line);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    level: 'warn',
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
  });
  console.warn(line);
  writeLog(line);
}

export function logError(message: string, error?: unknown, meta?: Record<string, unknown>) {
  const errorPayload =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : error;

  const line = JSON.stringify({
    level: 'error',
    time: new Date().toISOString(),
    message,
    ...(meta ? { meta } : {}),
    ...(errorPayload ? { error: errorPayload } : {}),
  });
  console.error(line);
  writeLog(line);
}
