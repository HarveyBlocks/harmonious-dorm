export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { ApiError } from '@/lib/errors';
import { requireSessionOrThrow, withApiGuard } from '@/lib/route';
import { updateDormBotAvatar } from '@/lib/services';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const session = requireSessionOrThrow();
    const form = await request.formData();
    const file = form.get('avatar');
    if (!(file instanceof File)) {
      throw new ApiError(400, '缺少头像文件');
    }
    const result = await updateDormBotAvatar(session, file);
    return NextResponse.json(result, { status: 201 });
  });
}

