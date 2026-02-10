"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import clsx from "classnames";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Tilt3d } from "@/components/ui/Tilt3d";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */
export interface EventCardProps {
  id: string;
  title: string;
  dateLabel: string;
  venue: string;
  img: string;
  category: string;
  /** extra classes from parent (e.g. w-full h-full) */
  className?: string;
  /** makes the whole card a link when true */
  clickable?: boolean;
  /** optional custom href (defaults to `/events/:id`) when clickable */
  href?: string;

  /**
   * Optional: hover-only pin icon in top-right.
   * Clicking it MUST NOT navigate.
   */
  pin?: {
    pinned: boolean;
    onToggle: () => void;
    ariaLabel?: string;
  };

  /**
   * Optional overlay slots that will be placed INSIDE the Tilt surface.
   * Useful for dashboard overlays like info tooltip + pin button.
   */
  topLeftOverlay?: ReactNode;
  topLeftOverlayClassName?: string;

  topRightOverlay?: ReactNode;
  topRightOverlayClassName?: string;
}

/* -------------------------------------------------------------------------- */
/*  Default poster (data URI) — FULL BLEED (no inner “card” block)             */
/* -------------------------------------------------------------------------- */
const DEFAULT_POSTER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1280" viewBox="0 0 900 1280">
  <defs>
    <!-- Deep neutral base -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070710"/>
      <stop offset="0.55" stop-color="#101026"/>
      <stop offset="1" stop-color="#070710"/>
    </linearGradient>

    <!-- Soft brand glows -->
    <radialGradient id="glowPurple" cx="18%" cy="10%" r="78%">
      <stop offset="0" stop-color="#9a46ff" stop-opacity="0.34"/>
      <stop offset="0.50" stop-color="#9a46ff" stop-opacity="0.12"/>
      <stop offset="1" stop-color="#9a46ff" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glowBlue" cx="92%" cy="92%" r="85%">
      <stop offset="0" stop-color="#428bff" stop-opacity="0.26"/>
      <stop offset="0.55" stop-color="#428bff" stop-opacity="0.10"/>
      <stop offset="1" stop-color="#428bff" stop-opacity="0"/>
    </radialGradient>

    <!-- Subtle diagonal sheen -->
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.00"/>
      <stop offset="0.45" stop-color="#ffffff" stop-opacity="0.06"/>
      <stop offset="0.60" stop-color="#ffffff" stop-opacity="0.025"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.00"/>
    </linearGradient>

    <!-- Gentle grain -->
    <filter id="grain" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="matrix" values="
        1 0 0 0 0
        0 1 0 0 0
        0 0 1 0 0
        0 0 0 0.12 0"/>
    </filter>

    <!-- Soft vignette -->
    <radialGradient id="vignette" cx="50%" cy="45%" r="90%">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="0.68" stop-color="#000000" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.44"/>
    </radialGradient>

    <!-- Icon stroke -->
    <linearGradient id="iconStroke" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c7a0ff" stop-opacity="0.65"/>
      <stop offset="0.55" stop-color="#9a46ff" stop-opacity="0.50"/>
      <stop offset="1" stop-color="#428bff" stop-opacity="0.45"/>
    </linearGradient>
  </defs>

  <!-- Full-bleed background -->
  <rect width="900" height="1280" fill="url(#bg)"/>
  <rect width="900" height="1280" fill="url(#glowPurple)"/>
  <rect width="900" height="1280" fill="url(#glowBlue)"/>
  <rect width="900" height="1280" fill="url(#sheen)" opacity="0.9"/>
  <rect width="900" height="1280" filter="url(#grain)" opacity="0.55"/>
  <rect width="900" height="1280" fill="url(#vignette)"/>

  <!-- Tiny, subtle center glyph (NO inner big block) -->
  <g transform="translate(450 640)" opacity="0.58">
    <rect x="-120" y="-86" width="240" height="172" rx="28"
          fill="#000000" fill-opacity="0.14"
          stroke="url(#iconStroke)" stroke-opacity="0.55" stroke-width="2"/>
    <path d="M-78 30 L-30 -18 L8 12 L42 -10 L78 30"
          fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="7"
          stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="50" cy="-26" r="12" fill="#ffffff" fill-opacity="0.12"/>
  </g>

  <!-- Tiny brand hint (bottom-right, very subtle) -->
  <g opacity="0.18">
    <text x="820" y="1216" text-anchor="end"
          fill="#ffffff"
          font-family="Arial, sans-serif"
          font-size="20"
          font-weight="700"
          letter-spacing="4">
      TIKD
    </text>
  </g>
</svg>
`)}`;

