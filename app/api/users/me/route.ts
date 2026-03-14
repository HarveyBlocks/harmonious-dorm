import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { getMe, updateMyName, deleteMyAccount } from '@/lib/services';
import { sessionCookieConfig } from '@/lib/session';
import { updateNameSchema } from '@/lib/validators';

export async function GET() {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const me = await getMe(session);
    return NextResponse.json(me);
  });
}

export async function PUT(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const body = updateNameSchema.parse(
      await parseJson<{ name?: string; language?: 'zh-CN' | 'zh-TW' | 'fr' | 'en' }>(request),
    );
    const me = await updateMyName(session, body);
    return NextResponse.json(me);
  });
}

export async function DELETE() {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    await deleteMyAccount(session);
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      ...sessionCookieConfig,
      value: '',
      maxAge: 0,
    });
    return response;
  });
}
