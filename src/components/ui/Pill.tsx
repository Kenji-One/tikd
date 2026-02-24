"use client";

import { cloneElement, ReactElement, isValidElement } from "react";
import clsx from "classnames";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Convert #RRGGBB → rgba(r,g,b,a) */
function hexToRgba(hex: string, alpha: number): string {
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

/** Minimal props we need to read from an SVG icon
 *  (`className` is the only one we touch). */
interface IconProps {
  className?: string;
}

export interface PillProps {
  text: string;
  /** SVG icon must use `stroke="currentColor"` / `fill="currentColor"` */
  icon?: ReactElement<IconProps>;
  /** Foreground colour (#FFEA2D, rgb(), etc.).
   *  BG = this colour @ 16 % opacity. */
  color?: string;
  textColor?: string;
  className?: string;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function Pill({ icon, text, color, textColor, className }: PillProps) {
  /* --------- foreground / background logic --------- */
  // 1. text / icon colour: textColor > color > theme fallback
  const fg = textColor ?? color;

  // 2. background tint only when `color` is given
  const style =
    fg || color
      ? {
          ...(fg ? { color: fg } : {}),
          ...(color
            ? {
                backgroundColor: hexToRgba(color, 0.24), // stronger than 0.16
                border: `1px solid ${hexToRgba(color, 0.34)}`, // outline for readability
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.10), 0 10px 28px rgba(0,0,0,0.32)",
              }
            : {}),
        }
      : undefined;

  /* fallback classes if nothing specified */
  const bgClass = color ? "" : "bg-white/18";
  const textClass = fg ? "" : "text-white/95";

  /* make icon inherit currentColor + unified size */
  const renderedIcon =
    icon && isValidElement<IconProps>(icon)
      ? cloneElement<IconProps>(icon, {
          className: clsx(icon.props.className, "w-4 h-4"),
        })
      : null;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-[6px] rounded-full px-3 py-2",
        "text-sm font-semibold leading-none backdrop-blur-md border border-white/10",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_10px_28px_rgba(0,0,0,0.30)]",
        bgClass,
        textClass,
        className,
      )}
      style={style}
    >
      {renderedIcon}
      {text}
    </span>
  );
}

export default Pill;
