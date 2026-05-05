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

  /** used by TicketDialog / preview contexts */
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

function getContentJustifyClass(layout: TicketPassLayout) {
  switch (layout) {
    case "up":
      return "justify-start";
    case "vertical":
      return "justify-center";
    case "down":
      return "justify-end";
    case "horizontal":
    default:
      return "justify-between";
  }
}

const DEFAULT_DESIGN: TicketPassDesign = {
  layout: "horizontal",
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

  const ticketColor = d.brandColor || "#9a46ff";
  const barcodeHeight =
    typeof d.qrSize === "number" && d.qrSize > 0 ? d.qrSize : 72;

  const hasBackgroundImage = Boolean(d.backgroundUrl);
  const hasCustomLogo = Boolean(d.logoUrl);
  const hasEventImage = Boolean(eventImageUrl);

  const topLabel = (eventTitle || "Event").toUpperCase();
  const mainTitle = ticketTypeLabel || "General admission";
  const placeText = eventLocation || "Location TBA";
  const watermarkText = "TIXSY";

  const ticket = (
    <div className="mx-auto w-full max-w-[320px] min-w-0">
      <div
        className="relative overflow-hidden rounded-[28px] p-3.5 sm:p-4"
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
        {/* real watermark */}
        {d.watermarkEnabled ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,255,255,0.16),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-24deg] whitespace-nowrap text-[54px] font-black uppercase tracking-[0.28em] text-white/[0.10] sm:text-[62px]">
                {watermarkText}
              </div>
            </div>
          </>
        ) : null}

        <div className="relative z-10">
          {/* artwork */}
          <div className="relative h-[164px] overflow-hidden rounded-2xl sm:h-[176px]">
            {!hasBackgroundImage && hasEventImage ? (
              <img
                src={eventImageUrl}
                alt={eventTitle || "Event artwork"}
                className="absolute inset-0 h-full w-full object-cover"
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
                  backgroundPosition: "center",
                }}
              />
            ) : null}

            {d.logoEnabled ? (
              <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center justify-center">
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

          {/* content focus area */}
          <div
            className={clsx(
              "mt-4 flex min-h-[148px] flex-col gap-4 sm:min-h-[158px]",
              getContentJustifyClass(d.layout),
            )}
          >
            <div className="space-y-1.5">
              <p className="break-words text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72 sm:text-xs">
                {topLabel}
              </p>

              <p className="break-words text-[17px] font-semibold leading-tight text-white sm:text-[18px]">
                {mainTitle}
              </p>
            </div>

            {d.eventInfoEnabled ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs leading-snug text-white/85 sm:text-sm">
                <div className="min-w-0">
                  <p className="text-white/70">Date</p>
                  <p className="mt-1 break-words font-semibold text-white">
                    {formatEventDate(eventDateISO)}
                  </p>
                </div>

                <div className="min-w-0 text-right">
                  <p className="text-white/70">Time</p>
                  <p className="mt-1 break-words font-semibold text-white">
                    {formatEventTime(eventDateISO)}
                  </p>
                </div>

                <div className="min-w-0 col-span-2">
                  <p className="text-white/70">Place</p>
                  <p className="mt-1 break-words font-semibold text-white">
                    {placeText}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* perforation */}
          <div className="relative mt-5 sm:mt-6">
            <div className="mx-auto h-px w-[96%] border-t border-dashed border-white/80" />
            <div className="absolute -left-10 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-neutral-950 sm:-left-12 sm:h-12 sm:w-12" />
            <div className="absolute -right-10 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-neutral-950 sm:-right-12 sm:h-12 sm:w-12" />
          </div>

          {/* barcode */}
          <div className="mt-4 px-1 pb-1 sm:px-2">
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

          {/* bottom line INSIDE ticket */}
          {d.footerText ? (
            <p className="mt-3 px-2 text-center text-[10px] font-medium tracking-[0.08em] text-white/78">
              {d.footerText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (chrome === "plain") {
    return (
      <div className={clsx("w-full text-[13px] text-neutral-50", className)}>
        {ticket}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "mx-auto w-full min-w-0 rounded-xl text-left text-[13px] text-neutral-50",
        "transition-colors hover:bg-neutral-950/62",
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
