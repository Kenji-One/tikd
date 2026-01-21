/* ------------------------------------------------------------------ */
/*  src/components/ui/Modal.tsx                                       */
/* ------------------------------------------------------------------ */
"use client";

import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
};

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  md: "max-w-[720px]",
  lg: "max-w-[920px]",
  xl: "max-w-[1100px]",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "lg",
}: Props) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKey);

    // lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />

      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={clsx(
            "w-full rounded-[var(--radius-card)] border border-neutral-700 bg-neutral-900 shadow-[0_24px_70px_rgba(0,0,0,0.65)]",
            SIZE_CLASS[size],
          )}
        >
          <div className="flex items-center justify-between border-b border-neutral-700 px-5 py-4">
            <div className="text-sm font-extrabold tracking-tight text-white/90">
              {title ?? ""}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-neutral-900/40 text-white/80 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
