export type DeltaStatus = 'content' | 'done' | 'reasoning';
export type DeltaLineResult = { status: DeltaStatus; content: string };

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(/[\u3400-\u9FFF]/g) || []).length;
  const otherCount = Math.max(0, text.length - cjkCount);
  return cjkCount + Math.ceil(otherCount / 4);
}

export function parseSsePayloadLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts, rest };
}

function toTextChunk(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((item) => toTextChunk(item)).join('');
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  if (typeof record.text === 'string') return record.text;
  if (typeof record.content === 'string') return record.content;
  return '';
}

export function parseDeltaLine(input: { line: string; env?: string; preStatus: DeltaStatus }): DeltaLineResult {
  const { line, env, preStatus } = input;
  if (env === 'local') {
    const json = JSON.parse(line) as { message?: { content?: unknown }; done?: boolean };
    if (json.done) return { status: 'done', content: '' };
    return { status: 'content', content: toTextChunk(json.message?.content) };
  }

  const trimmed = line.trim();
  if (trimmed === '') return { status: preStatus, content: '' };
  if (!trimmed.startsWith('data:')) return { status: preStatus, content: '' };
  const payload = trimmed.slice(5).trim();
  if (!payload || payload === '[DONE]') return { status: 'done', content: '' };

  try {
    const json = JSON.parse(payload) as {
      choices?: Array<{
        delta?: { content?: unknown; reasoning_content?: unknown };
        message?: { content?: unknown; reasoning_content?: unknown };
      }>;
    };
    const content = toTextChunk(json.choices?.[0]?.delta?.content) || toTextChunk(json.choices?.[0]?.message?.content);
    if (content) return { status: 'content', content };
    const reasoning =
      toTextChunk(json.choices?.[0]?.delta?.reasoning_content) ||
      toTextChunk(json.choices?.[0]?.message?.reasoning_content);
    if (reasoning) return { status: 'reasoning', content: reasoning };
    return { status: preStatus, content: '' };
  } catch {
    return { status: preStatus, content: '' };
  }
}

export function extractNonStreamContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as {
    message?: { content?: string };
    choices?: Array<{ message?: { content?: string } }>;
    content?: string;
  };
  return data.message?.content || data.choices?.[0]?.message?.content || data.content || '';
}
