import { I18N, type LanguageCode } from '@/lib/i18n';

export class ClientApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const preferredLang = (
    typeof window !== 'undefined' ? window.localStorage.getItem('app_lang') || 'zh-CN' : 'zh-CN'
  ) as LanguageCode;
  const langPack = I18N[preferredLang] || I18N['zh-CN'];

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'x-app-lang': preferredLang,
        ...(init?.headers || {}),
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'error', message: langPack.networkError },
        }),
      );
    }
    throw error;
  }

  if (!response.ok) {
    let message: string = langPack.requestFailed;
    try {
      const payload = (await response.json()) as { message?: string };
      if (payload?.message) {
        message = payload.message;
      }
    } catch {
      // keep fallback message
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: { type: 'error', message },
        }),
      );
    }

    if (response.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.replace('/login');
    }

    throw new ClientApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
