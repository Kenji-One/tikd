/* ------------------------------------------------------------------ */
/*  src/components/ui/TicketPassCard.tsx                               */
/* ------------------------------------------------------------------ */
"use client";

/* eslint-disable @next/next/no-img-element */

import clsx from "clsx";

export type TicketPassLayout = "horizontal" | "vertical" | "down" | "up";

export type TicketPassDesign = {
  layout: TicketPassLayout;
  brandColor: string;
  logoUrl?: string;
  backgroundUrl?: string;
  footerText?: string;
  watermarkEnabled: boolean;
  eventInfoEnabled: boolean;
  logoEnabled: boolean;
  qrSize: number;
  qrBorderRadius: number;
};

export interface TicketPassCardProps {
  eventTitle: string;
  eventDateISO?: string;
  eventLocation: string;
  eventImageUrl?: string;
  ticketTypeLabel?: string;

  design?: Partial<TicketPassDesign>;

  onClick?: () => void;
  className?: string;

  /** used by TicketDialog */
  chrome?: "card" | "plain";
}

/* ------------------------------ helpers ------------------------------ */

function safeDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatEventDate(value?: string) {
  const d = safeDate(value);
  if (!d) return "Date TBA";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatEventTime(value?: string) {
  const d = safeDate(value);
  if (!d) return "Time TBA";
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const DEFAULT_DESIGN: TicketPassDesign = {
  layout: "vertical",
  brandColor: "#9a46ff",
  logoUrl: "",
  backgroundUrl: "",
  footerText: "",
  watermarkEnabled: true,
  eventInfoEnabled: true,
  logoEnabled: false,
  qrSize: 72,
  qrBorderRadius: 0,
};

export default function TicketPassCard({
  eventTitle,
  eventDateISO,
  eventLocation,
  eventImageUrl,
  ticketTypeLabel = "General admission",
  design,
  onClick,
  className,
  chrome = "card",
}: TicketPassCardProps) {
  const d: TicketPassDesign = { ...DEFAULT_DESIGN, ...(design ?? {}) };

  const layout = d.layout ?? "vertical";
  const ticketColor = d.brandColor || "#9a46ff";
  const barcodeHeight =
    typeof d.qrSize === "number" && d.qrSize > 0 ? d.qrSize : 72;

  // ✅ EXACTLY like TicketTypeDesignStep
  const artworkHeightClass =
    layout === "vertical"
      ? "h-[220px]"
      : layout === "up"
        ? "h-[140px]"
        : layout === "down"
          ? "h-[190px]"
          : "h-[164px]";

  const contentPaddingTopClass =
    layout === "up" ? "pt-3" : layout === "down" ? "pt-6" : "pt-5";

  // ✅ fixed max width so it doesn’t become a giant column ticket
  const cardWidthClass =
    layout === "vertical" ? "w-full max-w-[320px]" : "w-full max-w-[360px]";

  const hasBackgroundImage = Boolean(d.backgroundUrl);
  const hasCustomLogo = Boolean(d.logoUrl);
  const hasEventImage = Boolean(eventImageUrl);

  const topLabel = (eventTitle || "Event").toUpperCase();
  const mainTitle = ticketTypeLabel || "General admission";
  const placeText = eventLocation || "Location TBA";

  const ticket = (
    <div className={clsx("mx-auto rounded-3xl bg-transparent", cardWidthClass)}>
      <div
        className="relative overflow-hidden rounded-3xl p-4"
        style={
          hasBackgroundImage
            ? {
                backgroundImage: `url(${d.backgroundUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { backgroundColor: ticketColor }
        }
      >
        {d.watermarkEnabled ? (
          <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
            <div className="h-full w-full bg-[radial-gradient(circle_at_0_0,rgba(255,255,255,0.4),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.4),transparent_55%)]" />
          </div>
        ) : null}

        <div className="relative z-10">
          <div
            className={clsx(
              "relative overflow-hidden rounded-2xl",
              artworkHeightClass,
            )}
          >
            {!hasBackgroundImage && hasEventImage ? (
              <img
                src={eventImageUrl}
                alt={eventTitle || "Event artwork"}
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  objectPosition:
                    layout === "down"
                      ? "center bottom"
                      : layout === "up"
                        ? "center top"
                        : "center",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}

            {!hasBackgroundImage && !hasEventImage ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg,#ffb347,#ff5f6d,#845ef7,#3bc9db)",
                  backgroundSize: "cover",
                  backgroundPosition:
                    layout === "down"
                      ? "center bottom"
                      : layout === "up"
                        ? "center top"
                        : "center",
                }}
              />
            ) : null}

            {d.logoEnabled ? (
              <div className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center justify-center">
                {hasCustomLogo ? (
                  <img
                    src={d.logoUrl}
                    alt="Logo"
                    className="h-10 w-10 rounded-full border border-white/40 bg-black/30 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <img
                    src="/Logo.svg"
                    alt="Logo"
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>

          <div className={contentPaddingTopClass}>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
              {topLabel}
            </p>

            <p className="mt-1 text-[18px] font-semibold leading-tight text-white">
              {mainTitle}
            </p>

            {d.eventInfoEnabled ? (
              <>
                <div className="mt-5 grid grid-cols-2 gap-y-3 text-sm leading-snug text-white/80">
                  <div>
                    <p className="text-white/70">Date</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatEventDate(eventDateISO)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70">Time</p>
                    <p className="mt-1 font-semibold text-white">
                      {formatEventTime(eventDateISO)}
                    </p>
                  </div>

                  <div>
                    <p className="text-white/70">Check in Type</p>
                    <p className="mt-1 font-semibold text-white">{mainTitle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/70">Order ID</p>
                    <p className="mt-1 font-semibold text-white">GBD99763JS</p>
                  </div>
                </div>

                <div className="mt-5 text-sm leading-snug text-white/80">
                  <p className="text-white/70">Place</p>
                  <p className="mt-1 font-semibold text-white">{placeText}</p>
                </div>
              </>
            ) : null}

            <div className="relative mt-6">
              <div className="mx-auto h-px w-[96%] border-t border-dashed border-white/80" />
              <div className="absolute -left-12 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-neutral-950" />
              <div className="absolute -right-12 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-neutral-950" />
            </div>

            <div className="mt-4 px-2 pb-1">
              <div
                className="w-full"
                style={{
                  height: `${barcodeHeight}px`,
                  backgroundImage:
                    "repeating-linear-gradient(90deg, rgba(0,0,0,0.98) 0, rgba(0,0,0,0.98) 2px, transparent 2px, transparent 4px)",
                  backgroundRepeat: "repeat",
                  borderRadius:
                    typeof d.qrBorderRadius === "number"
                      ? `${d.qrBorderRadius}px`
                      : undefined,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {d.footerText ? (
        <p className="mt-3 text-center text-[10px] text-neutral-200">
          {d.footerText}
        </p>
      ) : null}
    </div>
  );

  if (chrome === "plain") {
    return (
      <div
        className={clsx(
          "rounded-xl bg-neutral-950 text-[13px] text-neutral-50",
          className,
        )}
      >
        {ticket}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-[360px] rounded-xl text-left text-[13px] text-neutral-50",
        "transition-colors hover:border-white/14 hover:bg-neutral-950/62",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/45",
        "cursor-pointer",
        className,
      )}
      aria-label={`Open ticket for ${eventTitle}`}
    >
      {ticket}
    </button>
  );
}
