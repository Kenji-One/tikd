"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Category → colour utility                                                 */
/* -------------------------------------------------------------------------- */
const COLOR_BY_CATEGORY: Record<string, string> = {
  Shows: "text-primary-400",
  Party: "text-warning-300",
  Comedy: "text-warning-400",
  Social: "text-error-400",
  "Listing Party": "text-primary-300",
};

const BG_GLOW_BY_CATEGORY: Record<string, string> = {
  Shows: "bg-[rgba(170,115,255,0.6)]", // Example for primary-400
  Party: "bg-[rgba(255,180,163,0.6)]", // warning-300
  Comedy: "bg-[rgba(255,152,122,0.6)]", // warning-400
  Social: "bg-[rgba(255,117,119,0.6)]", // error-400
  "Listing Party": "bg-[rgba(189,153,255,0.6)]", // primary-300
};

const BORDER_BY_CATEGORY: Record<string, string> = {
  Shows: "hover:border-primary-400",
  Party: "hover:border-warning-300",
  Comedy: "hover:border-warning-400",
  Social: "hover:border-error-400",
  "Listing Party": "hover:border-primary-300",
};

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
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */
export function EventCard({
  id,
  title,
  dateLabel,
  venue,
  img,
  category,
  className,
}: EventCardProps) {
  const dateColour = COLOR_BY_CATEGORY[category] ?? "text-warning-300";
  const ellipseBg =
    BG_GLOW_BY_CATEGORY[category] ?? "bg-[rgba(154,81,255,0.6)]";
  const borderHover =
    BORDER_BY_CATEGORY[category] ?? "hover:border-warning-300";

  return (
    <Link
      href={`/events/${id}`}
      /*  group/card lets this card know its own hover,
          group-hover/row dims siblings when any card is hovered */
      className={clsx(
        "group/card relative flex w-full flex-col gap-2 transition-opacity",
        "group-hover/row:opacity-60 hover:opacity-100",
        className
      )}
    >
      {/* <div className="bg-[#9a51ff99] w-full h-[63px] absolute left-1/2 top-0 -translate-x-1/2 blur-[25px] rounded-full"></div> */}
      {/* glow ellipse – visible only while *this* card is hovered */}
      <div
        className={clsx(
          `
          pointer-events-none
          absolute
          left-1/2 top-0
          w-[188px] h-[63px]
          -translate-x-1/2 translate-y-[7px]
          blur-2xl
          opacity-0
          transition-opacity duration-200
          group-hover/card:opacity-100
          rounded-full
        `,
          ellipseBg
        )}
      />

      <div
        className={clsx(
          "p-[4px] w-full h-full rounded-[10px] border border-transparent transition duration-300 group-hover:border-primary-500",
          borderHover
        )}
      >
        <div className="aspect-[171/214] sm:aspect-[79/95] relative w-full overflow-hidden rounded-lg ">
          <Image
            src={img}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 260px"
            className="object-cover object-center transition duration-300 group-hover:brightness-75"
          />
        </div>
      </div>
      {/* </div> */}

      {/* ── meta underneath ──────────────────────────────────────────── */}
      <div className="space-y-1 px-1 text-left">
        <h3 className="text-sm font-bold uppercase text-neutral-0">{title}</h3>
        <div className={clsx("flex items-center gap-1 text-xs", dateColour)}>
          <Calendar className="h-4 w-4" />
          {dateLabel}
        </div>
      </div>
    </Link>
  );
}
