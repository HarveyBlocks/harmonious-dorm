import crypto from 'node:crypto';

import { SESSION_COOKIE_NAME } from '@/lib/constants';
import type { SessionUser } from '@/lib/types';

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function getSecret(): string {
  return process.env.SESSION_SECRET || 'harmonious-dorm-dev-secret';
}

function signPayload(value: string): string {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionToken(payload: SessionUser): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json).toString('base64url');
  return `${body}.${signPayload(body)}`;
}

export function readSessionToken(token: string | undefined): SessionUser | null {
  if (!token) {
    return null;
  }

  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }

  if (signPayload(body) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionUser;
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.dormId !== 'number' ||
      typeof payload.isLeader !== 'boolean'
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieConfig = {
  name: SESSION_COOKIE_NAME,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ONE_WEEK_SECONDS,
};