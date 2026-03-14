'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ToastType = 'error' | 'success' | 'info';

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  pushToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

function ToastContainer({ items }: { items: ToastItem[] }) {
  return (
    <div className="app-toast-container" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div key={item.id} className={`app-toast app-toast-${item.type}`}>
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const pushToast = (type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }, 3200);
  };

  useEffect(() => {
    const onToast = (event: Event) => {
      const custom = event as CustomEvent<{ type?: ToastType; message?: string }>;
      const message = custom.detail?.message;
      if (!message) return;
      pushToast(custom.detail?.type || 'error', message);
    };

    const onWindowError = (event: ErrorEvent) => {
      console.error('[frontend-error]', event.error || event.message);
    };

    const onUnhandled = (event: PromiseRejectionEvent) => {
      console.error('[frontend-unhandledrejection]', event.reason);
    };

    window.addEventListener('app:toast', onToast as EventListener);
    window.addEventListener('error', onWindowError);
    window.addEventListener('unhandledrejection', onUnhandled);

    return () => {
      window.removeEventListener('app:toast', onToast as EventListener);
      window.removeEventListener('error', onWindowError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  const value = useMemo(() => ({ pushToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer items={items} />
    </ToastContext.Provider>
  );
}