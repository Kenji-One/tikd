// src/components/ui/TicketDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  QrCode,
  Wallet,
  ArrowRightLeft,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import TicketCard, { TicketCardProps } from "./TicketCard";
import { Button } from "./Button";

export interface TicketDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: TicketCardProps & {
    qrUrl?: string; // PNG/SVG URL
    qrSvg?: string; // inline SVG markup
    refCode?: string; // order reference
  };
}

export default function TicketDialog({
  open,
  onClose,
  ticket,
}: TicketDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const ariaId = useMemo(
    () => `ticket-dialog-${Math.random().toString(36).slice(2)}`,
    []
  );

  if (typeof window === "undefined" || !open) return null;

  async function copyRef() {
    if (!ticket.refCode) return;
    try {
      await navigator.clipboard.writeText(ticket.refCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ariaId}-title`}
      onClick={onClose}
    >
      {/* Brand overlay with subtle radial glow */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(154,70,255,.25),transparent_60%)]" />

      {/* Panel */}
      <div className="relative mx-auto grid h-full max-h-[88dvh] w-full max-w-6xl place-items-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full overflow-hidden rounded-[28px]
            border border-white/10 bg-neutral-950/80 text-white 
            ring-1 ring-white/5
            transition-transform animate-[tikdModalIn_.22s_ease]
          "
        >
          {/* soft gradient edge */}
          <div className="pointer-events-none absolute -inset-px rounded-[28px] bg-[linear-gradient(180deg,rgba(154,70,255,.12),transparent_25%)]" />

          {/* Close */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr] md:gap-10">
            {/* Left: Ticket preview */}
            <section className="relative p-4 md:p-8 bg-neutral-950 flex flex-col">
              <h2
                id={`${ariaId}-title`}
                className="mb-4 text-2xl font-semibold leading-[90%] tracking-[-0.42px]"
              >
                Your Ticket
              </h2>
              <div className="m-auto flex justify-center">
                <TicketCard
                  {...ticket}
                  onDetails={undefined}
                  className="bg-transparent p-0 ring-0"
                />
              </div>

              {ticket.refCode ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="text-sm text-neutral-300">
                    <span className="text-neutral-400">Reference:</span>{" "}
                    <span className="font-mono tracking-wide">
                      {ticket.refCode}
                    </span>
                  </div>
                  <button
                    onClick={copyRef}
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/15"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </section>

            {/* Right: QR + actions */}
            <section className="flex min-h-[360px] flex-col p-4 md:p-8">
              <h3 className="mb-4 mx-auto text-lg font-semibold text-neutral-100">
                Scan QR Code
              </h3>

              {/* QR stage */}
              <div className="relative flex flex-1 items-center justify-center">
                <div className="relative rounded-3xl bg-white p-4 shadow-[0_18px_60px_-12px_rgba(154,70,255,.35)] ring-1 ring-black/5">
                  {/* glow ring */}
                  <div className="pointer-events-none absolute -inset-[2px] rounded-[22px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(154,70,255,.25),transparent_70%)]" />
                  {ticket.qrSvg ? (
                    <div
                      className="relative z-10 h-[260px] w-[260px]"
                      dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
                    />
                  ) : ticket.qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ticket.qrUrl}
                      alt="Ticket QR"
                      className="relative z-10 h-[260px] w-[260px]"
                    />
                  ) : (
                    <div className="grid h-[260px] w-[260px] place-items-center text-neutral-900">
                      <QrCode className="h-24 w-24" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Button variant="secondary" className="justify-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Add to Wallet
                </Button>
                <Button variant="ghost" className="justify-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer Ticket
                </Button>
                <Button variant="ghost" className="justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Request Refund
                </Button>
              </div>

              {/* Optional tiny helper text */}
              <p className="mt-3 text-[12px] leading-tight text-neutral-400">
                Keep this QR visible when entering the venue. You can also add
                the ticket to your mobile wallet for quick access.
              </p>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tikdModalIn { from { transform: translateY(6px) scale(.98); opacity: 0 }
                                  to   { transform: translateY(0) scale(1);   opacity: 1 } }
      `}</style>
    </div>,
    document.body
  );
}
