// src/components/ui/Button.tsx
"use client";

import { forwardRef, ReactNode } from "react";
import clsx from "classnames";
import { Slot } from "@radix-ui/react-slot";
import ElectricBorder from "../ElectricBorder";

type InnerVariants =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "brand"
  | "social"
  | "default"
  | "viewAction";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "brand"
    | "social"
    | "default"
    | "electric"
    | "viewAction";
  size?: "sm" | "md" | "lg" | "xs" | "icon";
  loading?: boolean;
  asChild?: boolean;
  /** optional leading icon (renders before children) */
  icon?: ReactNode;

  /**
   * Enables the "shine sweep" hover animation (per-variant).
   * When false/omitted, hover behavior stays exactly as it is now.
   */
  animation?: boolean;

  /** ElectricBorder options (only used when variant="electric") */
  electricColor?: string; // default: "#9a51ff"
  electricSpeed?: number; // default: 1
  electricChaos?: number; // default: 0.5
  electricThickness?: number; // default: 2
  electricRadius?: number; // default: pill (9999)
  /**
   * OPTIONAL: override inner look for electric (uses one of the existing variants).
   * If omitted, a unique dark/translucent "electric" styling is applied.
   */
  electricInner?: InnerVariants | undefined;
}

/* ─────────── style maps ─────────── */

const base =
  "inline-flex items-center justify-center gap-1 text-sm leading-[90%] font-medium tracking-[-0.28px] rounded-full " +
  "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<
  Exclude<NonNullable<ButtonProps["variant"]>, "electric">,
  string
> = {
  primary: "bg-primary-500 text-white hover:bg-primary-600",
  secondary:
    "border border-white/10 text-white bg-transparent hover:bg-white/5 hover:border-primary-500",
  ghost:
    "bg-[#ffffff12] backdrop-blur-[15px] text-white hover:bg-[#ffffffc] border border-transparent hover:border-primary-500",
  destructive: "bg-error-600 text-white hover:bg-error-700",
  brand: "bg-primary-500 text-white hover:bg-primary-700",
  social:
    "bg-neutral-800 text-white border border-white/10 hover:border-primary-500 hover:bg-neutral-700/40",
  default: "bg-button-primary text-white ",

  /**
   * Used for all "View All" / "Detailed View" actions
   * - hover: scale + slight rotate
   * - active: scale down + rotate back + border pulse animation
   */
  viewAction:
    "pointer-events-auto rounded-full border border-neutral-500 bg-neutral-700 px-3 py-2 text-xs font-medium text-white " +
    "transition-[transform,background-color,color,border-color] duration-300 " +
    "hover:cursor-pointer hover:scale-[1.05] hover:rotate-[3deg] hover:border-white " +
    "active:scale-[0.90] active:rotate-[-3deg] active:bg-black active:text-primary-500 active:border-primary-600 " +
    "active:animate-[tikdBorderMove_500ms_forwards]",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "py-2.5 px-3.5",
  md: "py-3 px-4",
  lg: "py-4 px-8",
  xs: "py-[13px] px-4",
  icon: "p-2 w-9 h-9",
};

/** Unique inner styling for variant="electric" (dark pill + glow-ready) */
const electricDefaultInner =
  "text-neutral-0 bg-neutral-900/60 hover:bg-neutral-900/80 " +
  "backdrop-blur-md ring-1 ring-white/10 " +
  "shadow-[inset_0_0_0_1px_rgba(154,81,255,0.25),0_0_18px_rgba(154,81,255,0.18)]";

/* ─────────── animation helpers ─────────── */

type NonElectricVariant = Exclude<
  NonNullable<ButtonProps["variant"]>,
  "electric"
>;

function sweepBase(duration: string) {
  return clsx(
    "relative overflow-hidden",
    "before:pointer-events-none before:absolute before:inset-0 before:content-['']",
    "before:-translate-x-[120%] before:transition-transform",
    duration,
    "hover:before:translate-x-[120%]",
  );
}

const variantSweep: Record<NonElectricVariant, string> = {
  primary: clsx(
    sweepBase("before:duration-700"),
    "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
  ),
  brand: clsx(
    sweepBase("before:duration-800"),
    "before:bg-gradient-to-r before:from-transparent before:via-white/24 before:to-transparent",
  ),
  destructive: clsx(
    sweepBase("before:duration-750"),
    "before:bg-gradient-to-r before:from-transparent before:via-error-200/22 before:to-transparent",
  ),
  secondary: clsx(
    sweepBase("before:duration-700"),
    "before:bg-gradient-to-r before:from-transparent before:via-white/22 before:to-transparent " +
      "before:opacity-0 before:transition-opacity hover:before:opacity-100 " +
      "before:blur-[0.5px]",
  ),
  ghost: clsx(
    sweepBase("before:duration-900"),
    "before:bg-gradient-to-r before:from-transparent before:via-primary-300/18 before:to-transparent",
  ),
  social: clsx(
    sweepBase("before:duration-850"),
    "before:bg-gradient-to-r before:from-transparent before:via-white/16 before:to-transparent",
  ),
  default: clsx(
    sweepBase("before:duration-850"),
    "before:bg-gradient-to-r before:from-transparent before:via-primary-500/16 before:to-transparent",
  ),

  // If you ever enable `animation` on viewAction, keep it subtle.
  viewAction: clsx(
    sweepBase("before:duration-850"),
    "before:bg-gradient-to-r before:from-transparent before:via-white/14 before:to-transparent",
  ),
};

function getSweepClasses(
  variant: NonNullable<ButtonProps["variant"]>,
  electricInner?: InnerVariants,
) {
  if (variant === "electric") {
    if (electricInner) return variantSweep[electricInner];
    return clsx(
      sweepBase("before:duration-900"),
      "before:bg-gradient-to-r before:from-transparent before:via-primary-952/22 before:to-transparent",
    );
  }

  return variantSweep[variant];
}

/* ─────────── component ─────────── */

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      children,
      asChild = false,
      icon,
      animation = false,
      /* electric-only props with defaults */
      electricColor = "#9a51ff",
      electricSpeed = 1,
      electricChaos = 0.5,
      electricThickness = 2,
      electricRadius,
      electricInner,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    const Spinner = (
      <svg
        className="-ml-1 h-4 w-4 animate-spin text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
    );

    const innerClasses =
      variant === "electric"
        ? electricInner
          ? variants[electricInner]
          : electricDefaultInner
        : variants[variant];

    const animateClasses = animation
      ? getSweepClasses(variant, electricInner)
      : "";

    const combined = clsx(
      base,
      innerClasses,
      sizes[size],
      animateClasses,
      className,
    );

    const buttonEl = (
      <Comp
        ref={ref}
        className={combined}
        data-variant={variant}
        data-animate={animation ? "true" : "false"}
        {...props}
      >
        <span className="inline-flex items-center gap-2">
          {loading && Spinner}
          {icon}
          {children}
        </span>
      </Comp>
    );

    if (variant !== "electric") return buttonEl;

    return (
      <ElectricBorder
        color={electricColor}
        speed={electricSpeed}
        chaos={electricChaos}
        thickness={electricThickness}
        style={{ borderRadius: electricRadius ?? 9999 }}
      >
        {buttonEl}
      </ElectricBorder>
    );
  },
);

Button.displayName = "Button";
