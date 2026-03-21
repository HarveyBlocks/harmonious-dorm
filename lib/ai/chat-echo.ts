import { logInfo } from '@/lib/logger';
import type { ChatClientConfig } from '@/lib/ai/chat-types';
import { buildRequestHeaders } from '@/lib/ai/chat-http';

function maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
  const masked = { ...headers };
  if (masked.Authorization) masked.Authorization = 'Bearer ***';
  return masked;
}

function renderEscapedString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

function isMessageContentPath(path: string): boolean {
  return /^body\.messages\[\d+\]\.content$/.test(path);
}

function truncateEchoText(value: string): string {
  const max = 220;
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function normalizeHistoryContentForEcho(input: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  const apply = (history: unknown) => {
    if (!Array.isArray(history)) return;
    history.forEach((row, index) => {
      if (!Array.isArray(row)) return;
      const contentIndex = row.length - 1;
      if (contentIndex >= 0 && typeof row[contentIndex] === 'string') {
        history[index][contentIndex] = (row[contentIndex] as string).replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
      }
    });
  };
  apply(cloned.history);
  if (cloned.userPayload && typeof cloned.userPayload === 'object') {
    apply((cloned.userPayload as Record<string, unknown>).history);
  }
  return cloned;
}

function formatMessageContentReadable(payload: Record<string, unknown>): string {
  const lines: string[] = [];
  const history = Array.isArray(payload.history)
    ? payload.history
    : (payload.userPayload && typeof payload.userPayload === 'object' && Array.isArray((payload.userPayload as Record<string, unknown>).history)
      ? ((payload.userPayload as Record<string, unknown>).history as unknown[])
      : []);
  const currentQuery = Array.isArray(payload.currentQuery)
    ? payload.currentQuery
    : (payload.userPayload && typeof payload.userPayload === 'object' && Array.isArray((payload.userPayload as Record<string, unknown>).currentQuery)
      ? ((payload.userPayload as Record<string, unknown>).currentQuery as unknown[])
      : []);
  lines.push('prompt payload');
  lines.push(`- schemaVersion: ${String(payload.schemaVersion ?? '')}`);
  lines.push(`- dormName: ${String(payload.dormName ?? '')}`);
  lines.push(`- senderRef: ${String(payload.senderRef ?? '')}`);
  lines.push(`- memoryWindow: ${String(payload.memoryWindow ?? '')}`);
  lines.push(`history (${history.length})`);
  history.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    if (row.length >= 5) {
      lines.push(`- [${index}] userRef=${String(row[0])}; userId=${String(row[1])}; userName=${String(row[2])}; dormRole=${String(row[3])}`);
      lines.push(`  content: ${String(row[4])}`);
      return;
    }
    lines.push(`- [${index}] ${JSON.stringify(row)}`);
  });
  lines.push('currentQuery');
  if (currentQuery.length >= 2) {
    lines.push(`- senderRef: ${String(currentQuery[0])}`);
    lines.push(`- content: ${String(currentQuery[1])}`);
  } else {
    lines.push('- (empty)');
  }
  return lines.join('\n');
}

function renderMessageContentForEcho(value: string): { kind: 'markdown' | 'text'; text: string } {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return { kind: 'markdown', text: formatMessageContentReadable(normalizeHistoryContentForEcho(parsed)) };
  } catch {
    return { kind: 'text', text: value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n') };
  }
}

function collectReadableEntries(value: unknown, path: string, lines: string[]) {
  if (value === null || value === undefined) return void lines.push(`- ${path}: null`);
  if (typeof value === 'string') {
    if (isMessageContentPath(path)) {
      const rendered = renderMessageContentForEcho(value);
      lines.push(`- ${path}:`);
      lines.push(`\`\`\`${rendered.kind}`);
      lines.push(rendered.text);
      lines.push('```');
      return;
    }
    return void lines.push(`- ${path}: ${renderEscapedString(value)}`);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return void lines.push(`- ${path}: ${String(value)}`);
  if (Array.isArray(value)) {
    if (value.length === 0) return void lines.push(`- ${path}: []`);
    value.forEach((item, index) => collectReadableEntries(item, `${path}[${index}]`, lines));
    return;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return void lines.push(`- ${path}: {}`);
    entries.forEach(([key, nested]) => collectReadableEntries(nested, `${path}.${key}`, lines));
    return;
  }
  lines.push(`- ${path}: ${String(value)}`);
}

function buildReadableBodySection(body: Record<string, unknown>): string[] {
  const lines: string[] = [];
  collectReadableEntries(body, 'body', lines);
  return lines.length > 0 ? lines : ['- (empty)'];
}

export function buildHttpRequestPreview(config: ChatClientConfig, body: Record<string, unknown>): string {
  const headers = maskSensitiveHeaders(buildRequestHeaders(config));
  const headerLines = Object.entries(headers).map(([key, value]) => `- ${key}: ${value}`);
  return ['### Echo HTTP Request', '', `POST ${config.baseUrl}`, '', 'headers', ...headerLines, '', 'body - readable', ...buildReadableBodySection(body)].join('\n');
}

export function buildHttpRequestRaw(config: ChatClientConfig, body: Record<string, unknown>) {
  return { method: 'POST', url: config.baseUrl, headers: maskSensitiveHeaders(buildRequestHeaders(config)), bodyJson: JSON.stringify(body) };
}

function sanitizeEchoMessage(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const message = { ...(input as Record<string, unknown>) };
  if (message.role !== 'user' || typeof message.content !== 'string') return message;
  try {
    const parsed = JSON.parse(message.content) as { history?: Array<unknown[]>; userPayload?: { history?: Array<unknown[]> } };
    const applyHistoryTrim = (rows: Array<unknown[]>) => rows.map((row) => {
      if (!Array.isArray(row) || row.length === 0) return row;
      const contentIndex = row.length - 1;
      if (typeof row[contentIndex] !== 'string') return row;
      const next = [...row];
      next[contentIndex] = truncateEchoText(next[contentIndex] as string);
      return next;
    });
    if (Array.isArray(parsed.history)) parsed.history = applyHistoryTrim(parsed.history);
    if (parsed.userPayload && Array.isArray(parsed.userPayload.history)) parsed.userPayload.history = applyHistoryTrim(parsed.userPayload.history);
    message.content = JSON.stringify(parsed);
    return message;
  } catch {
    return message;
  }
}

export function buildEchoPreviewBody(body: Record<string, unknown>): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  if (!Array.isArray(cloned.messages)) return cloned;
  cloned.messages = cloned.messages.map((item) => sanitizeEchoMessage(item));
  return cloned;
}

export function splitEchoByToken(text: string): string[] {
  if (!text) return [];
  const parts = text.match(/(\s+|[^\s]+)/g);
  if (!parts || parts.length === 0) return [text];
  return parts;
}

export function logEchoHandled(config: ChatClientConfig, traceId: string, stream: boolean, body: Record<string, unknown>) {
  logInfo('llm_echo_handled', {
    traceId,
    provider: config.provider,
    model: config.model,
    stream,
    action: 'skip_upstream_and_return_echo_preview',
    request: buildHttpRequestRaw(config, body),
  });
}
