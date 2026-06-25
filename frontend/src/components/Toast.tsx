import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

let addToast: (msg: ToastMessage) => void = () => {};

export const toast = {
  success: (message: string) => addToast({ id: Math.random().toString(), message, type: 'success' }),
  error: (message: string) => addToast({ id: Math.random().toString(), message, type: 'error' }),
  info: (message: string) => addToast({ id: Math.random().toString(), message, type: 'info' }),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToast = (msg) => {
      setToasts(prev => [...prev, msg]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== msg.id));
      }, 3000);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all animate-in fade-in slide-in-from-top-5 ${t.type === 'error' ? 'bg-red-500' : 'bg-zinc-800'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
