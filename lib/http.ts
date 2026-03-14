import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ZodError } from 'zod';

import { ApiError } from '@/lib/errors';
import { translateBackendMessage, type LanguageCode } from '@/lib/i18n';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { sessionCookieConfig } from '@/lib/session';

function resolveLang(): LanguageCode {
  const h = headers();
  const candidate = (h.get('x-app-lang') || '').trim();
  if (candidate === 'zh-CN' || candidate === 'zh-TW' || candidate === 'fr' || candidate === 'en') {
    return candidate;
  }
  return 'zh-CN';
}

export async function parseJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, '请求体 JSON 格式错误');
  }
}

export function handleApiError(error: unknown) {
  const lang = resolveLang();

  if (error instanceof ApiError) {
    logWarn('api_error', { status: error.status, message: error.message });
    const response = NextResponse.json({ message: translateBackendMessage(lang, error.message) }, { status: error.status });
    if (error.status === 401) {
      response.cookies.set({
        ...sessionCookieConfig,
        value: '',
        maxAge: 0,
      });
    }
    return response;
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message || '请求参数校验失败';
    logWarn('zod_error', { message, issues: error.issues });
    return NextResponse.json({ message: translateBackendMessage(lang, message) }, { status: 400 });
  }

  if (error instanceof Error) {
    if (error.message.includes('Dynamic server usage')) {
      logInfo('next_dynamic_server_usage_detected', { message: error.message });
      return NextResponse.json({ message: translateBackendMessage(lang, '动态接口') }, { status: 500 });
    }
    logError('unexpected_api_error', error);
    return NextResponse.json({ message: translateBackendMessage(lang, '服务器内部错误') }, { status: 500 });
  }

  logError('unknown_api_error', error);
  return NextResponse.json({ message: translateBackendMessage(lang, '服务器内部错误') }, { status: 500 });
}
