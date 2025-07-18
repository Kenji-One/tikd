"use client";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "classnames";

interface SheetProps {
  side?: "left" | "right" | "bottom";
  open: boolean;
  onClose(): void;
  children: ReactNode;
}

export function Sheet({ side = "left", open, onClose, children }: SheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
  }, [open]);

  if (typeof window === "undefined" || !open) return null;

  const translate =
    side === "left"
      ? "-translate-x-full"
      : side === "right"
        ? "translate-x-full"
        : "translate-y-full";

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* drawer */}
      <div
        className={clsx(
          "relative z-50 h-full w-80 bg-white shadow-lg transition-transform duration-300 ease-in-out",
          {
            "-translate-x-full": !open && side === "left",
            "translate-x-full": !open && side === "right",
            "translate-y-full": !open && side === "bottom",
          }
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
