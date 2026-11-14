import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function ToastContainer() {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg border text-xs font-medium transition-all ${
            toast.tone === 'error'
              ? 'bg-red-950 text-red-50 border-red-800'
              : toast.tone === 'success'
              ? 'bg-zinc-900 text-white border-zinc-700'
              : 'bg-white text-zinc-900 border-zinc-200'
          }`}
        >
          <span>{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
