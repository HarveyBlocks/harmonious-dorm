import { NextResponse } from 'next/server';

import { getServerSession } from '@/lib/auth';
import { ApiError } from '@/lib/errors';
import { handleApiError } from '@/lib/http';
import { logInfo } from '@/lib/logger';
import type { SessionUser } from '@/lib/types';

export function requireSessionOrThrow(): SessionUser {
  const session = getServerSession();
  if (!session) {
    throw new ApiError(401, '请先登录');
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
