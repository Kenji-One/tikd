/* ------------------------------------------------------------------ */
/*  src/components/connections/ConnectionProfileCard.tsx              */
/* ------------------------------------------------------------------ */
"use client";

import Link from "next/link";
import clsx from "clsx";
import { Building2, Landmark, Users2, type LucideIcon } from "lucide-react";

export type ConnectionProfileKind = "establishment" | "organization" | "team";

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
};

const KIND_ICON: Record<ConnectionProfileKind, LucideIcon> = {
  establishment: Landmark,
  organization: Building2,
  team: Users2,
};

function formatMembers(n?: number) {
  if (!n || n <= 0) return "—";
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
}: ConnectionProfileCardProps) {
  const TypeIcon = KIND_ICON[kind];

  return (
    <Link
      href={href}
      className={clsx(
        "group relative",
        "w-full sm:w-[264px]",
        "overflow-hidden",
        "rounded-[12px]",
        "border border-white/10 bg-neutral-948",
        "transition-all duration-200",
        "hover:border-primary-500",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60 overflow-hidden"
      )}
    >
      {/* Banner */}
      <div className="relative h-[112px] w-full overflow-hidden">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          // Tikd branded purple gradient fallback
          <div
            className={clsx(
              "h-full w-full",
              "bg-[radial-gradient(520px_180px_at_25%_0%,rgba(154,70,255,0.55),transparent_62%),radial-gradient(520px_180px_at_90%_120%,rgba(170,115,255,0.40),transparent_60%),linear-gradient(180deg,rgba(28,0,58,0.85),rgba(18,18,32,1))]"
            )}
          />
        )}

        {/* Readability overlay (subtle, reference-like) */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/18 via-black/10 to-neutral-948/95" />
      </div>

      {/* Icon tile (with 3px ring matching card bg like reference) */}
      <div className="absolute left-4 top-[74px]">
        <div
          className={clsx(
            "relative h-[52px] w-[52px] overflow-hidden",
            "rounded-lg",
            "border-[3px] border-neutral-948",
            "bg-neutral-900"
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
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[conic-gradient(from_220deg_at_50%_50%,#9a46ff,#6600b7,#111827)]">
              <span className="text-[13px] font-semibold text-neutral-0">
                {title?.[0]?.toUpperCase() ?? "C"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative px-4 pb-3 pt-7">
        {/* Title row */}
        <div className="flex items-start gap-2">
          <span
            className={clsx(
              "mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full",
              "bg-primary-900/50 ring-1 ring-primary-500"
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
        <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-neutral-300/90">
          <div className="inline-flex items-center gap-2">
            <span
              className={clsx("h-2 w-2 rounded-full", "bg-primary-500/90")}
              aria-hidden="true"
            />
            <span className="font-semibold text-neutral-100">
              {formatMembers(totalMembers)}
            </span>
            <span className="text-neutral-400">Total members</span>
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

      {/* Hover glow (very subtle) */}
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200",
          "group-hover:opacity-100",
          "bg-[radial-gradient(700px_220px_at_25%_0%,rgba(154,70,255,0.07),transparent_60%),radial-gradient(700px_220px_at_90%_120%,rgba(66,139,255,0.05),transparent_60%)]"
        )}
      />
    </Link>
  );
}
