import { NextResponse } from 'next/server';

import { createSessionToken, sessionCookieConfig } from '@/lib/session';
import { loginInputSchema } from '@/lib/validators';
import { loginOrRegister } from '@/lib/services';
import { parseJson } from '@/lib/http';
import { withApiGuard } from '@/lib/route';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const body = loginInputSchema.parse(
      await parseJson<{ name?: string; email: string; inviteCode?: string; mode?: 'login' | 'register' }>(request),
    );
    const result = await loginOrRegister(body.name, body.email, body.inviteCode, body.mode);

    const response = NextResponse.json(result, { status: 200 });
    const token = createSessionToken({
      userId: result.userId,
      dormId: result.dormId,
      isLeader: result.isLeader,
    });

    response.cookies.set({
      ...sessionCookieConfig,
      value: token,
    });

    return response;
  });
}
