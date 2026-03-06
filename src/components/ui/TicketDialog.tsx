// src/components/ui/TicketDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Wallet,
  ArrowRightLeft,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import TicketPassCard, { type TicketPassDesign } from "./TicketPassCard";
import { Button } from "./Button";

export interface TicketDialogProps {
  open: boolean;
  onClose: () => void;
  ticket: {
    title: string;
    dateLabel: string;
    venue: string;
    img: string;
    qty?: number;
    badge?: string;

    qrUrl?: string;
    qrSvg?: string;
    qrValue?: string;

    refCode?: string;

    design?: Partial<TicketPassDesign> | null;
    eventTitle?: string;
    eventDateISO?: string;
    eventLocation?: string;
    eventImageUrl?: string;
    ticketTypeLabel?: string;
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
    [],
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

  const qrValue =
    ticket.qrValue ??
    ticket.refCode ??
    `${ticket.ticketTypeLabel ?? ticket.title}:${ticket.eventTitle ?? ""}:${ticket.venue}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ariaId}-title`}
      onClick={onClose}
    >
      {/* overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(154,70,255,.22),transparent_60%)]" />

      <div className="relative mx-auto grid h-full w-full max-w-6xl place-items-center p-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative w-full overflow-hidden rounded-[26px]
            border border-white/10 bg-neutral-950/80 text-white ring-1 ring-white/5
            shadow-[0_28px_90px_rgba(0,0,0,.70)]
            animate-[tikdModalIn_.18s_ease]
          "
        >
          {/* header close */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-[420px_1fr]">
            {/* Left */}
            <section className="relative border-b border-white/10 bg-neutral-950 md:border-b-0 md:border-r md:border-white/10 p-5 md:p-7">
              <h2
                id={`${ariaId}-title`}
                className="text-2xl font-semibold leading-[90%] tracking-[-0.42px]"
              >
                Your Ticket
              </h2>

              <div className="mt-4">
                <TicketPassCard
                  chrome="plain"
                  className="bg-transparent p-0"
                  design={ticket.design ?? undefined}
                  eventTitle={ticket.eventTitle ?? ticket.title}
                  eventDateISO={ticket.eventDateISO}
                  eventLocation={ticket.eventLocation ?? ticket.venue}
                  eventImageUrl={ticket.eventImageUrl ?? ticket.img}
                  ticketTypeLabel={ticket.ticketTypeLabel ?? ticket.title}
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
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white/90 transition hover:bg-white/15 cursor-pointer"
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

            {/* Right */}
            <section className="p-5 md:p-7">
              <h3 className="text-lg font-semibold text-neutral-100 text-center">
                Scan QR Code
              </h3>

              <div className="mt-5 flex items-center justify-center">
                <div className="relative rounded-[28px] bg-white p-6 shadow-[0_22px_80px_-20px_rgba(154,70,255,.35)] ring-1 ring-black/5">
                  <div className="pointer-events-none absolute -inset-[2px] rounded-[30px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(154,70,255,.22),transparent_70%)]" />

                  {ticket.qrSvg ? (
                    <div
                      className="relative z-10"
                      dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
                    />
                  ) : ticket.qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ticket.qrUrl}
                      alt="Ticket QR"
                      className="relative z-10 h-[300px] w-[300px]"
                    />
                  ) : (
                    <div className="relative z-10">
                      <QRCodeSVG
                        value={qrValue}
                        size={300}
                        bgColor="#ffffff"
                        fgColor="#0b0b12"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* ❌ no animation on these */}
                <Button
                  variant="secondary"
                  className="h-10 justify-center gap-2"
                >
                  <Wallet className="h-4 w-4" />
                  Add to Wallet
                </Button>
                <Button variant="ghost" className="h-10 justify-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  Transfer
                </Button>
                <Button variant="ghost" className="h-10 justify-center gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refund
                </Button>
              </div>

              <p className="mt-4 text-center text-[12px] leading-tight text-neutral-400">
                Keep this QR visible when entering the venue.
              </p>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tikdModalIn {
          from { transform: translateY(6px) scale(.99); opacity: 0 }
          to   { transform: translateY(0) scale(1);   opacity: 1 }
        }
      `}</style>
    </div>,
    document.body,
  );
}
