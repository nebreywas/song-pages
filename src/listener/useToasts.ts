import { useCallback, useRef, useState } from 'react';

export type ToastItem = {
  id: string;
  message: string;
};

const DEFAULT_TOAST_MS = 3200;

/** Lightweight ephemeral alerts — upper-right stack with auto-dismiss. */
export function useToasts(durationMs = DEFAULT_TOAST_MS) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer != null) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setToasts((prev) => [...prev, { id, message }]);

      const timer = window.setTimeout(() => dismissToast(id), durationMs);
      timersRef.current.set(id, timer);
    },
    [dismissToast, durationMs],
  );

  return { toasts, addToast, dismissToast };
}
