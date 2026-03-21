import { useCallback } from 'react';
import type { MutableRefObject } from 'react';

import { dispatchToast } from '@/components/dorm-hub/ui-helpers';

export function useLimitedInputGuard(limitToastRef: MutableRefObject<Record<string, number>>) {
  return useCallback((key: string, value: string, max: number, message: string, apply: (safeValue: string) => void) => {
    if (value.length > max) {
      const now = Date.now();
      const last = limitToastRef.current[key] || 0;
      if (now - last > 800) {
        dispatchToast('error', message);
        limitToastRef.current[key] = now;
      }
      return false;
    }
    apply(value);
    return true;
  }, [limitToastRef]);
}

export function useInviteCodeCopy(inviteCode: string | undefined, copiedText: string, errorText: string) {
  return useCallback(async () => {
    if (!inviteCode || typeof window === 'undefined') return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(inviteCode);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'success', message: copiedText } }));
    } catch {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { type: 'error', message: errorText } }));
    }
  }, [copiedText, errorText, inviteCode]);
}
