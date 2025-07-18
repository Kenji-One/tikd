"use client";
import { createContext, ReactNode, useContext, useState } from "react";
import { createPortal } from "react-dom";

interface Toast {
  id: number;
  message: string;
  variant?: "success" | "error" | "info";
}
const ToastContext = createContext<{
  add(message: string, variant?: Toast["variant"]): void;
} | null>(null);

let id = 0;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  function add(message: string, variant: Toast["variant"] = "info") {
    setToasts((t) => [...t, { id: ++id, message, variant }]);
    setTimeout(() => setToasts((t) => t.slice(1)), 3000);
  }
  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      {typeof window !== "undefined" &&
        createPortal(
          <div className="fixed inset-x-0 top-4 flex flex-col items-center space-y-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="rounded-md bg-brand-900/90 px-4 py-2 text-sm text-white shadow-lg"
              >
                {t.message}
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
