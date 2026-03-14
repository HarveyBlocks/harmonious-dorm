import { NextResponse } from 'next/server';

import { sessionCookieConfig } from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set({
    ...sessionCookieConfig,
    value: '',
    maxAge: 0,
  });
  return response;
}