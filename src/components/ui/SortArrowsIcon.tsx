/* ------------------------------------------------------------------ */
/*  src/components/ui/SortArrowsIcon.tsx                               */
/* ------------------------------------------------------------------ */
"use client";

import clsx from "clsx";

type Direction = "asc" | "desc" | null | undefined;

type Props = {
  /** If provided, highlights the active direction arrow */
  direction?: Direction;
  /** Tailwind classes for the wrapper */
  className?: string;
  /** Tailwind text color class (defaults to Figma #8C8CA8) */
  colorClassName?: string;
};

export default function SortArrowsIcon({
  direction,
  className,
  colorClassName = "text-[#8C8CA8]",
}: Props) {
  const upActive = direction === "asc";
  const downActive = direction === "desc";
  const hasActive = upActive || downActive;

  return (
    <span
      aria-hidden="true"
      className={clsx(
        "inline-flex flex-col items-center justify-center gap-[2px] leading-none",
        colorClassName,
        className
      )}
    >
      {/* Up */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="8"
        height="4"
        viewBox="0 0 8 4"
        fill="none"
        className={clsx(
          hasActive ? (upActive ? "opacity-100" : "opacity-35") : "opacity-55"
        )}
      >
        <path d="M4 0L0 4H8L4 0Z" fill="currentColor" />
      </svg>

      {/* Down */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="8"
        height="4"
        viewBox="0 0 8 4"
        fill="none"
        className={clsx(
          hasActive ? (downActive ? "opacity-100" : "opacity-35") : "opacity-55"
        )}
      >
        <path
          d="M4 4L8 -4.76837e-07L1.27146e-07 2.22545e-07L4 4Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}
