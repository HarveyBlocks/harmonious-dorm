import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { listChatMessages, sendChatMessage } from '@/lib/services/chat-service';
import { sendChatSchema } from '@/lib/validators';

export async function GET(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || '20');
    const cursor = Number(searchParams.get('cursor') || '');
    const rows = await listChatMessages(session, {
      limit: Number.isFinite(limit) ? limit : 20,
      cursor: Number.isFinite(cursor) ? cursor : undefined,
    });
    return NextResponse.json(rows);
  });
}

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = sendChatSchema.parse(await parseJson<{ content: string }>(request));
    const payload = await sendChatMessage(session, body.content);
    return NextResponse.json(payload, { status: 201 });
  });
}
