'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastContextType {
  toast: (type: Toast['type'], message: string) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = String(++counterRef.current);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const colors = {
    success: 'border-st-emerald/30 text-st-emerald',
    error: 'border-st-red/30 text-st-red',
    info: 'border-st-cyan/30 text-st-cyan',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`glass-card-static p-3 border cursor-pointer animate-fade-up ${colors[t.type]}`}
          >
            <p className="text-sm font-medium flex items-center gap-2">
              <span>{icons[t.type]}</span>
              {t.message}
            </p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