export const EVENT_CARD_DEFAULT_POSTER = DEFAULT_POSTER;

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 75 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <line
        x1="37"
        y1="64"
        x2="37"
        y2="100"
        stroke="currentColor"
        strokeWidth="12"
      />
      <path
        d="M16.5 36V4.5H58.5V36V53.75V54.9752L59.1862 55.9903L66.9674 67.5H8.03256L15.8138 55.9903L16.5 54.9752V53.75V36Z"
        stroke="currentColor"
        strokeWidth="10"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function EventCard({
  id,
  title,
  dateLabel,
  venue: _venue,
  img,
  category: _category,
  className,
  clickable = true,
  href,
  pin,
  topLeftOverlay,
  topLeftOverlayClassName,
  topRightOverlay,
  topRightOverlayClassName,
}: EventCardProps) {
  const dateColour = "text-primary-951";
  const borderHover = "hover:border-primary-951";

  const initialSrc = useMemo(() => {
    const s = (img ?? "").trim();
    return s ? s : DEFAULT_POSTER;
  }, [img]);

  const [imgSrc, setImgSrc] = useState<string>(initialSrc);

  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  const isDefaultPoster = imgSrc === DEFAULT_POSTER;

  const cardClasses = clsx(
    "group/card relative flex w-full flex-col gap-2 transition-opacity",
    "group-hover/row:opacity-60 hover:opacity-100",
    className,
  );

  const targetHref = href ?? `/events/${id}`;

  const pinButton = pin ? (
    pin.pinned ? (
      <div
        className={clsx(
          "absolute right-3 top-3 z-20",
          "pointer-events-none select-none",
          "inline-flex items-center gap-1.5",
          "rounded-full border border-primary-500/35",
          "bg-primary-700/15 px-2.5 py-1",
          "text-[11px] font-semibold text-primary-200",
          "shadow-[0_10px_28px_rgba(154,70,255,0.18)]",
        )}
        aria-label={pin.ariaLabel ?? "Pinned event"}
      >
        <PinIcon className="h-4 w-4 drop-shadow-[0_6px_16px_rgba(154,70,255,0.35)]" />
        <span>Pinned</span>
      </div>
    ) : (
      <button
        type="button"
        aria-label={pin.ariaLabel ?? "Pin event"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pin.onToggle();
        }}
        className={clsx(
          "absolute right-3 top-3 z-20",
          "opacity-0 transition-opacity duration-200",
          "group-hover/card:opacity-100 focus-visible:opacity-100",
          "text-white/85 hover:text-white",
          "focus-visible:outline-none",
        )}
      >
        <PinIcon className="h-5 w-5" />
      </button>
    )
  ) : null;

  const overlays = (
    <>
      {topLeftOverlay ? (
        <div
          className={clsx(
            "absolute left-3 top-3 z-30",
            topLeftOverlayClassName,
          )}
        >
          {topLeftOverlay}
        </div>
      ) : null}

      {topRightOverlay ? (
        <div
          className={clsx(
            "absolute right-3 top-3 z-30",
            topRightOverlayClassName,
          )}
        >
          {topRightOverlay}
        </div>
      ) : null}
    </>
  );

  const inner = (
    <>
      {/* ✅ overlays INSIDE the tilt surface */}
      {overlays}

      {/* legacy pin system (optional) */}
      {pinButton}

      <div
        className={clsx(
          "p-[2px] w-full h-full rounded-[10px] border border-transparent transition duration-300 group-hover:border-primary-500",
          borderHover,
        )}
      >
        <div className="relative w-full overflow-hidden rounded-lg aspect-[171/214] sm:aspect-[79/95] bg-neutral-900">
          <Image
            src={imgSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 260px"
            className={clsx(
              "object-cover object-center transition duration-300",
              "group-hover:brightness-75",
              isDefaultPoster &&
                "brightness-[1.06] contrast-[1.04] saturate-[1.05]",
            )}
            onError={() => {
              if (imgSrc !== DEFAULT_POSTER) setImgSrc(DEFAULT_POSTER);
            }}
          />

          {/* Glow only affects poster area */}
          <div
            data-tilt-glow
            className={clsx(
              "pointer-events-none absolute inset-0 rounded-lg",
              "opacity-0 transition-opacity duration-200",
              "group-hover/card:opacity-100",
            )}
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.05), rgba(0,0,0,0.14))",
            }}
          />
        </div>
      </div>

      {/* meta underneath */}
      <div className="space-y-1 px-1 text-left">
        <h3 className="text-sm font-bold uppercase text-neutral-0">{title}</h3>
        <div className={clsx("flex items-center gap-1 text-xs", dateColour)}>
          <Calendar className="h-4 w-4" />
          {dateLabel}
        </div>
      </div>
    </>
  );

  if (clickable) {
    return (
      <Tilt3d perspective={1500} className="w-full">
        <Link href={targetHref} className={cardClasses}>
          {inner}
        </Link>
      </Tilt3d>
    );
  }

  return (
    <Tilt3d perspective={1500} className="w-full">
      <div className={cardClasses}>{inner}</div>
    </Tilt3d>
  );
}
