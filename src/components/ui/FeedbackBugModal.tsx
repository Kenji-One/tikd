/* ------------------------------------------------------------------ */
/*  src/components/ui/FeedbackBugModal.tsx                            */
/* ------------------------------------------------------------------ */
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

type Variant = "feedback" | "bug";

type Props = {
  open: boolean;
  onClose: () => void;
  variant: Variant;
};

const MAX = 500;

export default function FeedbackBugModal({ open, onClose, variant }: Props) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const copy = useMemo(() => {
    if (variant === "bug") {
      return {
        title: "Report a Bug",
        subtitle:
          "Help us improve by reporting any issues or bugs you encounter.",
        fieldLabel: "Bug Description",
        placeholder:
          "Please describe the bug you encountered, including steps to reproduce if possible",
        buttonText: "Submit Bug Report",
        endpoint: "/api/bug-report",
      };
    }

    return {
      title: "Submit Feedback",
      subtitle: "Help us improve by sharing your thoughts and suggestions.",
      fieldLabel: "Feedback",
      placeholder: "Let us know about any issues or suggestions you have",
      buttonText: "Submit Feedback",
      endpoint: "/api/feedback",
    };
  }, [variant]);

  useEffect(() => setMounted(true), []);

  // Esc to close + lock scroll while open
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const sbw = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (sbw > 0) body.style.paddingRight = `${sbw}px`;

    // focus textarea ASAP
    window.setTimeout(() => textareaRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [open, onClose]);

  // Reset state when opening
  useEffect(() => {
    if (!open) return;
    setErr(null);
    setSubmitting(false);
    setValue("");
  }, [open]);

  const count = value.length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmed = value.trim();
    if (!trimmed) {
      setErr("Please enter a message.");
      textareaRef.current?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(copy.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(j?.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setErr("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (!mounted || !open) return null;

  const titleId = "tikd-feedback-bug-title";

  const modal = (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
      />

      {/* Dialog area (IMPORTANT: this sits above the backdrop and catches clicks) */}
      <div
        className="absolute inset-0 flex items-center justify-center px-4 py-6"
        onMouseDown={(e) => {
          // Clicked the "empty space" around the dialog (not inside it)
          if (e.target === e.currentTarget) onClose();
        }}
        onTouchStart={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={clsx(
            "relative w-full max-w-[760px]",
            "rounded-[22px] border border-white/10",
            "bg-neutral-950/90 backdrop-blur-xl",
            "shadow-[0_34px_120px_rgba(0,0,0,0.78)]",
            "overflow-hidden",
          )}
        >
          {/* Subtle header glow */}
          <div
            className={clsx(
              "pointer-events-none absolute inset-x-0 top-0 h-[160px]",
              "bg-[radial-gradient(900px_260px_at_50%_0%,rgba(154,70,255,0.22),transparent_55%)]",
            )}
          />

          {/* Close */}
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={clsx(
              "absolute right-4 top-4 z-10",
              "grid h-9 w-9 place-items-center rounded-xl",
              "border border-white/10 bg-white/5 text-white/80",
              "transition hover:bg-white/10 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 cursor-pointer",
            )}
          >
            <X className="h-4.5 w-4.5" />
          </button>

          {/* Logo above title + divider (NOT near the button) */}
          <div className="relative px-6 sm:px-8 pt-7">
            <div className="flex items-center justify-center">
              <div className="relative h-[34px] w-[96px]">
                <Image
                  src="/Logo.svg"
                  alt="Tixsy"
                  fill
                  className="object-contain opacity-90"
                  priority
                />
              </div>
            </div>

            <div className="mt-4 h-px w-full bg-white/10" />

            <div className="pt-5 pb-4">
              <h2
                id={titleId}
                className="text-[22px] font-semibold tracking-[-0.4px] text-white"
              >
                {copy.title}
              </h2>
              <p className="mt-1 text-sm text-white/65">{copy.subtitle}</p>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={onSubmit} className="relative px-6 sm:px-8 pb-7">
            <div className="space-y-2">
              <div className="text-sm font-semibold text-white/70">
                {copy.fieldLabel}
              </div>

              {/* Use TextArea component to match Input styling */}
              <TextArea
                ref={(node) => {
                  textareaRef.current = node;
                }}
                value={value}
                onChange={(e) => {
                  const next = e.target.value.slice(0, MAX);
                  setValue(next);
                  if (err) setErr(null);
                }}
                placeholder={copy.placeholder}
                variant="full"
                size="md"
                textareaClassName={clsx(
                  "min-h-[180px]",
                  "leading-[140%]", // textarea should breathe a bit more than inputs
                  "border border-white/10",
                )}
              />

              <div className="flex items-center justify-between">
                {err ? (
                  <p className="text-sm text-red-400" role="alert">
                    {err}
                  </p>
                ) : (
                  <span className="text-xs text-white/35">
                    Keep it short, clear, and reproducible if possible.
                  </span>
                )}

                <span className="text-xs text-white/35">
                  {count}/{MAX} characters
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-end">
              <Button
                type="submit"
                variant="brand"
                size="xs"
                animation
                loading={submitting}
                disabled={submitting || value.trim().length === 0}
                className="rounded-lg"
              >
                {submitting ? "Submitting..." : copy.buttonText}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
