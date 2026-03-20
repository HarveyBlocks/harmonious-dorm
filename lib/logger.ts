import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ApiError, UpstreamServiceError, isControlledError } from '@/lib/errors';

type LogLevel = 'info' | 'warn' | 'error';

const LOG_FILE_PATH =
  process.env.BACKEND_LOG_PATH ||
  path.join(os.tmpdir(), 'harmonious-dorm', 'backend.log');

function writeLog(line: string) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true });
    fs.appendFileSync(LOG_FILE_PATH, `${line}\n`, 'utf8');
  } catch {
    // fallback silently; console output still available
  }
}

function normalizeRecord(input: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!input) return undefined;
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function trimStack(stack?: string, maxLines = 12): string[] | undefined {
  if (!stack) return undefined;
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, maxLines);
}

function normalizeUnknownError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const payload: Record<string, unknown> = {
      type: 'error',
      name: error.name,
      message: error.message,
      stackTop: trimStack(error.stack),
    };
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      payload.cause = {
        name: cause.name,
        message: cause.message,
        stackTop: trimStack(cause.stack, 6),
      };
    }
    return payload;
  }
  if (error && typeof error === 'object') {
    return { type: 'non_error_object', value: error as Record<string, unknown> };
  }
  return { type: 'non_error_value', value: error };
}

function normalizeErrorPayload(error?: unknown): Record<string, unknown> | undefined {
  if (error === undefined) return undefined;
  if (error instanceof UpstreamServiceError) {
    return normalizeRecord({
      type: 'upstream_service_error',
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      controlled: error.controlled,
      upstreamService: error.upstreamService,
      upstreamStatus: error.upstreamStatus,
      upstreamCode: error.upstreamCode,
      retryable: error.retryable,
      report: error.report,
    });
  }
  if (error instanceof ApiError) {
    const includeStack = !error.controlled;
    return normalizeRecord({
      type: isControlledError(error) ? 'controlled_api_error' : 'api_error',
      name: error.name,
      message: error.message,
      status: error.status,
      code: error.code,
      controlled: error.controlled,
      report: error.report,
      ...(includeStack ? { stackTop: trimStack((error as Error).stack) } : {}),
    });
  }
  return normalizeUnknownError(error);
}

function buildLogEntry(level: LogLevel, message: string, meta?: Record<string, unknown>, error?: unknown) {
  const normalizedMeta = normalizeRecord(meta);
  const errorPayload = normalizeErrorPayload(error);
  return {
    level,
    time: new Date().toISOString(),
    message,
    ...(normalizedMeta ? { meta: normalizedMeta } : {}),
    ...(errorPayload ? { error: errorPayload } : {}),
  };
}

function printConsoleLog(entry: ReturnType<typeof buildLogEntry>) {
  const header = `[${entry.time}] ${entry.level.toUpperCase()} ${entry.message || '(empty message)'}`;
  const prettyBody = JSON.stringify(entry, null, 2);
  const rendered = `${header}\n${prettyBody}`;
  if (entry.level === 'error') {
    console.error(rendered);
    return;
  }
  if (entry.level === 'warn') {
    console.warn(rendered);
    return;
  }
  console.log(rendered);
}

 function persistStructuredLog(entry: ReturnType<typeof buildLogEntry>) {
  writeLog(JSON.stringify(entry));
}

export function logInfo(message: string, meta?: Record<string, unknown>) {
  const entry = buildLogEntry('info', message, meta);
  printConsoleLog(entry);
  persistStructuredLog(entry);
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  const entry = buildLogEntry('warn', message, meta);
  printConsoleLog(entry);
  persistStructuredLog(entry);
}

export function logError(message: string, error?: unknown, meta?: Record<string, unknown>) {
  const entry = buildLogEntry('error', message, meta, error);
  printConsoleLog(entry);
  persistStructuredLog(entry);
}
