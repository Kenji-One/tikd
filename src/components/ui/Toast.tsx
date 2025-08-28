// src/components/ui/Toast.tsx
"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";

/* ───────────────────────────── Types ───────────────────────────── */
export type ToastType = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number; // ms
  action?: { label: string; onClick: () => void };
};

type Listener = () => void;

/** Internal, normalized shape kept in the store */
type ToastRecord = {
  id: string;
  title: string;
  description: string;
  type: ToastType;
  duration: number;
  action?: { label: string; onClick: () => void };
};

type ToastState = { toasts: ToastRecord[] };

/* ────────────────────── Simple global store ────────────────────── */
const store = (() => {
  let state: ToastState = { toasts: [] };
  const listeners = new Set<Listener>();

  function emit() {
    for (const l of listeners) l();
  }
  function subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  }
  function getSnapshot(): ToastState {
    return state;
  }
  function add(t: ToastOptions) {
    const id =
      t.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = t.duration ?? 3000;
    const type = t.type ?? "info";
    const rec: ToastRecord = {
      id,
      duration,
      type,
      title: t.title ?? defaultTitle(type),
      description: t.description ?? "",
      ...(t.action ? { action: t.action } : {}),
    };
    state = { toasts: [...state.toasts, rec] };
    emit();
    return id;
  }
  function remove(id: string) {
    state = { toasts: state.toasts.filter((tt) => tt.id !== id) };
    emit();
  }

  return { subscribe, getSnapshot, add, remove };
})();

/* ───────────────────────── Public API ──────────────────────────── */
export const toast = {
  show: (opts: ToastOptions) => store.add(opts),
  success: (msg: string, opts: Omit<ToastOptions, "type" | "title"> = {}) =>
    store.add({ type: "success", title: "Success", description: msg, ...opts }),
  error: (msg: string, opts: Omit<ToastOptions, "type" | "title"> = {}) =>
    store.add({ type: "error", title: "Error", description: msg, ...opts }),
  warning: (msg: string, opts: Omit<ToastOptions, "type" | "title"> = {}) =>
    store.add({ type: "warning", title: "Warning", description: msg, ...opts }),
  info: (msg: string, opts: Omit<ToastOptions, "type" | "title"> = {}) =>
    store.add({ type: "info", title: "Notice", description: msg, ...opts }),
  dismiss: (id: string) => store.remove(id),
};

function defaultTitle(type: ToastType) {
  switch (type) {
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    default:
      return "Notice";
  }
}

/* ───────────── Context for backwards compatibility (add()) ─────── */
const ToastContext = createContext<{
  add: (
    message: string,
    variant?: "success" | "error" | "info" | "warning"
  ) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
} | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

/* ─────────────────────────── UI Parts ──────────────────────────── */
function Toaster() {
  // Call hooks unconditionally (no early returns before hooks)
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );

  const toasts = snapshot.toasts;

  // Delay portal render until after mount (avoids SSR container issues)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // If you add <div id="toast-root" /> in app/layout.tsx, prefer it
  const container =
    document.getElementById("toast-root") ?? (document.body as HTMLElement);

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-4 z-[1000] flex flex-col items-end gap-2 px-4 md:top-6"
    >
      <div className="flex w-full flex-col items-end gap-2 sm:max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} />
        ))}
      </div>
    </div>,
    container
  );
}

function ToastItem(t: ToastRecord) {
  const [hover, setHover] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    timer.current = window.setTimeout(() => toast.dismiss(t.id), t.duration);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [t.id, t.duration]);

  useEffect(() => {
    if (hover && timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    } else if (!hover && !timer.current) {
      timer.current = window.setTimeout(
        () => toast.dismiss(t.id),
        t.duration / 1.5
      );
    }
  }, [hover, t.duration, t.id]);

  const { Icon, accent } = useMemo(() => iconFor(t.type), [t.type]);

  return (
    <div
      role="status"
      className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-surface/95 ring-1 ring-white/5 backdrop-blur transition-all duration-200 ease-out data-[enter=true]:translate-y-0 data-[enter=true]:opacity-100 translate-y-1 opacity-0"
      data-enter
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-start gap-3 p-3">
        {/* icon */}
        <div
          className={`mt-0.5 rounded-full p-1.5 ${accent.bg} ${accent.ring}`}
        >
          <Icon className="h-4 w-4" />
        </div>

        {/* text + optional action */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{t.title}</p>
          {t.description && (
            <p className="mt-0.5 truncate text-xs text-white/70">
              {t.description}
            </p>
          )}
          {t.action?.label && (
            <button
              onClick={() => t.action?.onClick?.()}
              className="mt-2 rounded-md bg-white/5 px-2 py-1 text-xs font-medium text-white hover:bg-white/10"
            >
              {t.action.label}
            </button>
          )}
        </div>

        {/* close */}
        <button
          onClick={() => toast.dismiss(t.id)}
          aria-label="Close"
          className="rounded-md p-1 text-white/70 hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* brand progress bar */}
      <div className={`h-1 w-full ${accent.bar}`}>
        <div
          className="h-full w-full animate-[toastbar_3s_linear_forwards]"
          style={{ animationDuration: `${t.duration}ms` }}
        />
      </div>

      <style jsx global>{`
        @keyframes toastbar {
          from {
            transform: scaleX(1);
            transform-origin: left;
          }
          to {
            transform: scaleX(0);
            transform-origin: left;
          }
        }
      `}</style>
    </div>
  );
}

function iconFor(type: ToastType) {
  switch (type) {
    case "success":
      return {
        Icon: CheckCircle2,
        accent: {
          bg: "bg-emerald-500/15 text-emerald-400",
          ring: "ring-1 ring-emerald-500/20",
          bar: "bg-gradient-to-r from-emerald-500 to-brand-500",
        },
      };
    case "error":
      return {
        Icon: XCircle,
        accent: {
          bg: "bg-rose-500/15 text-rose-400",
          ring: "ring-1 ring-rose-500/20",
          bar: "bg-gradient-to-r from-rose-500 to-brand-500",
        },
      };
    case "warning":
      return {
        Icon: AlertTriangle,
        accent: {
          bg: "bg-amber-500/15 text-amber-300",
          ring: "ring-1 ring-amber-500/20",
          bar: "bg-gradient-to-r from-amber-500 to-brand-500",
        },
      };
    default:
      return {
        Icon: Info,
        accent: {
          bg: "bg-indigo-500/15 text-indigo-300",
          ring: "ring-1 ring-indigo-500/20",
          bar: "bg-gradient-to-r from-indigo-500 to-brand-500",
        },
      };
  }
}

/* ───────────────────────── Provider ───────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo(
    () => ({
      add: (
        message: string,
        variant: "success" | "error" | "info" | "warning" = "info"
      ) => {
        switch (variant) {
          case "success":
            toast.success(message);
            break;
          case "error":
            toast.error(message);
            break;
          case "warning":
            toast.warning(message);
            break;
          default:
            toast.info(message);
        }
      },
      success: (m: string) => toast.success(m),
      error: (m: string) => toast.error(m),
      info: (m: string) => toast.info(m),
      warning: (m: string) => toast.warning(m),
    }),
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}
