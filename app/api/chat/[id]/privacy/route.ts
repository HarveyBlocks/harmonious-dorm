import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { ApiError } from '@/lib/errors';
import { toggleChatMessagePrivacy } from '@/lib/services/chat-service';
import { chatPrivacySchema } from '@/lib/validators';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiGuard(async () => {
    const session = await requireSessionOrThrow();
    const { id } = await context.params;
    const messageId = Number(id);
    if (!Number.isInteger(messageId) || messageId <= 0) {
      throw new ApiError(400, 'Invalid message id', { code: 'chat.message_id.invalid' });
    }
    const body = chatPrivacySchema.parse(await parseJson<{ isPrivateForBot: boolean }>(request));
    const payload = await toggleChatMessagePrivacy(session, messageId, body.isPrivateForBot);
    return NextResponse.json(payload);
  });
}
