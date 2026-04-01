import { NextResponse } from 'next/server';

import { getServerSession } from '@/lib/auth';
import { ApiError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { logInfo } from '@/lib/logger';
import type { SessionUser } from '@/lib/types';

export async function requireSessionOrThrow(): Promise<SessionUser> {
  const session = await getServerSession();
  if (!session) {
    throw new ApiError(401, 'Login required', { code: 'auth.login.required' });
  }
  return session;
}

export function withApiGuard(handler: () => Promise<NextResponse>) {
  const start = Date.now();
  return handler()
    .then((response) => {
      logInfo('api_success', { status: response.status, costMs: Date.now() - start });
      return response;
    })
    .catch((error) => handleApiError(error));
}
