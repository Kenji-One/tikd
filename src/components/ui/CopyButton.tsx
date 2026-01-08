/* ------------------------------------------------------------------ */
/*  src/components/ui/CopyButton.tsx                                   */
/* ------------------------------------------------------------------ */
"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";

type Props = {
  /** Text to copy */
  text: string;

  /** Tooltip text shown in the floating bubble */
  copiedLabel?: string;

  /** Button title attribute */
  title?: string;

  /** Screen reader label */
  ariaLabel?: string;

  /** Button classes */
  className?: string;

  /** Icon/content */
  children: ReactNode;

  /** Optional hook */
  onCopied?: () => void;
};

type ToastState = {
  x: number; // viewport coords
  y: number;
  id: number;
};

async function copyToClipboard(text: string) {
  // Preferred modern API
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  // Fallback: execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function CopyButton({
  text,
  copiedLabel = "Copied",
  title = "Copy",
  ariaLabel = "Copy to clipboard",
  className,
  children,
  onCopied,
}: Props) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pressing, setPressing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, []);

  const showToast = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    setToast({
      x: r.left + r.width / 2,
      y: r.top, // anchor at top of button
      id: Date.now(),
    });

    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setToast(null), 900);
  }, []);

  const triggerPress = useCallback(() => {
    // restart animation reliably
    setPressing(false);
    requestAnimationFrame(() => setPressing(true));
  }, []);

  const onClick = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (!ok) return;

    triggerPress();
    showToast();
    onCopied?.();
  }, [text, triggerPress, showToast, onCopied]);

  const canPortal = typeof document !== "undefined";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={clsx(
          "relative inline-flex items-center justify-center cursor-pointer select-none",
          className
        )}
        style={
          pressing ? { animation: "tikd-copy-press 240ms ease-out" } : undefined
        }
        onAnimationEnd={() => setPressing(false)}
      >
        {children}
      </button>

      {canPortal && toast
        ? createPortal(
            <div
              key={toast.id}
              className="pointer-events-none fixed z-[9999]"
              style={{
                left: toast.x,
                top: toast.y,
                transform: "translate(-50%, -115%)",
              }}
            >
              <div
                className={clsx(
                  "relative rounded-full border border-white/10 bg-[rgba(154,70,255,0.18)] backdrop-blur-md px-3 py-1.5",
                  "text-sm font-semibold text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                )}
                style={{ animation: "tikd-copy-toast 900ms ease-out both" }}
              >
                {copiedLabel}
                {/* tail */}
                <span
                  className="absolute left-1/2 top-full h-0 w-0"
                  style={{
                    transform: "translateX(-50%)",
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "6px solid rgba(154,70,255,0.18)",
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}

      <style jsx global>{`
        @keyframes tikd-copy-press {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(0.92);
          }
          70% {
            transform: scale(1.04);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes tikd-copy-toast {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
            filter: blur(1px);
          }
          18% {
            opacity: 1;
            transform: translateY(0px) scale(1);
            filter: blur(0px);
          }
          72% {
            opacity: 1;
            transform: translateY(-2px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-14px) scale(0.98);
          }
        }
      `}</style>
    </>
  );
}
