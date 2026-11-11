'use client';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastApi {
  show: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const DISMISS_MS = 6000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId++;
      // The same message again (two saves in a row) takes the place of the one on screen: it never stacks
      setToasts((list) => [...list.filter((x) => x.title !== toast.title || x.body !== toast.body || x.tone !== toast.tone).slice(-3), { ...toast, id }]);
      setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {/*
        Top centre on every screen size: at the bottom right a message sat on the POS Send to Kitchen / Bill Now buttons for six
        seconds and swallowed the cashier's tap. Taps also pass through a message to what is under it; only its X takes a tap.
      */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 top-20 z-50 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cn(
              'flex w-full max-w-sm items-start gap-3 rounded-2xl border p-4 shadow-lg',
              toast.tone === 'success' && 'border-green-200 bg-green-50 text-green-900',
              toast.tone === 'error' && 'border-red-200 bg-red-50 text-red-900',
              toast.tone === 'info' && 'border-slate-200 bg-white text-slate-900',
            )}
          >
            {toast.tone === 'error' ? (
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
            )}
            <div className="flex-1">
              <p className="font-bold">{toast.title}</p>
              {toast.body && <p className="text-sm opacity-80">{toast.body}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t('nav.close')}
              className="pointer-events-auto -m-1 rounded-lg p-1 opacity-60 hover:opacity-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
