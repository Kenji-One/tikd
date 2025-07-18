"use client";

import { cloneElement, ReactElement } from "react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Convert #RRGGBB → rgba(r,g,b,a) */
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const [r, g, b] = [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface PillProps {
  text: string;
  /** SVG icon must use `stroke="currentColor"` / `fill="currentColor"` */
  icon?: ReactElement<any>;
  /** Foreground colour (#FFEA2D, rgb(), etc.).
   *  BG = this colour @ 16 % opacity. */
  color?: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function Pill({ icon, text, color, className }: PillProps) {
  /* foreground + background styles */
  const style = color
    ? {
        color, // text / icon
        backgroundColor: hexToRgba(color, 0.16),
      }
    : undefined;

  /* fallback classes if no colour given */
  const bgClass = color ? "" : "bg-white/16";
  const textClass = color ? "" : "text-white";

  /* make icon inherit currentColor + unified size */
  const renderedIcon =
    icon &&
    cloneElement(
      icon as ReactElement<any>,
      {
        className: clsx((icon.props as any)?.className, "w-4 h-4"),
      } as any
    );

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-[6px] rounded-full px-3 py-2",
        bgClass,
        textClass,
        className
      )}
      style={style}
    >
      {renderedIcon}
      {text}
    </span>
  );
}

export default Pill;
