"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "danger";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message: string, tone: ToastTone = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => remove(id), 2600);
  }, [remove]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] grid w-[min(360px,calc(100vw-32px))] gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-[0_16px_36px_rgba(47,35,110,0.14)]",
              toast.tone === "success" && "border-[#bbf7d0] text-[#15803d]",
              toast.tone === "info" && "border-[#d8d1ff] text-[#6C4CF1]",
              toast.tone === "danger" && "border-[#fecaca] text-[#dc2626]",
            )}
          >
            {toast.tone === "danger" ? <Info size={18} /> : <CheckCircle2 size={18} />}
            <span className="mr-auto">{toast.message}</span>
            <button type="button" onClick={() => remove(toast.id)} className="text-[#746d86]">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
