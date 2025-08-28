"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar } from "lucide-react";
import clsx from "classnames";

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
  clickable?: boolean;
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
  clickable = true,
}: EventCardProps) {
  const dateColour = "text-primary-951";
  const ellipseBg = "bg-[rgba(154,81,255,0.6)]";
  const borderHover = "hover:border-primary-951";

  return (
    <Link
      href={clickable ? `/events/${id}` : "#"}
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
