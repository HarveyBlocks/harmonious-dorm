import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ZodError } from 'zod';

import { ApiError, BackendErrorCodeMissingError } from '@/lib/errors';
import { translateBackendErrorByCode, type LanguageCode } from '@/lib/i18n';
import { logError, logInfo, logWarn } from '@/lib/logger';
import { sessionCookieConfig } from '@/lib/session';

async function resolveLang(): Promise<LanguageCode> {
  const h = await headers();
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
    throw new ApiError(400, 'Invalid JSON body', { code: 'request.json.invalid' });
  }
}

function responseByErrorCode(
  lang: LanguageCode,
  status: number,
  code: string,
  params?: Record<string, unknown>,
): NextResponse {
  try {
    const message = translateBackendErrorByCode(lang, code, params);
    return NextResponse.json({ code, message }, { status });
  } catch (translateError) {
    if (translateError instanceof BackendErrorCodeMissingError) {
      logError('backend_error_code_missing', translateError, { code: translateError.missingCode, status });
      return NextResponse.json({ code: translateError.missingCode, message: translateError.missingCode }, { status: 500 });
    }
    logError('backend_error_translate_failed', translateError, { code, status });
    return NextResponse.json({ code, message: code }, { status: 500 });
  }
}

export async function handleApiError(error: unknown): Promise<NextResponse> {
  const lang = await resolveLang();

  if (error instanceof ApiError) {
    const meta = {
      status: error.status,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.report ? { report: error.report } : {}),
      controlled: error.controlled,
    };
    if (error.controlled) {
      logWarn('api_error', meta);
    } else {
      logError('api_error', error, meta);
    }
    const response = responseByErrorCode(lang, error.status, error.code, error.report);
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
    const issue = error.issues[0];
    const path = (issue?.path || []).join('.');
    logWarn('zod_error', { issue, issues: error.issues });
    return responseByErrorCode(lang, 400, 'request.validation.invalid', {
      path: path || '-',
      issueCode: issue?.code || '-',
    });
  }

  if (error instanceof Error) {
    if (error.message.includes('Dynamic server usage')) {
      logInfo('next_dynamic_server_usage_detected', { message: error.message });
      return responseByErrorCode(lang, 500, 'request.dynamic_api');
    }
    logError('unexpected_api_error', error);
    return responseByErrorCode(lang, 500, 'request.processing.failed');
  }

  logError('unknown_api_error', error);
  return responseByErrorCode(lang, 500, 'request.processing.failed');
}
