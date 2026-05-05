// src/components/ui/TicketDialog.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import TicketPassCard, { type TicketPassDesign } from "./TicketPassCard";

type TicketSeat = {
  section?: string;
  row?: string;
  number?: string;
} | null;

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
    seat?: TicketSeat;

    design?: Partial<TicketPassDesign> | null;
    eventTitle?: string;
    eventDateISO?: string;
    eventLocation?: string;
    eventImageUrl?: string;
    ticketTypeLabel?: string;
  };
}

function seatLabel(seat?: TicketSeat) {
  if (!seat) return null;

  const parts = [
    seat.section ? `Section ${seat.section}` : null,
    seat.row ? `Row ${seat.row}` : null,
    seat.number ? `Seat ${seat.number}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" • ") : null;
}

export default function TicketDialog({
  open,
  onClose,
  ticket,
}: TicketDialogProps) {
  const [copied, setCopied] = useState(false);
  const [qrSize, setQrSize] = useState(300);

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

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const syncQrSize = () => {
      const width = window.innerWidth;

      if (width < 380) {
        setQrSize(184);
        return;
      }

      if (width < 640) {
        setQrSize(220);
        return;
      }

      if (width < 1024) {
        setQrSize(260);
        return;
      }

      setQrSize(300);
    };

    syncQrSize();
    window.addEventListener("resize", syncQrSize);

    return () => {
      window.removeEventListener("resize", syncQrSize);
    };
  }, [open]);

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
    } catch {
      // no-op
    }
  }

  const qrValue =
    ticket.qrValue ??
    ticket.refCode ??
    `${ticket.ticketTypeLabel ?? ticket.title}:${ticket.eventTitle ?? ""}:${ticket.venue}`;

  const seatText = seatLabel(ticket.seat);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${ariaId}-title`}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_0%,rgba(154,70,255,.22),transparent_60%)]" />

      <div className="relative mx-auto flex h-full w-full items-end justify-center p-0 sm:p-4 md:items-center">
        <div
          onClick={(e) => e.stopPropagation()}
          className="
            pointer-events-auto relative flex w-full flex-col overflow-hidden
            rounded-t-[26px] border border-white/10 bg-neutral-950/90 text-white
            ring-1 ring-white/5 shadow-[0_28px_90px_rgba(0,0,0,.70)]
            animate-[tikdModalIn_.18s_ease]
            max-h-[100dvh] sm:max-h-[calc(100dvh-32px)] sm:max-w-6xl sm:rounded-[26px]
          "
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid min-h-0 grid-cols-1 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            {/* Left */}
            <section className="relative border-b border-white/10 bg-neutral-950 p-4 sm:p-5 md:border-b-0 md:border-r md:border-white/10 md:p-7">
              <h2
                id={`${ariaId}-title`}
                className="pr-12 text-[26px] font-semibold leading-[90%] tracking-[-0.42px]"
              >
                Your Ticket
              </h2>

              <div className="mt-4">
                <TicketPassCard
                  chrome="plain"
                  className="mx-auto w-full bg-transparent p-0"
                  design={ticket.design ?? undefined}
                  eventTitle={ticket.eventTitle ?? ticket.title}
                  eventDateISO={ticket.eventDateISO}
                  eventLocation={ticket.eventLocation ?? ticket.venue}
                  eventImageUrl={ticket.eventImageUrl ?? ticket.img}
                  ticketTypeLabel={ticket.ticketTypeLabel ?? ticket.title}
                />
              </div>

              <div className="mt-4 space-y-3">
                {ticket.refCode ? (
                  <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-2">
                    <div className="min-w-0 text-sm text-neutral-300">
                      <span className="text-neutral-400">Reference:</span>{" "}
                      <span className="break-all font-mono tracking-wide">
                        {ticket.refCode}
                      </span>
                    </div>

                    <button
                      onClick={copyRef}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-2.5 py-2 text-xs font-medium text-white/90 transition hover:bg-white/15 cursor-pointer sm:w-auto"
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

                {ticket.badge || seatText ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {ticket.badge ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
                          Status
                        </p>
                        <p className="mt-1 text-sm font-semibold text-neutral-100">
                          {ticket.badge}
                        </p>
                      </div>
                    ) : null}

                    {seatText ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-neutral-400">
                          Seat
                        </p>
                        <p className="mt-1 text-sm font-semibold text-neutral-100">
                          {seatText}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>

            {/* Right */}
            <section className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5 md:p-7">
              <h3 className="text-center text-lg font-semibold text-neutral-100">
                Scan QR Code
              </h3>

              <div className="mt-5 flex items-center justify-center">
                <div className="relative w-fit max-w-full rounded-[24px] bg-white p-4 shadow-[0_22px_80px_-20px_rgba(154,70,255,.35)] ring-1 ring-black/5 sm:rounded-[28px] sm:p-5 md:p-6">
                  <div className="pointer-events-none absolute -inset-[2px] rounded-[26px] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(154,70,255,.22),transparent_70%)] sm:rounded-[30px]" />

                  {ticket.qrSvg ? (
                    <div
                      className="ticket-dialog-qr-svg relative z-10"
                      style={{ width: qrSize, height: qrSize }}
                      dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
                    />
                  ) : ticket.qrUrl ? (
                    <img
                      src={ticket.qrUrl}
                      alt="Ticket QR"
                      className="relative z-10 block h-auto max-w-full"
                      style={{ width: qrSize, height: qrSize }}
                    />
                  ) : (
                    <div className="relative z-10">
                      <QRCodeSVG
                        value={qrValue}
                        size={qrSize}
                        bgColor="#ffffff"
                        fgColor="#0b0b12"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
                <p className="text-sm font-medium text-neutral-100">
                  Keep this QR visible when entering the venue.
                </p>
                <p className="mt-1 text-[12px] leading-tight text-neutral-400">
                  Present this screen to staff for scanning.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes tikdModalIn {
          from { transform: translateY(6px) scale(.99); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
        }

        .ticket-dialog-qr-svg,
        .ticket-dialog-qr-svg svg,
        .ticket-dialog-qr-svg img {
          display: block;
          width: 100%;
          height: 100%;
          max-width: 100%;
        }
      `}</style>
    </div>,
    document.body,
  );
}
