/* ------------------------------------------------------------------ */
/*  src/components/connections/ConnectionProfileCard.tsx              */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import clsx from "clsx";
import { Building2, Landmark, Users2, type LucideIcon } from "lucide-react";
import { Tilt3d } from "@/components/ui/Tilt3d";

export type ConnectionProfileKind = "establishment" | "organization" | "team";

export type ConnectionProfileCardWidth = "default" | "compact";

export type ConnectionProfileCardProps = {
  href: string;
  kind: ConnectionProfileKind;

  title: string;
  description: string;

  /** Banner image at top */
  bannerUrl?: string;

  /** Small icon/avatar block on left */
  iconUrl?: string;

  /** Footer */
  totalMembers?: number;
  joinDateLabel?: string; // e.g. "Joined Jan 2026"

  /** Optional: enable 3D hover (used by Organizations page) */
  tilt?: boolean;
  tiltMaxDeg?: number; // default 4
  tiltPerspective?: number; // default 900
  tiltLiftPx?: number; // default 2

  /** ✅ Optional width override (Organizations page uses compact to fit 6/row) */
  cardWidth?: ConnectionProfileCardWidth; // default "default"
};

const KIND_ICON: Record<ConnectionProfileKind, LucideIcon> = {
  establishment: Landmark,
  organization: Building2,
  team: Users2,
};

function formatMembers(n?: number) {
  if (!n || n <= 0) return "0";
  try {
    return new Intl.NumberFormat(undefined).format(n);
  } catch {
    return String(n);
  }
}

export default function ConnectionProfileCard({
  href,
  kind,
  title,
  description,
  bannerUrl,
  iconUrl,
  totalMembers,
  joinDateLabel,
  tilt = false,
  tiltMaxDeg = 4,
  tiltPerspective = 900,
  tiltLiftPx = 2,
  cardWidth = "default",
}: ConnectionProfileCardProps) {
  const TypeIcon = KIND_ICON[kind];

  const widthClass = cardWidth === "compact" ? "w-full" : "w-full sm:w-[264px]";

  const cardLinkClass = clsx(
    "group relative block",
    widthClass,
    "rounded-[12px]",
    "border border-white/10 bg-neutral-948",
    "transition-all duration-200",
    "hover:border-primary-500",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
  );

  const tiltShellClass = clsx(
    "group relative",
    widthClass,
    "rounded-[12px]",
    "transition-shadow duration-200",
    "hover:shadow-[0_22px_70px_rgba(0,0,0,0.55)]",
  );

  const Banner = (
    <div className="relative h-[112px] w-full overflow-hidden rounded-t-[12px]">
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          className={clsx(
            "h-full w-full",
            "bg-[radial-gradient(520px_180px_at_25%_0%,rgba(154,70,255,0.55),transparent_62%),radial-gradient(520px_180px_at_90%_120%,rgba(170,115,255,0.40),transparent_60%),linear-gradient(180deg,rgba(28,0,58,0.85),rgba(18,18,32,1))]",
          )}
        />
      )}

      {/* Readability overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/10 to-neutral-948/95" />
    </div>
  );

  const IconTile = (
    <div className="absolute left-4 top-[74px]">
      <div
        className={clsx(
          "relative h-[52px] w-[52px] overflow-hidden",
          "rounded-lg",
          "border-[3px] border-neutral-948",
          "bg-neutral-900",
        )}
        aria-hidden="true"
      >
        {iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#9a46ff,#6600b7,#111827)]">
            {/* ✅ Keep the fallback initial crisp too */}
            <span className="text-[13px] font-semibold text-neutral-0 tikd-tilt-crisp">
              {title?.[0]?.toUpperCase() ?? "C"}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const CardInner = (
    <>
      {Banner}
      {IconTile}

      {/* This block counter-rotates to keep fonts crisp while the card tilts */}
      <div className="relative px-4 pb-3 pt-7 tikd-tilt-crisp">
        <div className="flex items-start gap-2">
          <span
            className={clsx(
              "mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full",
              "bg-primary-900/50 ring-1 ring-primary-500",
            )}
            title={kind}
            aria-hidden="true"
          >
            <TypeIcon className="h-3.5 w-3.5 text-primary-300" />
          </span>

          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold tracking-[-0.28px] text-neutral-50">
              {title}
            </div>

            <div className="mt-1 line-clamp-2 text-[12px] leading-[1.35] text-neutral-300/90">
              {description}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between gap-2.5 text-[12px] text-neutral-300/90">
          <div className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-primary-500/90"
              aria-hidden="true"
            />
            <div className="">
              <span className="font-semibold text-neutral-100 mr-1">
                {formatMembers(totalMembers)}
              </span>
              <span className="text-neutral-400">Total members</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 text-neutral-400">
            <span
              className="h-2 w-2 rounded-full bg-neutral-700"
              aria-hidden="true"
            />
            <span className="truncate">{joinDateLabel ?? "—"}</span>
          </div>
        </div>
      </div>
    </>
  );

  // Non-tilt: unchanged
  if (!tilt) {
    return (
      <Link href={href} className={cardLinkClass}>
        {CardInner}
      </Link>
    );
  }

  // Tilt: whole card tilts, text stays crisp via tikd-tilt-crisp + improved Tilt3d handling
  return (
    <Tilt3d
      className={tiltShellClass}
      maxDeg={tiltMaxDeg}
      perspective={tiltPerspective}
      liftPx={tiltLiftPx}
    >
      <Link href={href} className={cardLinkClass}>
        {CardInner}
      </Link>
    </Tilt3d>
  );
}
