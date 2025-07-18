"use client";
import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import clsx from "classnames";

interface ModalProps {
  open: boolean;
  onClose(): void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  // close on escape
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (typeof window === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "w-full max-w-lg rounded-lg bg-white p-6 shadow-xl",
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
