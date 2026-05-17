import { NextResponse } from 'next/server';

import { parseJson } from '@/lib/http';
import { withApiGuard } from '@/lib/route';
import { ingestRadarStatus } from '@/lib/services/radar-service';
import { radarStatusInputSchema } from '@/lib/validators';

export async function POST(request: Request) {
  return withApiGuard(async () => {
    const body = radarStatusInputSchema.parse(await parseJson(request));
    const token = request.headers.get('x-device-token');
    await ingestRadarStatus(body, { authToken: token });
    return NextResponse.json({
      code: 200,
      msg: 'success',
    });
  });
}
